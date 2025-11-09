const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const app = express();
const PORT = 3000;
const DB_PATH = path.join(__dirname, 'classes.db');

app.use(express.json());
app.use(express.static('public'));

const db = new sqlite3.Database(DB_PATH, (err) => {
    if (err) return console.error("Errore apertura DB:", err.message);
    console.log("Database connesso.");
});

db.serialize(() => {
    db.run(`
        CREATE TABLE IF NOT EXISTS classi (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nome TEXT NOT NULL
        )
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS studenti (
            matricola TEXT PRIMARY KEY,
            nome TEXT NOT NULL,
            cognome TEXT NOT NULL,
            classe_id INTEGER NOT NULL,
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
            presente INTEGER DEFAULT 0,
            PRIMARY KEY (lezione_id, matricola),
            FOREIGN KEY (lezione_id) REFERENCES lezioni(id) ON DELETE CASCADE,
            FOREIGN KEY (matricola) REFERENCES studenti(matricola) ON DELETE CASCADE
        )
    `);
});

/* GET API */
app.get('/classi', (req, res) => {
    db.all("SELECT * FROM classi", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.get('/classi/:id/studenti', (req, res) => {
    const classeId = req.params.id;
    db.all("SELECT * FROM studenti WHERE classe_id = ?", [classeId], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.get('/lezioni/:id/presenze', (req, res) => {
    const lezioneId = req.params.id;
    db.all(
        `SELECT p.*, s.nome, s.cognome FROM presenze p
         JOIN studenti s ON p.matricola = s.matricola
         WHERE lezione_id = ?`,
        [lezioneId],
        (err, rows) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json(rows);
        }
    );
});

app.get('/classi-con-numero-studenti', (req, res) => {
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

app.get('/classi/:id/lezioni', (req, res) => {
  const classeId = req.params.id;
  db.all("SELECT * FROM lezioni WHERE classe_id = ? ORDER BY data ASC", [classeId], (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows);
  });
});

/* POST API */
app.post('/classi', (req, res) => {
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

app.post('/classi/:id/studenti', (req, res) => {
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

app.post('/classi/:id/lezioni', (req, res) => {
  const classeId = req.params.id;
  const { data } = req.body;

  if (!data || data.trim() === '') {
      return res.status(400).json({ error: 'La data e ora della lezione sono obbligatorie' });
  }

  const query = `INSERT INTO lezioni (classe_id, data) VALUES (?, ?)`;
  db.run(query, [classeId, data.trim()], function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ id: this.lastID, classe_id: classeId, data });
  });
});

/* DELETE API */
app.delete('/classi/:id', (req, res) => {
  const classeId = req.params.id;
  db.run(`DELETE FROM classi WHERE id = ?`, [classeId], function(err) {
      if (err) return res.status(500).json({ error: err.message });
      if (this.changes === 0) return res.status(404).json({ error: 'Classe non trovata' });
      res.json({ success: true });
  });
});

app.delete('/studenti/:matricola', (req, res) => {
  const matricola = req.params.matricola;
  db.run(`DELETE FROM studenti WHERE matricola = ?`, [matricola], function(err) {
      if (err) return res.status(500).json({ error: err.message });
      if (this.changes === 0) return res.status(404).json({ error: 'Studente non trovato' });
      res.json({ success: true });
  });
});

app.delete('/lezioni/:id', (req, res) => {
  const lezioneId = req.params.id;
  db.run(`DELETE FROM lezioni WHERE id = ?`, [lezioneId], function(err) {
      if (err) return res.status(500).json({ error: err.message });
      if (this.changes === 0) return res.status(404).json({ error: 'Lezione non trovata' });
      res.json({ success: true });
  });
});

/* START SERVER */
app.listen(PORT, () => {
    console.log(`Server in ascolto su http://localhost:${PORT}`);
});
