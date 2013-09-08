
/**
 * Module dependencies.
 */

var express = require('express');
var app = express();
var http = require('http');
var server = http.createServer(app);
var routes = require('./routes');
var user = require('./routes/user');
var path = require('path');
var util = require('util');
var Twitter = require('twitter');
var io = require('socket.io').listen(server);

server.listen(8080);

// all environments
app.set('views', __dirname + '/views');
app.set('view engine', 'jade');
app.use(express.favicon());
app.use(express.logger('dev'));
app.use(express.bodyParser());
app.use(express.methodOverride());
app.use(app.router);
app.use(express.static(path.join(__dirname, 'public')));

// development only
if ('development' == app.get('env')) {
  app.use(express.errorHandler());
}

//routing
app.get('/', function (req, res) {
	res.sendfile(__dirname + '/views/index.html');
});
app.get('/users', user.list);

//Twitter Credentials
 var T = new Twitter({
    consumer_key:         'Vx1Pgf8UlLKKQtzUdZz95g'
  , consumer_secret:      'hMgEz35wGedZOTTQINcijTF6pknyxypNsjHOlk5uAw'
  , access_token_key:     '1551825924-l9sX9eNlTdRnL7UcQHmjAm1oC5gB8TYmynBC2gh'
  , access_token_secret:  '9M7yweRLlDGeMcBPHNZTUQssBnlFapmtYzWV4jf2M'
})


//socket
io.sockets.on('connection', function (socket) {
  	console.log('Connected');
	T.search('uci AND health', function(data) {
	    io.sockets.emit('tweets', util.inspect(data));
	});
  	
});