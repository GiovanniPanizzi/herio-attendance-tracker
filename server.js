const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const crypto = require('crypto');
const os = require('os');

const app = express();
const PORT = 3000;
const DB_FOLDER = global.DB_FOLDER || __dirname;
const DB_PATH = path.join(DB_FOLDER, 'classes.db');

app.use(express.json());
app.use(express.static('public'));

app.use('/dashboard-app', express.static('localApp'));

function checkLocal(req, res, next) {
  const ip = req.ip || req.socket.remoteAddress;
  // IPv4 localhost: 127.0.0.1, IPv6 localhost: ::1
  if (ip === '127.0.0.1' || ip === '::1') {
      next();
  } else {
      res.status(403).json({ error: 'Accesso consentito solo in locale' });
  }
}

const db = new sqlite3.Database(DB_PATH, (err) => {
    if (err) return console.error("Errore apertura DB:", err.message);
    console.log("Database connesso.");
});

db.serialize(() => {
    // Abilita le foreign key in SQLite
    db.run("PRAGMA foreign_keys = ON");

    db.run(`
        CREATE TABLE IF NOT EXISTS classi (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nome TEXT NOT NULL
        )
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS studenti (
            matricola TEXT NOT NULL,
            nome TEXT NOT NULL,
            cognome TEXT NOT NULL,
            classe_id INTEGER NOT NULL,
            PRIMARY KEY (matricola, classe_id),
            FOREIGN KEY (classe_id) REFERENCES classi(id) ON DELETE CASCADE
        )
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS lezioni (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            classe_id INTEGER NOT NULL,
            data TEXT NOT NULL,
            FOREIGN KEY (classe_id) REFERENCES classi(id) ON DELETE CASCADE
        )
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS presenze (
          lezione_id INTEGER NOT NULL,
          matricola TEXT NOT NULL,
          classe_id INTEGER NOT NULL,
          presente INTEGER DEFAULT 0,
          PRIMARY KEY (lezione_id, matricola, classe_id),
          FOREIGN KEY (lezione_id) REFERENCES lezioni(id) ON DELETE CASCADE,
          FOREIGN KEY (matricola, classe_id) REFERENCES studenti(matricola, classe_id) ON DELETE CASCADE
      );
    `);
    db.run(`
      CREATE TABLE IF NOT EXISTS tokens (
          token TEXT PRIMARY KEY,
          lezione_id INTEGER NOT NULL UNIQUE,
          data_creazione TEXT NOT NULL,
          FOREIGN KEY (lezione_id) REFERENCES lezioni(id) ON DELETE CASCADE
      )
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS ip_address (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        lezione_id INTEGER NOT NULL,
        ip TEXT NOT NULL,
        UNIQUE(lezione_id, ip), -- evita IP duplicati per la stessa lezione
        FOREIGN KEY (lezione_id) REFERENCES lezioni(id) ON DELETE CASCADE
    )
  `);
});

