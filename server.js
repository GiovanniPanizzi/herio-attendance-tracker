const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const crypto = require('crypto');
const os = require('os');

const app = express();
const PORT = 3000;
// Global variable setup (used by Electron)
const DB_FOLDER = global.DB_FOLDER || __dirname;
const DB_PATH = path.join(DB_FOLDER, 'classes.db');

// Determine if the app is packaged (Electron environment)
const isPackaged = require('electron').app ? require('electron').app.isPackaged : false;

// Define the path for static files (the admin/dashboard UI)
const localAppPath = isPackaged
  ? path.join(process.resourcesPath, 'localApp')
  : path.join(__dirname, 'localApp');

// --- Middleware Setup ---
app.use(express.json());
// Serve static assets from the 'public' folder (e.g., the student QR code scanner page)
app.use(express.static(path.join(__dirname, 'public')));
// Serve the main application UI (dashboard)
app.use('/dashboard-app', express.static(localAppPath));

/**
 * Middleware to restrict access to local machine/server only.
 * Used for admin/dashboard endpoints.
 */
function checkLocal(req, res, next) {
    // Note: On Express, req.ip is more reliable than req.socket.remoteAddress
    const ip = req.ip || req.socket.remoteAddress;
    // Check for standard localhost addresses
    if (ip === '127.0.0.1' || ip === '::1' || ip === '::ffff:127.0.0.1') {
        next();
    } else {
        res.status(403).json({ error: 'Access granted only on the local machine' });
    }
}

// --- Database Connection ---
const db = new sqlite3.Database(DB_PATH, (err) => {
    if (err) return console.error("Error opening DB:", err.message);
    console.log("Database connected.");
});

// --- Database Schema Setup ---
db.serialize(() => {
    // Enable foreign key constraints for data integrity
    db.run("PRAGMA foreign_keys = ON");

    // 1. CLASSES Table
    db.run(`
        CREATE TABLE IF NOT EXISTS classes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL
        )
    `);

    // 2. STUDENTS Table (Composite Primary Key: student_id + class_id)
    db.run(`
        CREATE TABLE IF NOT EXISTS students (
            student_id TEXT NOT NULL,
            first_name TEXT NOT NULL,
            last_name TEXT NOT NULL,
            class_id INTEGER NOT NULL,
            PRIMARY KEY (student_id, class_id),
            FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE
        )
    `);

    // 3. LESSONS Table
    db.run(`
        CREATE TABLE IF NOT EXISTS lessons (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            class_id INTEGER NOT NULL,
            date TEXT NOT NULL,
            FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE
        )
    `);

    // 4. ATTENDANCE Table (Tracking who was present for which lesson)
    db.run(`
        CREATE TABLE IF NOT EXISTS attendance (
          lesson_id INTEGER NOT NULL,
          student_id TEXT NOT NULL,
          class_id INTEGER NOT NULL,
          is_present INTEGER DEFAULT 0,
          PRIMARY KEY (lesson_id, student_id, class_id),
          FOREIGN KEY (lesson_id) REFERENCES lessons(id) ON DELETE CASCADE,
          FOREIGN KEY (student_id, class_id) REFERENCES students(student_id, class_id) ON DELETE CASCADE
      );
    `);

    // 5. TOKENS Table (Stores the QR code token for active lessons)
    db.run(`
      CREATE TABLE IF NOT EXISTS tokens (
          token TEXT PRIMARY KEY,
          lesson_id INTEGER NOT NULL UNIQUE,
          created_at TEXT NOT NULL,
          FOREIGN KEY (lesson_id) REFERENCES lessons(id) ON DELETE CASCADE
      )
  `);

    // 6. IP_ADDRESSES Table (Logs student IP to prevent duplicate registrations)
    db.run(`
    CREATE TABLE IF NOT EXISTS ip_addresses (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        lesson_id INTEGER NOT NULL,
        ip_address TEXT NOT NULL,
        UNIQUE(lesson_id, ip_address),
        FOREIGN KEY (lesson_id) REFERENCES lessons(id) ON DELETE CASCADE
    )
  `);
});

