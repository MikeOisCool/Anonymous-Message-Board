'use strict';
const { MongoClient } = require('mongodb');
const fs = require('fs');

const uri = process.env.MONGO_URI;
const sslCert = fs.readFileSync(process.env.CERT_PATH);

const client = new MongoClient(uri, {
  tls: true,
  tlsCertificateKeyFile: process.env.CERT_PATH, // Zertifikatspfad
});

async function connectToMongoDB() {
  try {
    await client.connect();
    console.log('Erfolgreich mit MongoDB verbunden!');
    return client;
  } catch (err) {
    console.error('Fehler beim Verbinden mit MongoDB:', err);
    throw err;
  }
}

module.exports = { connectToMongoDB };