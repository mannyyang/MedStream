/*** Global Variables ***/
var SERVER_PORT = 8080;
var DATABASE_NAME = 'meddb';

//---Global Config File---//
var config = require(__dirname + '/config.js');

/*** Module dependencies. ***/
//---Express.io---//
var express = require('express');
var app = require('express.io')();
    app.http().io();
var http = require('http');
var routes = require('./routes');
var path = require('path');
//---Database/Mongoose Dependencies---//
var mongoose = require('mongoose');
var db = mongoose.connect('mongodb://localhost/' + DATABASE_NAME);
var Document = require('./models.js').Document(db);
//---Twitter stream Dependency---//
var twitter = require('twit');
//---HTTP Post & Get Dependency---//
var needle = require('needle');
//---XML Parser Dependency---//
var parseXML = require('xml2js').parseString;

// all environments
app.set('views', __dirname + '/views');
app.use(express.favicon());
app.use(express.logger('dev'));
app.use(express.bodyParser());
app.use(express.methodOverride());
app.use(app.router);
app.use(express.static(path.join(__dirname, 'public')));

/////////////////////////////////////
//-------DATABASE CONNECTION-------//
/////////////////////////////////////
// MongoDB verification - Check database connection for connection success
mongoose.connection.on('open', function (ref) {
  console.log('Connected to mongo server.');
});
mongoose.connection.on('error', function (err){
  console.log('Could not connect to mongo server!');
  console.log(err);
});

///////////////////////////////
//-------INTIALIZE APP-------//
///////////////////////////////
// Set Twitter API key, token, & secret
var T = new twitter(config.twitterCredentials);
startTwitterAnalytics(T);
startRSSFeedParser();

//////////////////////////
//-------RSS FEED-------//
//////////////////////////
function startRSSFeedParser(){
  //---RSS ROUTE---//
  app.io.route('rss-route', function(req){
    GetOCRegister(req);
    // Set Loop intervals even if there is no client
    setInterval(function(){
      GetOCRegister(req);
    }, 3600000);
  });
}

//////////////////////////////
//-------TWITTER FEED-------//
//////////////////////////////
// start up twitter stream as soon as server starts
function startTwitterAnalytics(twit){

  // local variables
  var tweets = [];
  var intervalCount = 0;

  // Setting up the twitter stream
  var stream = twit.stream('statuses/filter', { track: config.keywords });
  stream.on('tweet', function (tweet) {

    // search the twitter text to see if it matches any of the keywords
    var text = tweet.text.toLowerCase();
    var keywords = [];

    for (var i = 0; i < config.keywords.length; i++){
      if (text.search(config.keywords[i]) != -1){
        keywords.push(config.keywords[i]);
      }
    }

    // Parsing raw twitter data, simplfying the information
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

    // Push the tweet into an array that will be processed for sentiment analysis
    tweets.push(origTweet);
    intervalCount++;
  });

  // Set Loop intervals even if there is no client
  setInterval(function(){
    AnalyzeSentiment(tweets);
    tweets = [];
  }, 5000);

  ///////////////////////////////////////////////////////
  // Fill the client's dashboard with info when called //
  ///////////////////////////////////////////////////////
  // Set Loop intervals only when a client calls for it
  //---READY ROUTE---//
  app.io.route('ready', function(req) {
    intervalCount = 0;
    
    GetTweetsPerInterval(req, intervalCount);
    GetTotalTweets(req);
    GetRecentTweets(req);
    GetKeywordPercentages(req);
    GetSentimentAnalytics(req);

    setInterval(function(){
      GetTweetsPerInterval(req, intervalCount);
      intervalCount = 0;
      GetTotalTweets(req);
      GetKeywordPercentages(req);
      GetSentimentAnalytics(req);
    }, 2500);
  });

  //---REFRESH ROUTE---//
  app.io.route('refresh-route', function(req) {
    GetRecentTweets(req);
  });

  //---SEARCH ROUTE---//
  app.io.route('search-route', function(req) {
    SearchText(req);
  });

}

