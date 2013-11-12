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
var needle = require('needle');

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

  //*** Local Variables ***//
  // current tweets getting analyzed
  var tweets = [];
  // number of tweets per interval
  var countPerInterval = 0;
  // current number of tweets in database
  var totalTweets = 0;
  var todaysTweets = 0;
  // data for keyword charts
  var totalInDB = 0;
  var keyOne = 0;
  var keyTwo = 0;
  var keyThree = 0;

  // Streaming tweets and placing them in the database, then sending them to the feed
  var stream = T.stream('statuses/filter', { track: 'doctor, hospital, patients' });
  stream.on('tweet', function (tweet) {

    // search the twitter text to see if it matches any of the keywords
    var text = tweet.text.toLowerCase();
    var keywords = [];

    if ( (text.search('doctor') != -1) /*&& (text.search('office') != -1)*/ ){
      keywords.push("doctor");
    }

    if ( /*(text.search('medical') != -1)  &&*/ (text.search('hospital') != -1) ){
      keywords.push("hospital");
    }

    if ( /*(text.search('cancer') != -1) &&*/ (text.search('patients') != -1) ){
      keywords.push("patients");
    }

    var origTweet = {
        id: tweet.id,
        created_at: tweet.created_at,
        user: [{
          id: tweet.user.id,
          name: tweet.user.name,
          screen_name: tweet.user.screen_name,
          location: tweet.user.location
        }],
        text: tweet.text,
        keywords: keywords,
    };

    tweets.push(origTweet);

    countPerInterval++;
  });

  AnalyzeSentiment();
  GetKeywordPercentages();
  GetTotalTweets();

  setInterval(function(){
    AnalyzeSentiment();
    GetKeywordPercentages();
    GetTotalTweets();
  }, 5000);

  setInterval(function(){
    GetTweetsPerInterval();
  }, 1000);

  //*** MedStream Helper Functions ***//
  // Analyze Sentiment of Feed Function //
  function AnalyzeSentiment(){
    var objTweets = {data: tweets};
    if (tweets.length > 0){ 
      // Use HTTP Post to send a batch of tweets set as a JSON object
      needle.post('http://www.sentiment140.com/api/bulkClassifyJson?appid=manuely@uci.edu', JSON.stringify(objTweets), 
      function(err, resp, body){
          if (!err) {
            //when response is given, create a new mongoose document for each tweet
            for (var i = 0; i < body.data.length; i++){
              var tweetDoc = new Document({
                  id: body.data[i].id,
                  created_at: body.data[i].created_at,
                  user: [{
                    id: body.data[i].user[0].id,
                    name: body.data[i].user[0].name,
                    screen_name: body.data[i].user[0].screen_name,
                    location: body.data[i].user[0] .location
                  }],
                  text: body.data[i].text,
                  keywords: body.data[i].keywords,
                  polarity: body.data[i].polarity
              });

              // After tweet is saved, send to the client feed
              tweetDoc.save(function (err, tweet) {
                if (err) 
                  return console.log(err);
              });
            }
          }
          else{
            console.log(err);
          }
      });
      tweets = [];
    }
  }
  // Get the number of tweets streamed in per whatever time interval is set 
  function GetTweetsPerInterval(){

    var date = new Date();
    date.setHours(0);
    date.setMinutes(0);
    date.setSeconds(0);

    var newDate = new Date();  

    req.io.emit('volume-time-route', {
          countPerInterval: countPerInterval,
          todaysTime: newDate.timeNow()
    });

    countPerInterval = 0;
  }
  // Get the total number of tweets of the entire database and the tweets just for today
  function GetTotalTweets(){
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
    });

    req.io.emit('total-tweets-route', {
      totalTweets: totalTweets,
      todaysTweets: todaysTweets
    });
  }
  // Get the percentages of each keyword that is shown in a tweet.
  function GetKeywordPercentages(){
    Document.count(function(err, count) {
      if (err) return console.error(err);
      totalInDB = count;
    });

    Document.count({ keywords: 'doctor' } , function(err, count) {
      if (err) return console.error(err);
        keyOne = ((count/totalInDB)*100);
    });

    Document.count({ keywords: 'hospital' } , function(err, count) {
      if (err) return console.error(err);
        keyTwo = ((count/totalInDB)*100);
    });

    Document.count({ keywords: 'patients' } , function(err, count) {
      if (err) return console.error(err);
        keyThree = ((count/totalInDB)*100);
    });

    req.io.emit('keywords-route', {
      keywordOne: keyOne,
      keywordTwo: keyTwo,
      keywordThree: keyThree 
    });
  }

});

app.io.route('refresh-route', function(req) {

  GetRecentTweets();

  //*** MedStream Helper Functions ***//
  // Grab recent tweets and send them to the feed
  function GetRecentTweets(){
    var query = Document.find({}).sort({created_at: -1}).limit(35);
    query.exec(function(err, recentTweets) {
      if (err)
        console.log(err);
      req.io.emit('tweet-route', {
        recentTweets: recentTweets
      });
    });
  }
});

app.io.route('search-route', function(req) {

  Document.textSearch(req.data, function (err, output) {
    if (err) return console.log(err);
    console.log(output.results);
    req.io.emit('search-result-route', {
        searchresults: output.results
    });
  });

});



//*** Global Helper Functions ***//
// pass in the 'created_at' string returned from twitter //
function parseTwitterDate($stamp){ // convert to local string and remove seconds and year //   
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
Date.prototype.timeNow = function(){ 
  return ((this.getHours() < 10)?"0":"") + ((this.getHours()>12)?(this.getHours()-12):this.getHours()) +":"+ ((this.getMinutes() < 10)?"0":"") + this.getMinutes() +":"+ ((this.getSeconds() < 10)?"0":"") + this.getSeconds() + ((this.getHours()>12)?('PM'):'AM'); 
};

//*** Server routing ***//
//-- Home Page
app.get('/', routes.index);

//*** Start up the server ***//
app.listen(SERVER_PORT);



