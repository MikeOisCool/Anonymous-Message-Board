'use strict';
require('dotenv').config();
const express     = require('express');
const bodyParser  = require('body-parser');
const cors        = require('cors');
const helmet = require('helmet');
const apiRoutes         = require('./routes/api.js');
const fccTestingRoutes  = require('./routes/fcctesting.js');
const runner            = require('./test-runner');

const app = express();
// app.use(helmet.contentSecurityPolicy({
//   directives:{
//   defaultSrc: ["'self'"], // Erlaubt nur das Laden von Ressourcen aus der gleichen Quelle
//   frameAncestors: ["'self'"],  // Erlaubt nur iFrame-Einbindungen von der eigenen Domain
//   scriptSrc: ["'self'"],  // Erlaubt nur Skripte aus der gleichen Quelle
//   imgSrc: ["'self'", "https://cdn.freecodecamp.org"]
// }}));
app.use(helmet.frameguard({ action: 'sameorigin' })); // Only allow your site to be loaded in an iFrame on your own pages.
app.use(helmet.dnsPrefetchControl({ allow: false })); // Blockiert DNS Prefetching vollständig, um Ressourcenverschwendung und potenzielle Datenlecks zu vermeiden.
app.use(helmet.referrerPolicy({ policy: 'same-origin' })); // Der Referrer wird nur gesendet, wenn der Nutzer innerhalb der gleichen Domain navigiert.
// Alternativ könntest du auch no-referrer verwenden, falls du den Referrer-Header vollständig blockieren möchtest.

app.use('/public', express.static(process.cwd() + '/public'));

app.use(cors({origin: '*'})); //For FCC testing purposes only

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

//Sample front-end
app.route('/b/:board/')
  .get(function (req, res) {
    res.sendFile(process.cwd() + '/views/board.html');
  });
app.route('/b/:board/:threadid')
  .get(function (req, res) {
    res.sendFile(process.cwd() + '/views/thread.html');
  });

//Index page (static HTML)
app.route('/')
  .get(function (req, res) {
    res.sendFile(process.cwd() + '/views/index.html');
  });

//For FCC testing purposes
fccTestingRoutes(app);

//Routing for API 
apiRoutes(app);

//404 Not Found Middleware
app.use(function(req, res, next) {
  res.status(404)
    .type('text')
    .send('Not Found');
});

//Start our server and tests!
const listener = app.listen(process.env.PORT || 3000, function () {
  console.log('Your app is listening on port ' + listener.address().port);
  if(process.env.NODE_ENV==='test') {
    console.log('Running Tests...');
    setTimeout(function () {
      try {
        runner.run();
      } catch(e) {
        console.log('Tests are not valid:');
        console.error(e);
      }
    }, 1500);
  }
});

module.exports = app; //for testing