//////////////////////////////////
//-------HELPER FUNCTIONS-------//
//////////////////////////////////
// Analyze the sentiment of an array of tweets
function AnalyzeSentiment(tweets){
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
              if (err) return console.log(err);
            });
          }
        }
        else{
          console.log(err);
        }
    });
  }
}
// Grab recent tweets and send them to the feed
function GetRecentTweets(req){
  var query = Document.find({}).sort({created_at: -1}).limit(35);
  query.exec(function(err, recentTweets) {
    if (err) console.log(err);
    req.io.emit('tweet-route', {
      recentTweets: recentTweets
    });
  });
}
// Get the number of tweets streamed in per whatever time interval is set 
function GetTweetsPerInterval(req, intervalCount){
  var newDate = new Date();

  req.io.emit('volume-time-route', {
    countPerInterval: intervalCount,
    todaysTime: newDate.timeNow()
  });
}
// Get the total number of tweets of the entire database and the tweets just for today
var totalTweets = 0;
var todaysTweets = 0;
function GetTotalTweets(req){
  Document.count(function(err, count) {
    if (err) return console.error(err);
    totalTweets = count;
  });

  var date = new Date();
  date.setHours(0); date.setMinutes(0); date.setSeconds(0);
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
var keywordPercentages = {};
function GetKeywordPercentages(req){

  config.keywords.forEach(function(entry){
    Document.count({ keywords: entry } , function(err, count) {
      if (err) return console.error(err);
      var perc = (count/totalTweets)*100;
      keywordPercentages[entry] = perc;
    });
  });

  req.io.emit('keywords-route', {
    keywordPercentages: keywordPercentages,
    keywordList: config.keywords
  });

}
// Search the database based on user's query (Twitter Feed Only - for now)
function SearchText(req){
  Document.textSearch(req.data, function (err, output) {
    if (err) return console.log(err);
    req.io.emit('search-route', {
        searchresults: output.results
    });
  });
}
// Parse the inputted RSS data
function ParseRSS(rss) {
  try {
    var items = [];
    for (var i = 0; i < config.maxItems && i < rss.rss.channel[0].item.length - 1; i++) {
      items.push({
        title: rss.rss.channel[0].item[i].title[0],
        link: rss.rss.channel[0].item[i].link[0],
        description: rss.rss.channel[0].item[i].description[0]
      });
    }

    var feed = {
      name: rss.rss.channel[0].title,
      description: rss.rss.channel[0].description,
      link: rss.rss.channel[0].link,
      items: items
    };
    return feed;
  }
  catch (e) { // If not all the fiels are inside the feed
    return null;
  }
}
function ParseAtom(rss) {
  try {
    var items = [];
    for (var i = 0; i < config.maxItems && i < rss.feed.entry.length - 1; i++) {
      items.push({
        title: rss.feed.entry[i].title[0]._,
        link: rss.feed.entry[i].link[0].$.href,
        description: rss.feed.entry[i].content[0]._
      });
    }
    var feed = {
      name: rss.feed.title,
      description: "No description",
      link: rss.feed.link[0].$.href,
      items: items
    };
    return feed;
  }
  catch (e) { 
    // If not all the fields are inside the feed
    console.log(e);
    return null;
  }
}
// Parse XML Feed from OC Register
function GetOCRegister(req){
  http.get(config.rssURLS.ocregister, function (res) {
    var body = "";

    res.on('data', function (chunk) {
      body += chunk;
      //---XML Data---
      //console.log(body);
    });
    res.on('end', function () {
      // Got all response, now parsing...

      if (!body || res.statusCode !== 200)
        return console.error(err);

      parseXML(body, function (err, rss) {
        if (err)
          return console.error(err);

        feed = ParseRSS(rss);
        if (!feed)
          feed = ParseAtom(rss);
        if (!feed)
          return console.error(err);
      });

      //Send message to client
      req.io.emit('rss-route', {
        rssmessage: feed
      });

    });
  }).on('error', function (error) {
    console.log("error while getting feed", error);
  });
}
// Get analytics from sentiment data
var positive = 0.0;
var neutral = 0.0;
var negative = 0.0;
function GetSentimentAnalytics(req){

  Document.count({polarity: 0 }, function(err, count) {
    if (err) return console.error(err);
    negative = (count/totalTweets)*100;
  });

  Document.count({polarity: 2 }, function(err, count) {
    if (err) return console.error(err);
    neutral = (count/totalTweets)*100;
  });

  Document.count({polarity: 4 }, function(err, count) {
    if (err) return console.error(err);
    positive = (count/totalTweets)*100;
  });

  //Send message to client
  req.io.emit('sentiments-route', {
    positive: positive,
    neutral: neutral,
    negative: negative
  });

}

//For todays date;
Date.prototype.today = function(){
  return ((this.getDate() < 10)?"0":"") + this.getDate() +"/"+(((this.getMonth()+1) < 10)?"0":"") + (this.getMonth()+1) +"/"+ this.getFullYear();
};
//For the time now
Date.prototype.timeNow = function(){
  return ((this.getHours() < 10)?"0":"") + ((this.getHours()>12)?(this.getHours()-12):this.getHours()) +":"+ ((this.getMinutes() < 10)?"0":"") + this.getMinutes() +":"+ ((this.getSeconds() < 10)?"0":"") + this.getSeconds() + ((this.getHours()>12)?('PM'):'AM');
};
//--- END HELPER FUNCTIONS ---//


//*** Server routing ***//
//-- Home Page
app.get('/', routes.index);

// for UI development
app.get('/index2.html', routes.index2);

//*** Start up the server ***//
app.listen(SERVER_PORT);
