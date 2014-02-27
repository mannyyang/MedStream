'use strict';

var express = require('express'),
    path = require('path'),
    fs = require('fs'),
    mongoose = require('mongoose');
var terminal = require('child_process').spawn;
/**
 * Main application file
 */

// Set default node environment to development
process.env.NODE_ENV = process.env.NODE_ENV || 'development';

// Application Config
var config = require('./lib/config/config');

// Connect to database
var db = mongoose.connect(config.mongo.uri, config.mongo.options);

// Bootstrap models
var modelsPath = path.join(__dirname, 'lib/models');
fs.readdirSync(modelsPath).forEach(function (file) {
  if (/(.*)\.(js$|coffee$)/.test(file)) {
    require(modelsPath + '/' + file);
  }
});

// Populate empty DB with sample data
require('./lib/config/dummydata');
  
// Passport Configuration
var passport = require('./lib/config/passport');

var app = express();

var server = require('http').createServer(app);

// Socket.io
var io = require('socket.io').listen(server);

// Express settings
require('./lib/config/express')(app);

// Routing
require('./lib/routes')(app, io, config);


// var options = {
//   annotators: ['tokenize', 'ssplit', 'pos', 'lemma', 'ner', 'parse', 'dcoref']
// };

// var stanfordSimpleNLP = new StanfordSimpleNLP(options, function(err) {
//   stanfordSimpleNLP.process('This is so good.', function(err, result) {
//     if
//     	(err) console.log(err)
// 	else
// 		console.log(result);
//   });
// });

// Start server
server.listen(config.port, function () {
  console.log('Express server listening on port %d in %s mode', config.port, app.get('env'));
});

// Expose app
exports = module.exports = app;