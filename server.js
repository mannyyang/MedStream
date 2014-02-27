'use strict';

var express = require('express'),
	path = require('path'),
	fs = require('fs'),
	mongoose = require('mongoose');

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

// start up sentiment child process
var sentiment = require('./lib/sentiment');

// Express settings
require('./lib/config/express')(app);

// Background Services (sentiment analysis and social media data input)
require('./lib/background-services')(config, sentiment);

// Routing
require('./lib/routes')(app, io, config);

// Start server
server.listen(config.port, function () {
  console.log('Express server listening on port %d in %s mode', config.port, app.get('env'));
});

// Expose app
exports = module.exports = app;