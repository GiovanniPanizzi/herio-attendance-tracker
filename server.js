const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const os = require('os');

const PORT = 3000;
const DB_PATH = path.join(__dirname, 'presenze.db');
const TOKEN_LIFETIME = 15000; // 15 secondi

// --- ELIMINA DB VECCHIO SE PRESENTE ---
if (fs.existsSync(DB_PATH)) {
  fs.unlinkSync(DB_PATH);
  console.log("DB esistente eliminato.");
}

// --- DATABASE ---
const db = new sqlite3.Database(DB_PATH, err => {
  if (err) {
    console.error("Errore apertura DB:", err);
    process.exit(1);
  }
});

// Creazione tabelle
db.serialize(() => {
  db.run(`CREATE TABLE presenze (
    matricola TEXT PRIMARY KEY,
    ip TEXT UNIQUE,
    timestamp INTEGER
  )`);

  db.run(`CREATE TABLE token (
    value TEXT PRIMARY KEY,
    expires INTEGER
  )`);
});

// --- TOKEN ---
function generateToken() {
  const token = crypto.randomBytes(3).toString('hex'); // 6 caratteri
  const expires = Date.now() + TOKEN_LIFETIME;

  db.run("INSERT OR REPLACE INTO token(value, expires) VALUES(?,?)", [token, expires], err => {
    if (err) console.error("Errore inserimento token:", err);
  });

  console.log("Nuovo token:", token);
  return token;
}

// Primo token e aggiornamento automatico
generateToken();
setInterval(generateToken, TOKEN_LIFETIME);

// --- SERVER ---
const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// --- API registrazione ---
app.post('/registra', (req, res) => {
  const { matricola, token } = req.body;
  if (!matricola || !token)
    return res.status(400).json({ status: "error", msg: "Campi mancanti" });

  const ip = (req.ip || req.connection.remoteAddress).replace(/^::ffff:/, '');

  // Controlla token valido
  db.get("SELECT * FROM token WHERE value=? AND expires>?", [token, Date.now()], (err, row) => {
    if (err) {
      console.error("Errore DB token:", err);
      return res.status(500).json({ status: "error", msg: "Errore server" });
    }

    if (!row)
      return res.status(403).json({ status: "error", msg: "Token non valido o scaduto" });

    // Controlla se IP già registrato
    db.get("SELECT * FROM presenze WHERE ip=?", [ip], (err, existing) => {
      if (err) {
        console.error("Errore DB presenze:", err);
        return res.status(500).json({ status: "error", msg: "Errore server" });
      }

      if (!existing) {
        db.run(
          "INSERT INTO presenze(matricola,ip,timestamp) VALUES(?,?,?)",
          [matricola, ip, Date.now()],
          err => {
            if (err) console.error("Errore inserimento presenza:", err);
            else console.log(`Registrata: ${matricola} (${ip})`);
          }
        );
      } else {
        console.log(`IP già registrato: ${ip}, matricola ${matricola} non salvata`);
      }

      // Feedback positivo sempre
      res.json({ status: "ok", msg: "Presenza registrata" });
    });
  });
});

// --- Endpoint debug ---
app.get('/presenze', (req, res) => {
  db.all("SELECT * FROM presenze", [], (err, rows) => {
    if (err) return res.status(500).json({ error: "Errore DB" });
    res.json(rows);
  });
});

// --- Endpoint token (solo da localhost) ---
app.get('/token', (req, res) => {
  if (!req.ip.startsWith('127.') && !req.ip.startsWith('::1')) {
    return res.status(403).send("Accesso negato");
  }

  db.get("SELECT * FROM token WHERE expires>?", [Date.now()], (err, row) => {
    if (err || !row) return res.status(404).send("Nessun token valido");
    res.send(row.value);
  });
});

function getLocalIP() {
  const nets = os.networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (net.family === 'IPv4' && !net.internal) {
        return net.address;
      }
    }
  }
  return 'localhost';
}

app.get('/server-ip', (req, res) => {
  res.send(getLocalIP());
});

// --- Trova IP locale ---
function getLocalIP() {
  const nets = os.networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (net.family === 'IPv4' && !net.internal) {
        return net.address;
      }
    }
  }
  return 'localhost';
}

// --- Avvio server ---
const localIP = getLocalIP();
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server in LAN su http://${localIP}:${PORT}`);
});


