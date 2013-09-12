/*** Global Variables ***/
var SERVER_PORT = 8080;
var DATABASE_NAME = 'meddb';
var COLLECTION_NAME = 'tweets';
var collectionExists = false;
/*** Module dependencies. ***/
var express = require('express');
var app = express();
var http = require('http');
var server = http.createServer(app);
var routes = require('./routes');
//var api = require('./routes/api');
var path = require('path');
var mongoose = require('mongoose');
var db = mongoose.connect('mongodb://localhost/' + DATABASE_NAME);
var Document = require('./models.js').Document(db);
var Twitter = require('twitter');
var io = require('socket.io').listen(server);

server.listen(SERVER_PORT);

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
// production only
if (app.get('env') === 'production') {
  // TODO
};

//routing
app.get('/', routes.index);

//MongoDB verification
mongoose.connection.on('open', function (ref) {
  console.log('Connected to mongo server.');
});
mongoose.connection.on('error', function (err){
  console.log('Could not connect to mongo server!');
  console.log(err);
});

//Twitter Credentials
 var T = new Twitter({
    consumer_key:         'Vx1Pgf8UlLKKQtzUdZz95g'
  , consumer_secret:      'hMgEz35wGedZOTTQINcijTF6pknyxypNsjHOlk5uAw'
  , access_token_key:     '1551825924-l9sX9eNlTdRnL7UcQHmjAm1oC5gB8TYmynBC2gh'
  , access_token_secret:  '9M7yweRLlDGeMcBPHNZTUQssBnlFapmtYzWV4jf2M'
})

// Inserting past tweets into database (When app first starts up)
console.log('CRAWLING');
if (!collectionExists){
  console.log('crawling/parsing');
  T.search('uci AND health', function(data) {

  for (var i = 0; i < data.statuses.length; i++){
        var tweets = data.statuses[i];
        var tweet = new Document({
            id: tweets.id,
            created_at: tweets.created_at,
            user: [{
              id: tweets.user.id,
              name: tweets.user.name,
              screen_name: tweets.user.screen_name,
              location: tweets.user.location
            }],
            text: tweets.text});
      }
      tweet.save(function(err){ if (err) return err; });
  });   
}

//sockets
io.sockets.on('connection', function (socket) {
  console.log('Socket started on connection');
  //Find all tweets.
  Document.find(function(err, tweets) {
    if (err) return console.error(err);
    io.sockets.emit('tweets', tweets);
  });    
});



