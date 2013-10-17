/*** Global Variables ***/
var SERVER_PORT = 8080;
var DATABASE_NAME = 'meddb';
var COLLECTION_NAME = 'Tweets';

/*** Module dependencies. ***/
//---Express.io---//
var express = require('express');
var app = require('express.io')();
    app.http().io();

var routes = require('./routes');
var path = require('path');
var mongoose = require('mongoose');
var db = mongoose.connect('mongodb://localhost/' + DATABASE_NAME);
var Document = require('./models.js').Document(db);
var Twitter = require('twit');

// all environments
app.set('views', __dirname + '/views');
app.set('view engine', 'jade');
app.use(express.favicon());
app.use(express.logger('dev'));
app.use(express.bodyParser());
app.use(express.methodOverride());
app.use(app.router);
app.use(express.static(path.join(__dirname, 'public')));

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
    consumer_key:         'Vx1Pgf8UlLKKQtzUdZz95g',
    consumer_secret:      'hMgEz35wGedZOTTQINcijTF6pknyxypNsjHOlk5uAw',
    access_token:         '1551825924-l9sX9eNlTdRnL7UcQHmjAm1oC5gB8TYmynBC2gh',
    access_token_secret:  '9M7yweRLlDGeMcBPHNZTUQssBnlFapmtYzWV4jf2M'
});

// Setup the ready route, and emit talk event.
app.io.route('ready', function(req) {
  
  // Streaming tweets and placing them in the database, then sending them to the feed
  var stream = T.stream('statuses/filter', { track: 'health center, medical, irvine center' });
  stream.on('tweet', function (tweet) {
      var tweetDoc = new Document({
          id: tweet.id,
          created_at: tweet.created_at,
          user: [{
            id: tweet.user.id,
            name: tweet.user.name,
            screen_name: tweet.user.screen_name,
            location: tweet.user.location
          }],
          text: tweet.text
      });

      // After tweet is saved, send to the client feed
      tweetDoc.save(function (err, tweet) {
        if (err) {
          return console.log(err);
        }
        else {
          console.log(tweet);
          req.io.emit('tweet-route', {
            message: tweet
          });
        }
      });
  });

  // Asking database how many total tweets it has every 5 seconds, then sending it to client.
  setInterval(function(){

    Document.count(function(err, count) {
      if (err) return console.error(err);
      var total = count;
        req.io.emit('total-tweets-route', {
          message: total
        });
      });

  }, 500);

  // setInterval(function(){
  // Getting data for keywords chart
    var total = 0;
    var moneyCount = 0;
    var cashCount = 0;
    var dollarsCount = 0;

    Document.count(function(err, count) {
      if (err) return console.error(err);
      total = count;
    });

    Document.count({ words: { $in: [ "text", "money" ] } } , function(err, count) {
      if (err) return console.error(err);
      moneyCount = count/total;
    });

    Document.count({ words: { $in: [ "text", "cash" ] } } , function(err, count) {
      if (err) return console.error(err);
      cashCount = count/total;
    });

    Document.count({ words: { $in: [ "text", "dollars" ] } } , function(err, count) {
      if (err) return console.error(err);
      dollarsCount = count/total;
    });

    req.io.emit('keywords-route', {
          moneyPer: 35,
          cashPer: 59,
          dollarsPer: 40
    });
  // }, 1000);

});

//*** Server routing ***//
//-- Home Page
app.get('/', routes.index);

//*** Start up the server ***//
app.listen(SERVER_PORT);