/* --- GET API --- */
app.get('/classi', checkLocal, (req, res) => {
    db.all("SELECT * FROM classi", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.get('/classi/:id/studenti', checkLocal, (req, res) => {

    const classeId = req.params.id;
    db.all("SELECT * FROM studenti WHERE classe_id = ?", [classeId], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.get('/lezioni/:lezioneId/presenze', checkLocal, (req, res) => {

  const { lezioneId } = req.params;

  db.all(
    `SELECT s.matricola, s.nome, s.cognome, 
            COALESCE(p.presente, 0) as presente
     FROM studenti s
     JOIN lezioni l ON s.classe_id = l.classe_id
     LEFT JOIN presenze p 
       ON p.lezione_id = l.id AND p.matricola = s.matricola
     WHERE l.id = ?`,
    [lezioneId],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows);
    }
  );
});

app.get('/classi-con-numero-studenti', checkLocal, (req, res) => {

    const query = `
        SELECT c.id, c.nome, COUNT(s.matricola) AS studenti
        FROM classi c
        LEFT JOIN studenti s ON s.classe_id = c.id
        GROUP BY c.id, c.nome
    `;
    db.all(query, [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.get('/classi/:id/lezioni', checkLocal, (req, res) => {

    const classeId = req.params.id;
    db.all("SELECT * FROM lezioni WHERE classe_id = ? ORDER BY data ASC", [classeId], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

function getLocalIP() {
  const interfaces = os.networkInterfaces();
  for (let name in interfaces) {
      for (let iface of interfaces[name]) {
          if (iface.family === 'IPv4' && !iface.internal) {
              return iface.address;
          }
      }
  }
  return '127.0.0.1';
}

app.post('/lezioni/:lezioneId/token', checkLocal, (req, res) => {
  const { lezioneId } = req.params;
  const token = crypto.randomBytes(3).toString('hex').toUpperCase();
  const dataCreazione = new Date().toISOString();

  // 1. Controlla che la lezione esista
  db.get('SELECT id, classe_id FROM lezioni WHERE id = ?', [lezioneId], (err, lezione) => {
      if (err) return res.status(500).json({ error: err.message });
      if (!lezione) return res.status(404).json({ error: 'Lezione non trovata' });

      // 2. Prova a inserire il nuovo token (o a sostituire quello esistente)
      const query = `
          INSERT INTO tokens (token, lezione_id, data_creazione) 
          VALUES (?, ?, ?)
          ON CONFLICT(lezione_id) DO UPDATE SET token = excluded.token, data_creazione = excluded.data_creazione
      `;
      
      db.run(query, [token, lezioneId, dataCreazione], function(err) {
          if (err) return res.status(500).json({ error: err.message });

          const ip = getLocalIP();
          // Restituisce anche l'ID della classe per comodità nella UI
          res.json({ 
              token: token, 
              lezione_id: lezioneId,
              classe_id: lezione.classe_id,
              ip_server: ip 
          });
      });
  });
});

/* --- POST API --- */
app.post('/classi', checkLocal, (req, res) => {

    const { nome } = req.body;
    if (!nome || nome.trim() === '') {
        return res.status(400).json({ error: 'Il nome della classe è obbligatorio' });
    }

    const query = `INSERT INTO classi (nome) VALUES (?)`;
    db.run(query, [nome.trim()], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ id: this.lastID, nome });
    });
});

app.post('/classi/:id/studenti', checkLocal, (req, res) => {

    const classeId = req.params.id;
    const { matricola, nome, cognome } = req.body;

    if (!matricola || !nome || !cognome) {
        return res.status(400).json({ error: 'Matricola, nome e cognome sono obbligatori' });
    }

    const query = `INSERT INTO studenti (matricola, nome, cognome, classe_id) VALUES (?, ?, ?, ?)`;
    db.run(query, [matricola.trim(), nome.trim(), cognome.trim(), classeId], function(err) {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: err.message });
        }
        res.json({ matricola, nome, cognome, classe_id: classeId });
    });
});

app.post('/classi/:id/lezioni', checkLocal, (req, res) => {

    const classeId = req.params.id;
    const { data } = req.body;

    if (!data || data.trim() === '') {
        return res.status(400).json({ error: 'La data e ora della lezione sono obbligatorie' });
    }

    const query = `INSERT INTO lezioni (classe_id, data) VALUES (?, ?)`;
    db.run(query, [classeId, data.trim()], function(err) {
        if (err) return res.status(500).json({ error: err.message });

        const lezioneId = this.lastID;

        db.all(`SELECT matricola FROM studenti WHERE classe_id = ?`, [classeId], (err, studenti) => {
            if (err) return console.error(err);

            const stmt = db.prepare(`INSERT INTO presenze (lezione_id, matricola, classe_id, presente) VALUES (?, ?, ?, 0)`);
            studenti.forEach(s => stmt.run(lezioneId, s.matricola, classeId));

            stmt.finalize();

            res.json({ id: lezioneId, classe_id: classeId, data });
        });
    });
});

app.post('/lezioni/:lezioneId/sincronizza-presenze', checkLocal, (req, res) => {

  const { lezioneId } = req.params;

  db.get(`SELECT classe_id FROM lezioni WHERE id = ?`, [lezioneId], (err, lezione) => {
      if (err) return res.status(500).json({ error: err.message });
      if (!lezione) return res.status(404).json({ error: 'Lezione non trovata' });

      const classeId = lezione.classe_id;

      const query = `
          INSERT INTO presenze (lezione_id, matricola, classe_id, presente)
          SELECT ?, s.matricola, s.classe_id, 0
          FROM studenti s
          WHERE s.classe_id = ?
          AND NOT EXISTS (
              SELECT 1 FROM presenze p
              WHERE p.lezione_id = ? AND p.matricola = s.matricola AND p.classe_id = s.classe_id
          )
      `;

      db.run(query, [lezioneId, classeId, lezioneId], function (err) {
          if (err) return res.status(500).json({ error: err.message });
          res.json({ success: true });
      });
  });
});

app.post('/verifica-token', (req, res) => {
  const { token, lezioneId, matricola } = req.body; 
  const ipStudente = req.ip.replace('::ffff:', ''); 

  if (!token || !lezioneId || !matricola) {
      return res.status(400).json({ error: 'Token, ID Lezione e matricola sono obbligatori' });
  }

  const tokenQuery = `
      SELECT t.lezione_id, l.classe_id
      FROM tokens t
      JOIN lezioni l ON l.id = t.lezione_id
      WHERE t.token = ? AND t.lezione_id = ?`;

  db.get(tokenQuery, [token, lezioneId], (err, row) => {
      if (err) {
          console.error(err);
          return res.status(500).json({ error: 'Errore nel database' });
      }

      if (!row) {
          return res.status(404).json({ error: 'Token non valido o non corrispondente alla lezione' });
      }

      db.get(`SELECT * FROM ip_address WHERE lezione_id = ? AND ip = ?`, [lezioneId, ipStudente], (err, ipRow) => {
          if (err) return res.status(500).json({ error: 'Errore nel controllo IP' });

          if (ipRow) {
              // IP già usato
              return res.status(403).json({ error: 'Questo IP è già stato utilizzato per registrare una presenza' });
          }

          db.run(`INSERT INTO ip_address (lezione_id, ip) VALUES (?, ?)`, [lezioneId, ipStudente], function(err) {
              if (err) {
                  console.error(err);
                  return res.status(500).json({ error: 'Errore salvando l’IP' });
              }

              const update = `
                  UPDATE presenze
                  SET presente = 1
                  WHERE lezione_id = ? AND matricola = ? AND classe_id = ?`;

              db.run(update, [row.lezione_id, matricola, row.classe_id], function (err) {
                  if (err) {
                      console.error(err);
                      return res.status(500).json({ error: 'Errore aggiornando la presenza' });
                  }

                  if (this.changes === 0) {
                      return res.status(404).json({ error: 'Studente non trovato o non associato a questa lezione' });
                  }

                  res.json({ success: true, message: 'Presenza registrata con successo' });
              });
          });
      });
  });
});

/* --- DELETE API --- */
app.delete('/classi/:id', checkLocal, (req, res) => {

    const classeId = req.params.id;
    db.run(`DELETE FROM classi WHERE id = ?`, [classeId], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        if (this.changes === 0) return res.status(404).json({ error: 'Classe non trovata' });
        res.json({ success: true });
    });
});

app.delete('/studenti/:matricola/:classeId', checkLocal, (req, res) => {

    const { matricola, classeId } = req.params;
    db.run(`DELETE FROM studenti WHERE matricola = ? AND classe_id = ?`, [matricola, classeId], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        if (this.changes === 0) return res.status(404).json({ error: 'Studente non trovato' });
        res.json({ success: true });
    });
});

app.delete('/lezioni/:id', checkLocal, (req, res) => {

    const lezioneId = req.params.id;
    db.run(`DELETE FROM lezioni WHERE id = ?`, [lezioneId], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        if (this.changes === 0) return res.status(404).json({ error: 'Lezione non trovata' });
        res.json({ success: true });
    });
});

app.delete('/lezioni/:lezioneId/token', checkLocal, (req, res) => {
  const { lezioneId } = req.params;

  db.run(`DELETE FROM tokens WHERE lezione_id = ?`, [lezioneId], function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true, message: `Token per la lezione ${lezioneId} eliminato` });
  });
});

/* --- PATCH API --- */
app.patch('/presenze/:lezioneId/:matricola', checkLocal, (req, res) => {
  const { lezioneId, matricola } = req.params;
  const { presente } = req.body;

  const findClassQuery = `
      SELECT l.classe_id
      FROM lezioni l
      JOIN studenti s ON s.classe_id = l.classe_id
      WHERE l.id = ? AND s.matricola = ?`; // Filtra anche per matricola per sicurezza

  db.get(findClassQuery, [lezioneId, matricola], (err, row) => {
      if (err || !row) {
          return res.status(404).json({ error: 'Lezione o Studente non trovato/associato' });
      }
      
      const classeId = row.classe_id;

      // 2. Aggiorna la presenza usando l'ID della classe trovato
      const updateQuery = `
          UPDATE presenze
          SET presente = ?
          WHERE lezione_id = ? AND matricola = ? AND classe_id = ?`;

      db.run(updateQuery, [presente, lezioneId, matricola, classeId], function (err) {
          if (err) return res.status(500).json({ error: err.message });
          res.json({ success: true, changes: this.changes });
      });
  });
});

/* --- START SERVER --- */
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server in ascolto su http://localhost:${PORT} e in LAN su http://${getLocalIP()}:${PORT}`);
});