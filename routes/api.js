'use strict';
const {v4: uuidv4} = require('uuid');
const { connectToMongoDB } = require('./db');

let db;

connectToMongoDB()
  .then(client => {
    db = client.db('messageboard'); // Datenbankname
    console.log('Datenbank bereit für API-Routen!');
  })
  .catch(err => console.error('Datenbankverbindung fehlgeschlagen:', err));

module.exports = function (app) {

  app.route('/api/threads/:board')
    .post(async function (req, res) {
      // const board = req.params.board; // Board aus der URL
      const { text, board , delete_password } = req.body; // Text und Passwort aus dem Body
      const created_on = new Date().toISOString(); // Erstellungszeit
      const bumped_on = created_on; // Bumped-on beginnt gleich wie created_on
      const _id = uuidv4(); // Eindeutige ID erstellen
      const reported = false; // Standardwert für reported
      const replies = []; // Standardwert für Replies

      // Antwortobjekt
      const newThread = {
        _id,
        
        text,
        created_on,
        bumped_on,
        reported,
        delete_password,
        replies
      };

      // Ausgabe in der Konsole (zum Debuggen)
      console.log("Neuer Thread erstellt:", newThread);

      try {
        // In die Datenbank einfügen
        const result = await db.collection('threads').insertOne(newThread);
        console.log('Thread erfolgreich in die Datenbank eingefügt:', result.insertedId);
        res.redirect(`/b/${board}/`);
      } catch (err) {
        console.error('Fehler beim Einfügen des Threads in die Datenbank:', err);
        res.status(500).json({ error: 'Fehler beim Speichern des Threads' });
      }
    })
    .get(async function (req, res) {
      const { board } = req.params;

      try {
        // Threads für ein bestimmtes Board aus der Datenbank abrufen
        const threads = await db.collection('threads')
          .find({ board })
          .sort({ bumped_on: -1 }) // Nach zuletzt aktualisiert sortieren
          .limit(10) // Nur die letzten 10 Threads
          .toArray();

        res.json(threads);
      } catch (err) {
        console.error('Fehler beim Abrufen der Threads:', err);
        res.status(500).json({ error: 'Fehler beim Abrufen der Threads' });
      }
    });

    
  app.route('/api/replies/:board');

};
