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

//*** Socket IO calls ***//
// Setup the ready route, and emit talk event.
app.io.route('ready', function(req) {

  Document.textSearch('patients', function (err, output) {
    if (err) return console.log(err);

    console.log(output);
    // { queryDebugString: '3d||||||',
    //   language: 'english',
    //   results:
    //    [ { score: 1,
    //        obj:
    //         { name: 'Super Mario 64',
    //           _id: 5150993001900a0000000001,
    //           __v: 0,
    //           tags: [ 'nintendo', 'mario', '3d' ] } } ],
    //   stats:
    //    { nscanned: 1,
    //      nscannedObjects: 0,
    //      n: 1,
    //      nfound: 1,
    //      timeMicros: 77 },
    //   ok: 1 }
  });
  
  // number of tweets per second
  var countPerSec = 0;

  // Streaming tweets and placing them in the database, then sending them to the feed
  var stream = T.stream('statuses/filter', { track: 'doctor, hospital, patients' });
  stream.on('tweet', function (tweet) {
      // console.log(tweet);
      // search the twitter text to see if it matches any of the keywords
      var keywords = [];
      var text = tweet.text.toLowerCase();

      if ( (text.search('doctor') != -1) /*&& (text.search('office') != -1)*/ ){
        keywords.push("doctor");
      }

      if ( /*(text.search('medical') != -1)  &&*/ (text.search('hospital') != -1) ){
        keywords.push("hospital");
      }

      if ( /*(text.search('cancer') != -1) &&*/ (text.search('patients') != -1) ){
        keywords.push("patients");
      }

      var tweetDoc = new Document({
          id: tweet.id,
          created_at: tweet.created_at,
          user: [{
            id: tweet.user.id,
            name: tweet.user.name,
            screen_name: tweet.user.screen_name,
            location: tweet.user.location
          }],
          text: tweet.text,
          keywords: keywords
      });

      // After tweet is saved, send to the client feed
      tweetDoc.save(function (err, tweet) {
        if (err) {
          return console.log(err);
        }
        else {
          // console.log(tweet);
          req.io.emit('tweet-route', {
            message: tweet
          });
        }
      });

      countPerSec++;

  });

  // Get total count of tweets per sec
  setInterval(function(){

    var newDate = new Date();  

    req.io.emit('volume-time-route', {
          countPerSec: countPerSec,
          todaysTime: newDate.timeNow()
    });

    countPerSec = 0;

  }, 1000);

  // Asking database how many total tweets it has every 5 seconds, then sending it to client.
  var totalTweets = 0;
  var todaysTweets = 0;
  setInterval(function(){

    Document.count(function(err, count) {
      if (err) return console.error(err);
        totalTweets = count;
    });

    var date = new Date();
    date.setHours(0);
    date.setMinutes(0);
    date.setSeconds(0);
    Document.count({created_at: {$gte: date, $lt: new Date()} }, function(err, count) {
      if (err) return console.error(err);
        todaysTweets = count;
        // console.log(count);
    });

    req.io.emit('total-tweets-route', {
      totalTweets: totalTweets,
      todaysTweets: todaysTweets
    });

  }, 500);

  var total = 0;
  var keyOne = 0;
  var keyTwo = 0;
  var keyThree = 0;
  setInterval(function(){

  // Getting data for keywords chart
    Document.count(function(err, count) {
      if (err) return console.error(err);
      total = count;
    });

    Document.count({ keywords: 'doctor' } , function(err, count) {
      if (err) return console.error(err);
        keyOne = ((count/total)*100);
    });

    Document.count({ keywords: 'hospital' } , function(err, count) {
      if (err) return console.error(err);
        keyTwo = ((count/total)*100);
    });

    Document.count({ keywords: 'patients' } , function(err, count) {
      if (err) return console.error(err);
        keyThree = ((count/total)*100);
    });

    req.io.emit('keywords-route', {
          keywordOne: keyOne,
          keywordTwo: keyTwo,
          keywordThree: keyThree 
    });

  }, 500);

});

//*** Helper Functions ***//
// pass in the 'created_at' string returned from twitter //
function parseTwitterDate($stamp)
{   
// convert to local string and remove seconds and year //   
  var date = new Date(Date.parse($stamp)).toLocaleString().substr(0, 16);
// get the two digit hour //
  var hour = date.substr(-5, 2);
// convert to AM or PM //
  var ampm = hour<12 ? ' AM' : ' PM';
  if (hour>12) hour-= 12;
  if (hour==0) hour = 12;
// return the formatted string //
  var time = [date.substr(0, 11), hour, date.substr(13), ampm];
  return time;
}

//For todays date;
Date.prototype.today = function(){ 
    return ((this.getDate() < 10)?"0":"") + this.getDate() +"/"+(((this.getMonth()+1) < 10)?"0":"") + (this.getMonth()+1) +"/"+ this.getFullYear() 
};
//For the time now
Date.prototype.timeNow = function(){ return ((this.getHours() < 10)?"0":"") + ((this.getHours()>12)?(this.getHours()-12):this.getHours()) +":"+ ((this.getMinutes() < 10)?"0":"") + this.getMinutes() +":"+ ((this.getSeconds() < 10)?"0":"") + this.getSeconds() + ((this.getHours()>12)?('PM'):'AM'); };

//*** Server routing ***//
//-- Home Page
app.get('/', routes.index);

//*** Start up the server ***//
app.listen(SERVER_PORT);



