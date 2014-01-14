/*** Global Variables ***/
var SERVER_PORT = 8080;
var DATABASE_NAME = 'meddb';
var COLLECTION_NAME = 'Tweets';

/*** Module dependencies. ***/
//---Express.io---//
var express = require('express');
var app = require('express.io')();
    app.http().io();

var http = require('http');
var routes = require('./routes');
var path = require('path');
var mongoose = require('mongoose');
var db = mongoose.connect('mongodb://localhost/' + DATABASE_NAME);
var Document = require('./models.js').Document(db);
var config = require(__dirname + '/config.js');
var twitter = require('twit');
var needle = require('needle');
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

//////////////////////////////
//-------TWITTER FEED-------//
//////////////////////////////
// start up twitter stream as soon as server starts

// Set Twitter API key, token, & secret
var T = new twitter(config.twitterCredentials);
startTwitterAnalytics(T);

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

  // Set Loop intervals only when a client calls for it
  app.io.route('ready', function(req) {
    intervalCount = 0;
    
    ///////////////////////////////////////////////////////
    // Fill the client's dashboard with info when called //
    ///////////////////////////////////////////////////////
    GetTweetsPerInterval(req, intervalCount);
    GetTotalTweets(req);
    GetRecentTweets(req);
    GetKeywordPercentages(req);

    setInterval(function(){
      GetTweetsPerInterval(req, intervalCount);
      intervalCount = 0;
      GetTotalTweets(req);
      GetKeywordPercentages(req);
    }, 2500);
  });

  app.io.route('refresh-route', function(req) {
    GetRecentTweets(req);
  });

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
// Search the database based on user's query
function SearchText(req){
  Document.textSearch(req.data, function (err, output) {
    if (err) return console.log(err);
    console.log(output.results);
    req.io.emit('search-result-route', {
        searchresults: output.results
    });
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




// //*** OC Register RSS & Twitter Feed ***//
// //*** Socket IO calls ***//
// // Setup the ready route, and emit talk event.
// app.io.route('ready', function(req) {

//     // ------------------------------------
//   // ---------- RSS Data ----------------
//   // ------------------------------------
//   var XMLtoJSON;

//   var parseRSS = function (rss) {
//       try {
//         var items = [];
//         for (var i = 0; i < config.maxItems && i < rss.rss.channel[0].item.length - 1; i++) {
//           items.push({
//             title: rss.rss.channel[0].item[i].title[0],
//             link: rss.rss.channel[0].item[i].guid[0]._,
//             description: rss.rss.channel[0].item[i].description[0]
//           })
//         };

//         var feed = {
//           name: rss.rss.channel[0].title,
//           description: rss.rss.channel[0].description,
//           link: rss.rss.channel[0].link,
//           items: items
//         };
//         return feed;
//       }
//       catch (e) { // If not all the fiels are inside the feed
//         return null;
//       }
//   }
//   var parseAtom = function (rss) {
//       try {
//         var items = [];
//         for (var i = 0; i < config.maxItems && i < rss.feed.entry.length - 1; i++) {
//           items.push({
//             title: rss.feed.entry[i].title[0]._,
//             link: rss.feed.entry[i].link[0].$.href,
//             description: rss.feed.entry[i].content[0]._
//           })
//         };
//         var feed = {
//           name: rss.feed.title,
//           description: "No description",
//           link: rss.feed.link[0].$.href,
//           items: items
//         };
//         return feed;
//       }
//       catch (e) { // If not all the fields are inside the feed
//         console.log(e);
//         return null;
//       }
//   }

//   function getOCRegister(){
//   http.get("http://www.ocregister.com/common/rss/rss.php?catID=23541", function (res) {
//     var body = "";

//     res.on('data', function (chunk) {
//       body += chunk;
//       //---XML Data---
//       //console.log(body);
//     });

//     res.on('end', function () {
//       // Got all response, now parsing...

//       if (!body || res.statusCode !== 200)
//         return console.error(err);
//         //return callback({message: "Invalid Feed"});


//       parseXML(body, function (err, rss) {
//         if (err)
//           return console.error(err);
//           //return callback({message: "Invalid Feed"});

//         feed = parseRSS(rss);
//         if (!feed)
//           feed = parseAtom(rss);
//         if (!feed)
//           return console.error(err);
//           //return callback({message: "Invalid Feed"});
//         //callback(err, feed);

//         });
//         //--Verify end of function statement--
//         console.log("parsed RSS success");
//         //console.log(feed.name);

//         //Send message to client
//         req.io.emit('rss-route', {
//           rssmessage: feed
//         });
//     });

//   }).on('error', function (error) {
//       console.log("error while getting feed", error);
//       //callback(error, null);
//       });
//   }

//   //*** Local Variables ***//
//   // current tweets getting analyzed
//   var tweets = [];
//   // number of tweets per interval
//   var countPerInterval = 0;
//   // current number of tweets in database
//   var totalTweets = 0;
//   var todaysTweets = 0;
//   // data for keyword charts
//   var totalInDB = 0;
//   var keyOne = 0;
//   var keyTwo = 0;
//   var keyThree = 0;

//   // Streaming tweets and placing them in the database, then sending them to the feed
//   var stream = T.stream('statuses/filter', { track: 'doctor, hospital, patients' });
//   stream.on('tweet', function (tweet) {

//     // search the twitter text to see if it matches any of the keywords
//     var text = tweet.text.toLowerCase();
//     var keywords = [];

//     if ( (text.search('doctor') != -1) /*&& (text.search('office') != -1)*/ ){
//       keywords.push("doctor");
//     }

//     if ( /*(text.search('medical') != -1)  &&*/ (text.search('hospital') != -1) ){
//       keywords.push("hospital");
//     }

//     if ( /*(text.search('cancer') != -1) &&*/ (text.search('patients') != -1) ){
//       keywords.push("patients");
//     }

//     var origTweet = {
//         id: tweet.id,
//         created_at: tweet.created_at,
//         user: [{
//           id: tweet.user.id,
//           name: tweet.user.name,
//           screen_name: tweet.user.screen_name,
//           location: tweet.user.location
//         }],
//         text: tweet.text,
//         keywords: keywords,
//     };

//     tweets.push(origTweet);

//     countPerInterval++;
//   });

//   AnalyzeSentiment();
//   GetKeywordPercentages();
//   GetTotalTweets();
//   getOCRegister();

//   setInterval(function(){
//     AnalyzeSentiment();
//     GetKeywordPercentages();
//     GetTotalTweets();
//   }, 5000);

//   setInterval(function(){
//     GetTweetsPerInterval();
//   }, 1000);

//   //*** MedStream Helper Functions ***//
//   // Analyze Sentiment of Feed Function //
//   function AnalyzeSentiment(){
//     var objTweets = {data: tweets};
//     if (tweets.length > 0){ 
//       // Use HTTP Post to send a batch of tweets set as a JSON object
//       needle.post('http://www.sentiment140.com/api/bulkClassifyJson?appid=manuely@uci.edu', JSON.stringify(objTweets), 
//       function(err, resp, body){
//           if (!err) {
//             //when response is given, create a new mongoose document for each tweet
//             for (var i = 0; i < body.data.length; i++){
//               var tweetDoc = new Document({
//                   id: body.data[i].id,
//                   created_at: body.data[i].created_at,
//                   user: [{
//                     id: body.data[i].user[0].id,
//                     name: body.data[i].user[0].name,
//                     screen_name: body.data[i].user[0].screen_name,
//                     location: body.data[i].user[0] .location
//                   }],
//                   text: body.data[i].text,
//                   keywords: body.data[i].keywords,
//                   polarity: body.data[i].polarity
//               });

//               // After tweet is saved, send to the client feed
//               tweetDoc.save(function (err, tweet) {
//                 if (err) 
//                   return console.log(err);
//               });
//             }
//           }
//           else{
//             console.log(err);
//           }
//       });
//       tweets = [];
//     }
//   }
//   // Get the number of tweets streamed in per whatever time interval is set 
//   function GetTweetsPerInterval(){

//     var date = new Date();
//     date.setHours(0);
//     date.setMinutes(0);
//     date.setSeconds(0);

//     var newDate = new Date();  

//     req.io.emit('volume-time-route', {
//           countPerInterval: countPerInterval,
//           todaysTime: newDate.timeNow()
//     });

//     countPerInterval = 0;
//   }
//   // Get the total number of tweets of the entire database and the tweets just for today
//   function GetTotalTweets(){
//     Document.count(function(err, count) {
//       if (err) return console.error(err);
//         totalTweets = count;
//     });

//     var date = new Date();
//     date.setHours(0);
//     date.setMinutes(0);
//     date.setSeconds(0);
//     Document.count({created_at: {$gte: date, $lt: new Date()} }, function(err, count) {
//       if (err) return console.error(err);
//         todaysTweets = count;
//     });

//     req.io.emit('total-tweets-route', {
//       totalTweets: totalTweets,
//       todaysTweets: todaysTweets
//     });
//   }
//   // Get the percentages of each keyword that is shown in a tweet.
//   function GetKeywordPercentages(){
//     Document.count(function(err, count) {
//       if (err) return console.error(err);
//       totalInDB = count;
//     });

//     Document.count({ keywords: 'doctor' } , function(err, count) {
//       if (err) return console.error(err);
//         keyOne = ((count/totalInDB)*100);
//     });

//     Document.count({ keywords: 'hospital' } , function(err, count) {
//       if (err) return console.error(err);
//         keyTwo = ((count/totalInDB)*100);
//     });

//     Document.count({ keywords: 'patients' } , function(err, count) {
//       if (err) return console.error(err);
//         keyThree = ((count/totalInDB)*100);
//     });

//     req.io.emit('keywords-route', {
//       keywordOne: keyOne,
//       keywordTwo: keyTwo,
//       keywordThree: keyThree 
//     });
//   }

// });

// app.io.route('refresh-route', function(req) {

//   GetRecentTweets();

//   //*** MedStream Helper Functions ***//
//   // Grab recent tweets and send them to the feed
//   function GetRecentTweets(){
//     var query = Document.find({}).sort({created_at: -1}).limit(35);
//     query.exec(function(err, recentTweets) {
//       if (err)
//         console.log(err);
//       req.io.emit('tweet-route', {
//         recentTweets: recentTweets
//       });
//     });
//   }
// });

// app.io.route('search-route', function(req) {

//   Document.textSearch(req.data, function (err, output) {
//     if (err) return console.log(err);
//     console.log(output.results);
//     req.io.emit('search-result-route', {
//         searchresults: output.results
//     });
//   });

// });



// //*** Global Helper Functions ***//

// //For todays date;
// Date.prototype.today = function(){ 
//     return ((this.getDate() < 10)?"0":"") + this.getDate() +"/"+(((this.getMonth()+1) < 10)?"0":"") + (this.getMonth()+1) +"/"+ this.getFullYear() 
// };
// //For the time now
// Date.prototype.timeNow = function(){ 
//   return ((this.getHours() < 10)?"0":"") + ((this.getHours()>12)?(this.getHours()-12):this.getHours()) +":"+ ((this.getMinutes() < 10)?"0":"") + this.getMinutes() +":"+ ((this.getSeconds() < 10)?"0":"") + this.getSeconds() + ((this.getHours()>12)?('PM'):'AM'); 
// };

//*** Server routing ***//
//-- Home Page
app.get('/', routes.index);

//*** Start up the server ***//
app.listen(SERVER_PORT);
