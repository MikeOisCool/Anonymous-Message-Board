'use strict';
const { ObjectId } = require('mongodb');
// const {v4: uuidv4} = require('uuid');
const { connectToMongoDB } = require('./db');

let db;

async function verbindeDatenbank() {
  try {
    const client = await connectToMongoDB();
    db = client.db('messageboard');
    console.log('Datenbank bereit für API-Routen!');
  } catch (err) {
    console.error('Datenbankverbindung fehlgeschlagen:', err);
  }
}

verbindeDatenbank();

module.exports = function (app) {

  app.route('/api/threads/:board')
    .get(async function (req, res) {
      const { board } = req.params;
      try {
        // Threads für ein bestimmtes Board aus der Datenbank abrufen
        const threads = await db.collection('threads')
        
          .find({ board })
          .sort({ bumped_on: -1 }) // Nach zuletzt aktualisiert sortieren
          .project({

            'delete_password': 0, // Lösche delete_password
            'reported': 0,        // Entferne reported
            'replies.delete_password': 0, // Entferne delete_password aus Replies
            'replies.reported': 0         // Entferne reported aus Replies
          })
          .limit(10) // Nur die letzten 10 Threads
          
          .toArray();

        res.json(threads);
      } catch (err) {
        console.error('Fehler beim Abrufen der Threads:', err);
        res.status(500).json({ error: 'Fehler beim Abrufen der Threads' });
      }
    })
    .post(async function (req, res) {
      const { board } = req.params;  // Board aus der URL extrahieren
      const { text, delete_password } = req.body; // Text und Passwort aus dem Body
      const created_on = new Date().toISOString(); // Erstellungszeit
      const bumped_on = created_on; // Bumped-on beginnt gleich wie created_on
      // const _id = uuidv4(); // Eindeutige ID erstellen
      const reported = false; // Standardwert für reported
      const replies = []; // Standardwert für Replies

      // Antwortobjekt
      const newThread = {
        board,
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
        res.json(newThread);
      } catch (err) {
        console.error('Fehler beim Einfügen des Threads in die Datenbank:', err);
        res.status(500).json({ error: 'Fehler beim Speichern des Threads' });
      }
    })

    
    .put(async function (req, res) {
      console.log('PUT /api/threads/:board aufgerufen');
      console.log('Request Body:', req.body);
      const board = req.params.board; 
      const { thread_id } = req.body;
      if (!thread_id) {
        return res.status(400).send('Thread ID fehlt.');
      }

      try {
        const result = await db.collection('threads').updateOne(
          { _id: new ObjectId(thread_id), board: board },
          { $set: { reported: true } },
          { returnDocument: 'after' }
        );

        if (result.modifiedCount > 0) {
          res.send('reported');
        } else {
          res.status(404).send('Thread not found');
        }
      } catch (err) {
        console.error('Fehler beim Melden des Threads:', err);
        res.status(500).json({ error: 'Fehler beim Melden des Threads' });
      }
    })
    .delete(async function (req, res) {
      const { thread_id, delete_password } = req.body;

      try {
        const thread = await db.collection('threads').findOne({ _id: new ObjectId(thread_id) });

        if (thread && thread.delete_password === delete_password) {
          const result = await db.collection('threads').deleteOne({ _id: new ObjectId(thread_id) })

          if (result.deletedCount > 0) {
            res.send('success');
          } else {
            res.status(404).send('Thread not found');
          }
        } else {
          res.send('incorrect password')
        }
      } catch {
        console.error('Feher beim Löschen des Threads:', err);
        res.status(500).json({ error: 'Fehler beim Löschen des Threads' });
      }


    });


  app.route('/api/replies/:board')

    .get(async function (req, res) {
      const { board } = req.params;
      const { thread_id } = req.query;
      console.log(req.query)
      
      try {
        const thread = await db.collection('threads').findOne(
          { _id: new ObjectId(thread_id), board },
          {
            projection: {
              reported: 0, // Exclude thread's reported
              delete_password: 0, // Exclude thread's delete_password
              'replies.delete_password': 0,
              'replies.reported': 0
            }
          }
        );
        if (thread) {
          res.json(thread);
        } else {
          res.status(404).json({ error: 'Thread not found' })
        }
      } catch (err) {
        console.error('Fehler beim Abrufen des Threads:', err);
        res.status(500).json({ error: 'Fehler beim Abrufen des Threads' })
      }

    })
    .post(async function (req, res) {
      const { thread_id, text, delete_password } = req.body;
      const created_on = new Date().toISOString();

      const newReply = {
        _id: new ObjectId(),
        text,
        created_on,
        delete_password,
        reported: false
      }


      try {
        const result = await db.collection('threads').updateOne(
          { _id: new ObjectId(thread_id) },
          {
            $push: { replies: newReply },
            $set: { bumped_on: created_on }
          }
        );
        if (result.modifiedCount > 0) {
          res.json({ 
            message: 'Reply successfully added',
            reply_id: newReply._id.toString()
           });
        } else {
          res.status(404).json({ error: 'Thread not found' })
        }
      } catch (err) {
        console.error('Fehler beim Hinzufügen der Antwort:', err);
        res.status(500).json({ error: 'Fehler beim Hinzufügen der Antwort' });
      }
    })
    .delete(async function (req, res) {
      const { thread_id, reply_id, delete_password } = req.body;

      try {
        const thread = await db.collection('threads').findOne({ _id: new ObjectId(thread_id) });

        if (thread) {
          const reply = thread.replies.find(r => r._id.toString() === reply_id);

          if (reply && reply.delete_password === delete_password) {
            const result = await db.collection('threads').updateOne(
              { _id: new ObjectId(thread_id), 'replies._id': new ObjectId(reply_id) },
              { $set: { 'replies.$.text': '[deleted]' } }
            );

            res.send(result.modifiedCount > 0 ? 'success' : 'reply not found');
          } else {
            res.send('incorrect password');
          }
        } else {
          res.status(404).json({ error: 'Thread not found' });
        }
      } catch (err) {
        console.error('Fehler beim Löschen der Antwort:', err);
        res.status(500).json({ error: 'Fehler beim Löschen der Antwort' });
      }
    })
    .put(async function (req, res) {
      
      console.log('Request Body:11', req.body);
      const { thread_id, reply_id } = req.body;
      console.log('hier reply', reply_id, req.body)

      try {
        const thread = await db.collection('threads').findOne({ _id: new ObjectId(thread_id) });
        console.log('hier Thread',thread);
        if (!thread) {
          return res.status(404).send('Thread not found');
        }

        const reply = thread.replies.find(r => r._id.toString() === reply_id);
        console.log('hier reply',reply);
         if (!reply) {
      return res.status(404).send('Reply not found');
    }

        const result = await db.collection('threads').updateOne(
          { _id: new ObjectId(thread_id), 'replies._id': new ObjectId(reply_id) },
          { $set: { 'replies.$.reported': true } }
        );

        if (result.modifiedCount > 0) {
          res.send('reported');
        } else {
          res.status(404).send('Reply not found');
        }
      } catch (err) {
        console.error('Fehler beim Melden der Antwort:', err);
        res.status(500).json({ error: 'Fehler beim Melden der Antwort' });
      }
    });
}; 