// --- Utility: Get Local LAN IP Address ---
function getLocalIP() {
    const interfaces = os.networkInterfaces();
    const candidates = [];

    for (let name in interfaces) {
        for (let iface of interfaces[name]) {
            if (iface.family === 'IPv4' && !iface.internal) {
                // Avoid self-assigned IPs (APIPA)
                if (!iface.address.startsWith('169.254.')) {
                    candidates.push(iface.address);
                }
            }
        }
    }

    // Prioritize standard LAN addresses
    const lanIP = candidates.find(ip => ip.startsWith('192.168.') || ip.startsWith('10.'));
    if (lanIP) {
        return lanIP;
    }

    if (candidates.length > 0) {
        return candidates[0];
    }
  
    return '127.0.0.1'; 
}

/* ----------------------------------- */
/* --- GET API ---            */
/* ----------------------------------- */

// Get all classes
app.get('/classes', checkLocal, (req, res) => {
    db.all("SELECT * FROM classes", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// Get students for a specific class
app.get('/classes/:id/students', checkLocal, (req, res) => {
    const classId = req.params.id;
    db.all("SELECT * FROM students WHERE class_id = ?", [classId], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// Get attendance status for all students in a specific lesson
app.get('/lessons/:lessonId/attendance', checkLocal, (req, res) => {
  const { lessonId } = req.params;

  db.all(
    `SELECT s.student_id, s.first_name, s.last_name, 
            COALESCE(p.is_present, 0) as is_present
     FROM students s
     JOIN lessons l ON s.class_id = l.class_id
     LEFT JOIN attendance p 
       ON p.lesson_id = l.id AND p.student_id = s.student_id
     WHERE l.id = ?`,
    [lessonId],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows);
    }
  );
});

// Get all classes with a count of students in each
app.get('/classes-with-student-count', checkLocal, (req, res) => {
    const query = `
        SELECT c.id, c.name, COUNT(s.student_id) AS student_count
        FROM classes c
        LEFT JOIN students s ON s.class_id = c.id
        GROUP BY c.id, c.name
    `;
    db.all(query, [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// Get all lessons for a specific class
app.get('/classes/:id/lessons', checkLocal, (req, res) => {
    const classId = req.params.id;
    db.all("SELECT * FROM lessons WHERE class_id = ? ORDER BY date ASC", [classId], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// API to generate/regenerate a QR code token for a lesson
app.post('/lessons/:lessonId/token', checkLocal, (req, res) => {
  const { lessonId } = req.params;
  // Generate a short, random hex token (6 chars)
  const token = crypto.randomBytes(3).toString('hex').toUpperCase();
  const createdAt = new Date().toISOString();

  db.get('SELECT id, class_id FROM lessons WHERE id = ?', [lessonId], (err, lesson) => {
      if (err) return res.status(500).json({ error: err.message });
      if (!lesson) return res.status(404).json({ error: 'Lesson not found' });

      // Insert or REPLACE the existing token for this lesson (ON CONFLICT)
      const query = `
          INSERT INTO tokens (token, lesson_id, created_at) 
          VALUES (?, ?, ?)
          ON CONFLICT(lesson_id) DO UPDATE SET token = excluded.token, created_at = excluded.created_at
      `;
      
      db.run(query, [token, lessonId, createdAt], function(err) {
          if (err) return res.status(500).json({ error: err.message });

          const ip = getLocalIP();
          // Returns data needed to construct the QR code URL (token, lessonId) and server IP
          res.json({ 
              token: token, 
              lesson_id: lessonId,
              class_id: lesson.class_id,
              server_ip: ip 
          });
      });
  });
});

// Get student list with total attendance count for a class
app.get('/classes/:classId/students-with-attendance', checkLocal, async (req, res) => {
    const classId = req.params.classId;

    const sql = `
        SELECT
            s.student_id, 
            s.first_name, 
            s.last_name,
            -- Subquery to count only the 'present' records (is_present = 1)
            (SELECT COUNT(p.is_present) 
             FROM attendance p
             WHERE p.student_id = s.student_id 
             AND p.class_id = s.class_id 
             AND p.is_present = 1) AS attendance_count
        FROM students s
        WHERE s.class_id = ?
        ORDER BY s.last_name, s.first_name;
    `;
    
    db.all(sql, [classId], (err, rows) => { 
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

/* ----------------------------------- */
/* --- POST API ---           */
/* ----------------------------------- */

// Create a new class
app.post('/classes', checkLocal, (req, res) => {
    const { name } = req.body;
    if (!name || name.trim() === '') {
        return res.status(400).json({ error: 'Class name is required' });
    }

    const query = `INSERT INTO classes (name) VALUES (?)`;
    db.run(query, [name.trim()], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ id: this.lastID, name });
    });
});

// Add a student to a class
app.post('/classes/:id/students', checkLocal, (req, res) => {
    const classId = req.params.id;
    const { student_id, first_name, last_name } = req.body;

    if (!student_id || !first_name || !last_name) {
        return res.status(400).json({ error: 'Student ID, first name, and last name are required' });
    }

    const query = `INSERT INTO students (student_id, first_name, last_name, class_id) VALUES (?, ?, ?, ?)`;
    db.run(query, [student_id.trim(), first_name.trim(), last_name.trim(), classId], function(err) {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: err.message });
        }
        res.json({ student_id, first_name, last_name, class_id: classId });
    });
});

// Create a new lesson and pre-fill attendance records for all students
app.post('/classes/:id/lessons', checkLocal, (req, res) => {
    const classId = req.params.id;
    const { date } = req.body;

    if (!date || date.trim() === '') {
        return res.status(400).json({ error: 'Lesson date and time are required' });
    }

    const query = `INSERT INTO lessons (class_id, date) VALUES (?, ?)`;
    db.run(query, [classId, date.trim()], function(err) {
        if (err) return res.status(500).json({ error: err.message });

        const lessonId = this.lastID;

        // Automatically create a 'NOT PRESENT' (0) attendance record for every student in the class
        db.all(`SELECT student_id FROM students WHERE class_id = ?`, [classId], (err, students) => {
            if (err) return console.error(err);

            const stmt = db.prepare(`INSERT INTO attendance (lesson_id, student_id, class_id, is_present) VALUES (?, ?, ?, 0)`);
            students.forEach(s => stmt.run(lessonId, s.student_id, classId));

            stmt.finalize();

            res.json({ id: lessonId, class_id: classId, date });
        });
    });
});

// Endpoint to synchronize attendance (add new students who might have been added after lesson creation)
app.post('/lessons/:lessonId/synchronize-attendance', checkLocal, (req, res) => {
  const { lessonId } = req.params;

  db.get(`SELECT class_id FROM lessons WHERE id = ?`, [lessonId], (err, lesson) => {
      if (err) return res.status(500).json({ error: err.message });
      if (!lesson) return res.status(404).json({ error: 'Lesson not found' });

      const classId = lesson.class_id;

      const query = `
          INSERT INTO attendance (lesson_id, student_id, class_id, is_present)
          SELECT ?, s.student_id, s.class_id, 0
          FROM students s
          WHERE s.class_id = ?
          AND NOT EXISTS (
              SELECT 1 FROM attendance p
              WHERE p.lesson_id = ? AND p.student_id = s.student_id AND p.class_id = s.class_id
          )
      `;

      db.run(query, [lessonId, classId, lessonId], function (err) {
          if (err) return res.status(500).json({ error: err.message });
          res.json({ success: true, message: `${this.changes} missing attendance records added.` });
      });
  });
});

// The core attendance registration endpoint (Accessed by students via LAN/QR code scan)
app.post('/verify-token', (req, res) => {
  const { token, lessonId, student_id } = req.body; 
  // Get student's external IP address and clean up IPv6 mapping
  const studentIp = req.ip.replace('::ffff:', ''); 

  if (!token || !lessonId || !student_id) {
      return res.status(400).json({ error: 'Token, Lesson ID, and Student ID are required' });
  }

  // 1. Verify token validity and get class_id
  const tokenQuery = `
      SELECT t.lesson_id, l.class_id
      FROM tokens t
      JOIN lessons l ON l.id = t.lesson_id
      WHERE t.token = ? AND t.lesson_id = ?`;

  db.get(tokenQuery, [token, lessonId], (err, row) => {
      if (err) {
          console.error(err);
          return res.status(500).json({ error: 'Database error' });
      }

      if (!row) {
          return res.status(404).json({ error: 'Invalid token or token does not match lesson' });
      }

      // 2. Check if the IP has already been used for THIS lesson
      db.get(`SELECT * FROM ip_addresses WHERE lesson_id = ? AND ip_address = ?`, [lessonId, studentIp], (err, ipRow) => {
          if (err) return res.status(500).json({ error: 'IP check error' });

          if (ipRow) {
              // IP already used (prevents one device registering multiple students)
              return res.status(403).json({ error: 'This IP address has already been used to register attendance' });
          }

          // 3. Log the new IP address
          db.run(`INSERT INTO ip_addresses (lesson_id, ip_address) VALUES (?, ?)`, [lessonId, studentIp], function(err) {
              if (err) {
                  console.error(err);
                  return res.status(500).json({ error: 'Error saving IP address' });
              }

              // 4. Update the attendance record
              const update = `
                  UPDATE attendance
                  SET is_present = 1
                  WHERE lesson_id = ? AND student_id = ? AND class_id = ?`;

              db.run(update, [row.lesson_id, student_id, row.class_id], function (err) {
                  if (err) {
                      console.error(err);
                      return res.status(500).json({ error: 'Error updating attendance record' });
                  }

                  if (this.changes === 0) {
                      return res.status(404).json({ error: 'Student not found or not associated with this lesson' });
                  }

                  res.json({ success: true, message: 'Attendance successfully registered' });
              });
          });
      });
  });
});

/* ----------------------------------- */
/* --- DELETE API ---          */
/* ----------------------------------- */

// Delete a class (ON DELETE CASCADE handles students/lessons/attendance)
app.delete('/classes/:id', checkLocal, (req, res) => {
    const classId = req.params.id;
    db.run(`DELETE FROM classes WHERE id = ?`, [classId], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        if (this.changes === 0) return res.status(404).json({ error: 'Class not found' });
        res.json({ success: true });
    });
});

// Delete a student from a specific class
app.delete('/students/:studentId/:classId', checkLocal, (req, res) => {
    const { studentId, classId } = req.params;
    db.run(`DELETE FROM students WHERE student_id = ? AND class_id = ?`, [studentId, classId], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        if (this.changes === 0) return res.status(404).json({ error: 'Student not found' });
        res.json({ success: true });
    });
});

// Delete a lesson (ON DELETE CASCADE handles attendance/tokens/IP logs)
app.delete('/lessons/:id', checkLocal, (req, res) => {
    const lessonId = req.params.id;
    db.run(`DELETE FROM lessons WHERE id = ?`, [lessonId], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        if (this.changes === 0) return res.status(404).json({ error: 'Lesson not found' });
        res.json({ success: true });
    });
});

// Manually delete a token (e.g., to force a new QR generation)
app.delete('/lessons/:lessonId/token', checkLocal, (req, res) => {
  const { lessonId } = req.params;

  db.run(`DELETE FROM tokens WHERE lesson_id = ?`, [lessonId], function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true, message: `Token for lesson ${lessonId} deleted` });
  });
});

/* ----------------------------------- */
/* --- PATCH API ---           */
/* ----------------------------------- */

// Manually toggle attendance status (e.g., from the dashboard UI)
app.patch('/attendance/:lessonId/:studentId', checkLocal, (req, res) => {
  const { lessonId, studentId } = req.params;
  const { is_present } = req.body; // Expects 0 or 1

  // 1. Find the class_id associated with the lesson and student for the composite key
  const findClassQuery = `
      SELECT l.class_id
      FROM lessons l
      JOIN students s ON s.class_id = l.class_id
      WHERE l.id = ? AND s.student_id = ?`; 

  db.get(findClassQuery, [lessonId, studentId], (err, row) => {
      if (err || !row) {
          return res.status(404).json({ error: 'Lesson or Student not found/associated' });
      }
      
      const classId = row.class_id;

      // 2. Update the attendance status
      const updateQuery = `
          UPDATE attendance
          SET is_present = ?
          WHERE lesson_id = ? AND student_id = ? AND class_id = ?`;

      db.run(updateQuery, [is_present, lessonId, studentId, classId], function (err) {
          if (err) return res.status(500).json({ error: err.message });
          res.json({ success: true, changes: this.changes });
      });
  });
});

/* ----------------------------------- */
/* --- START SERVER ---        */
/* ----------------------------------- */
app.listen(PORT, '0.0.0.0', () => {
  const ip = getLocalIP();
  console.log(`Server listening on http://localhost:${PORT} and on LAN at http://${ip}:${PORT}`);
});