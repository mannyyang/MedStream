/*** Global Variables ***/
var SERVER_PORT = 8080;
var DATABASE_NAME = 'meddb';
var COLLECTION_NAME = 'Media';

//---Global Config File---//
var config = require(__dirname + '/config.js');

/*** Module dependencies. ***/
//---Express.io---//
var express = require('express');
var app = require('express.io')();
    app.http().io();
var http = require('http');
var https = require('https');
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

// FACEBOOK HACKATHON CODE //
app.io.route('client-submit-route', function(req){

  config.keywords = req.data.keywords;
  console.log(config.keywords);

  // Set Twitter API key, token, & secret
  var T = new twitter(config.twitterCredentials);
  startTwitterAnalytics(T);
  startRSSFeedParser();
  startFacebookAnalytics();

  // req.io.emit('client-submit-route');

});


///////////////////////////////
//-------INTIALIZE APP-------//
///////////////////////////////
// Set Twitter API key, token, & secret
// var T = new twitter(config.twitterCredentials);
// startTwitterAnalytics(T);
// startRSSFeedParser();
// startFacebookAnalytics();

//////////////////////////
//-------RSS FEED-------//
//////////////////////////
var items = [];
var rssMedia = [];
function startRSSFeedParser(){
  //---RSS ROUTE---//
  app.io.route('rss-route', function(req){
    GetOCRegister(req);
    GetLaTimes(req);
    // Set Loop intervals even if there is no client
    setInterval(function(){
      GetOCRegister(req);
      GetLaTimes(req);
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
        title: null,
        text: tweet.text,
        link: null,
        source: "Twitter",
        keywords: keywords,
        polarity: null,
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
    GetTotals(req);

    /*
    // subsubmed into GetRecentMedia()
    GetRecentTweets(req);
    GetRecentRSS(req);
    GetRecentfbposts(req);
    */
    
    GetRecentMedia(req);
    GetKeywordPercentages(req);
    GetSentimentAnalytics(req);

    GetSourcePercentage(req);
    GetCollectionDuration(req);
    //GetFacebook();
    //GetTotalRSS(req);

    SendClientConfig(req);

    setInterval(function(){
      GetTweetsPerInterval(req, intervalCount);
      intervalCount = 0;
      GetTotals(req);
      GetKeywordPercentages(req);
      GetSentimentAnalytics(req);
      GetSourcePercentage(req);

      GetCollectionDuration(req);
      //GetTotalRSS(req);

      SendClientConfig(req);
    }, 2500);
  });

  //---REFRESH ROUTE---//
  app.io.route('refresh-route', function(req) {
    /*
    // subsubmed into GetRecentMedia()
    GetRecentTweets(req);
    GetRecentRSS(req);
    GetRecentfbposts(req);
    */
    GetRecentMedia(req);
  });
  //---SEARCH ROUTE---//
  app.io.route('search-route', function(req) {
    SearchText(req);
  });

}

//////////////////////////////
//-------FACEBOOK FEED-------//
//////////////////////////////
// 
function startFacebookAnalytics(){
  
  var facebookKeywords = "";
  for (var i = 0; i < config.keywords.length; i++){
    facebookKeywords += config.keywords[i]+" ";
  }
    console.log("facebookKeywords : "+facebookKeywords);
    var facebookUrl = config.facebookURL.facebook+'&access_token='+config.facebookCredentials.access_token+'&q='+facebookKeywords;
    var facebookItems = [];
    var intervalCount = 0;

    https.get(facebookUrl, function (res) {
      var body = "";

      res.on('data', function (chunk) {
        body += chunk;
      });

      res.on('end', function () {
      // Got all response, now parsing...

      if (!body || res.statusCode !== 200){
        return console.error('facebook error: ' + res.statusCode);
      }
        //return callback({message: "Invalid Feed"});

        var json = JSON.parse(body);

        json.data.filter(function (post){
          if(post.type == "status"){

        // search the facebook text to see if it matches any of the keywords
        var text = post.message.toLowerCase();
        var keywords = [];

        for (var i = 0; i < config.keywords.length; i++){
          if (text.search(config.keywords[i]) != -1){
            keywords.push(config.keywords[i]);
            }
        }
            var message = new String(post.message);
            var shortened = message.substring(0,140);
            // console.log("shortened: "+shortened);
            var fbPosting = new Document({
              id: post.id,
              created_at: post.created_time,
              user: [{
                id: post.from.id,
                name: post.from.name,
                screen_name: null,
                location: null
              }],
              title: shortened,
              text: post.message,
              link: null,
              source: "facebook",
              keywords: keywords,
              polarity: null,
            });

            // Push the tweet into an array that will be processed for sentiment analysis
            facebookItems.push(fbPosting);
            intervalCount++;

            // console.log(fbPosting);
          }

        });

        //--Verify end of function statement--
        if(facebookItems.length == 0)
          console.log("No facebook items added!");
      });
    });
  

  // Set Loop intervals even if there is no client
  setInterval(function(){
    AnalyzeFacebookSentiment(facebookItems);
    facebookItems = [];
  }, 5000);

}

function SendClientConfig(req){
  //console.log('sending config: ' + JSON.stringify(config.client_config));

  req.io.emit('client-config-route', {
    config : config.client_config
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
                title: null,
                text: body.data[i].text,
                link: null,
                source: "twitter",
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
  var query = Document.find({source:"twitter"}).sort({created_at: -1}).limit(35);
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
var totalRSS = 0;
var todaysRSS = 0;
var totalFacebook = 0;
var todaysFacebook = 0; 
function GetTotals(req){

  //TOTALS FOR TWITTER
  Document.count({source:"twitter"}, function(err, count) {
    if (err) return console.error(err);
    totalTweets = count;
  });

  var date = new Date();
  date.setHours(0); date.setMinutes(0); date.setSeconds(0);
  Document.count({created_at: {$gte: date, $lt: new Date()}, source:"twitter"}, function(err, count) {
    if (err) return console.error(err);
    todaysTweets = count;
  });

  //TOTALS FOR RSS
  Document.count({source:"RSS"}, function(err, count) {
    if (err) return console.error(err);
    totalRSS = count;
  });

  var date = new Date();
  date.setHours(0); date.setMinutes(0); date.setSeconds(0);
  Document.count({created_at: {$gte: date, $lt: new Date()}, source:"RSS"}, function(err, count) {
    if (err) return console.error(err);
    todaysRSS = count;
  });

    //TOTALS FOR RSS
  Document.count({source:"facebook"}, function(err, count) {
    if (err) return console.error(err);
    totalFacebook = count;
  });

  var date = new Date();
  date.setHours(0); date.setMinutes(0); date.setSeconds(0);
  Document.count({created_at: {$gte: date, $lt: new Date()} , source:"facebook"}, function(err, count) {
    if (err) return console.error(err);
    todaysFacebook = count;
  });

  req.io.emit('totals-route', {
    totalTweets: totalTweets,
    todaysTweets: todaysTweets,
    totalRSS: totalRSS,
    todaysRSS: todaysRSS,
    totalFacebook: totalFacebook,
    todaysFacebook: todaysFacebook
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

//////////////////////////////////////////////
//-------RSS FEED -- HELPER FUNCTIONS-------//
/////////////////////////////////////////////
// Parse the inputted RSS data
function ParseRSS(rss) {
  try {
    //var items = [];
    for (var i = 0; i < config.maxItems && i < rss.rss.channel[0].item.length - 1; i++) {
            items.push({
              guid: rss.rss.channel[0].item[i].guid[0],
              title: rss.rss.channel[0].item[i].title[0],
              link: rss.rss.channel[0].item[i].link[0],
              description: rss.rss.channel[0].item[i].description[0],
              date: rss.rss.channel[0].item[i].pubDate[0]
            });
        }


    var feed = {
      guid: rss.rss.channel[0].guid,
      name: rss.rss.channel[0].title,
      description: rss.rss.channel[0].description,
      link: rss.rss.channel[0].link,
      date: rss.rss.channel[0].pubDate,
      items: items
    };

    return feed;
  }
  catch (e) { // If not all the fields are inside the feed
    return null;
  }
}
function ParseAtom(rss) {
  try {
    //var items = [];
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
    console.log("uknown guid");
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

      //Iterate list of OC Register Postings to save relevant posts by keywords
      for (var i = 0; i < items.length; i++){
        for (var j = 0; j < config.keywords.length; j++){

          //Search OC Register postings titles for matches in keywords, only save those postings
          var titleText = feed.items[i].title;
          var descriptionText = feed.items[i].description;
          var titleTextLower = titleText.toLowerCase();
          var descriptionTextLower = descriptionText.toLowerCase();
          //console.log("OC Register: " + temp);
          var keywords = [];

          if (titleTextLower.search(config.keywords[j]) != -1 || descriptionTextLower.search(config.keywords[j]) != -1){
            keywords.push(config.keywords[j]);

            var rssDoc = new Document({
                id: feed.items[i].guid._,
                created_at: feed.pubDate,
                user: [{
                  id: null,
                  name: null,
                  screen_name: null,
                  location: null
                }],
                title: feed.items[i].title,
                text: feed.items[i].description,
                link: feed.items[i].link,
                source: "RSS",
                keywords: keywords,
                polarity: null,
            });

            //Push to array to be analyzed for sentiment
            rssMedia.push(rssDoc);
          }
          // else{
          //     console.log("no OC register match");
          // }
        }
      }

      var objRSSMedia = {data: rssMedia};
      if (rssMedia.length > 0){
        // Use HTTP Post to send a batch of tweets set as a JSON object
        needle.post('http://www.sentiment140.com/api/bulkClassifyJson?appid=manuely@uci.edu', JSON.stringify(objRSSMedia),
        function(err, resp, body){
            if (!err) {
              //when response is given, create a new mongoose document for each tweet
              for (var i = 0; i < body.data.length; i++){
                var rssDoc = new Document({
                    id: body.data[i].id,
                    created_at: body.data[i].created_at,
                    user: [{
                      id: null,
                      name: null,
                      screen_name: null,
                      location: null
                    }],
                    title: body.data[i].title,
                    text: body.data[i].text,
                    link: body.data[i].link,
                    source: "RSS",
                    keywords: body.data[i].keywords,
                    polarity: body.data[i].polarity
                });

                // After tweet is saved, send to the client feed
                rssDoc.save(function (err, feed) {
                  if (err) return console.log(err);
                });

              }
            }
            else{
              console.log(err);
            }
        });
      }

      //Send message to client
      req.io.emit('rss-route', {
        rssmessage: feed
      });

    });
  }).on('error', function (error) {
    console.log("error while getting feed", error);
  });
}

// Parse XML Feed from LA Times
function GetLaTimes(req){
  http.get(config.rssURLS.latimes, function (res) {
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

      //Iterate list of LA Times Postings to save relevant posts by keywords
      for (var i = 0; i < items.length; i++){
          for (var j = 0; j < config.keywords.length; j++){

            //Search titles of LA Times Postings for matches in keywords, only save postings that match
            var titleText = feed.items[i].title;
            var descriptionText = feed.items[i].description;
            var titleTextLower = titleText.toLowerCase();
            var descriptionTextLower = descriptionText.toLowerCase();
            // console.log("LA Times Title: " + temp);
            var keywords = [];

            if (titleTextLower.search(config.keywords[j]) != -1 || descriptionTextLower.search(config.keywords[j]) != -1){
              keywords.push(config.keywords[j]);

              var rssDoc = new Document({
                  id: feed.items[i].guid._,
                  created_at: feed.pubDate,
                  user: [{
                    id: null,
                    name: null,
                    screen_name: null,
                    location: null
                  }],
                  title: feed.items[i].title,
                  text: feed.items[i].description,
                  link: feed.items[i].link,
                  source: "RSS",
                  keywords: keywords,
                  polarity: null,
              });
          
              //Push to array to be analyzed for sentiment
              rssMedia.push(rssDoc);
            }
            // else{
            //       console.log("no LA Times match");
            // }
          }
      }

      var objRSSMedia = {data: rssMedia};
      if (rssMedia.length > 0){
        // Use HTTP Post to send a batch of tweets set as a JSON object
        needle.post('http://www.sentiment140.com/api/bulkClassifyJson?appid=manuely@uci.edu', JSON.stringify(objRSSMedia),
        function(err, resp, body){
            if (!err) {
              //when response is given, create a new mongoose document for each tweet
              for (var i = 0; i < body.data.length; i++){
                var rssDoc = new Document({
                    id: body.data[i].id,
                    created_at: body.data[i].created_at,
                    user: [{
                      id: null,
                      name: null,
                      screen_name: null,
                      location: null
                    }],
                    title: body.data[i].title,
                    text: body.data[i].text,
                    link: body.data[i].link,
                    source: "RSS",
                    keywords: body.data[i].keywords,
                    polarity: body.data[i].polarity
                });

                // After tweet is saved, send to the client feed
                rssDoc.save(function (err, feed) {
                  if (err) return console.log(err);
                });

              }
            }
            else{
              console.log(err);
            }
        });
      }
    

      //Send message to client
      req.io.emit('rss-route', {
        rssmessage: feed
      });

    });
  }).on('error', function (error) {
    console.log("error while getting feed", error);
  });
}



// Grab recent RSS postings and send them to the feed
function GetRecentRSS(req){
  var query = Document.find({source: "RSS"}).sort({created_at: -1}).limit(35);
  query.exec(function(err, recentRSS) {
    if (err) console.log(err);
    req.io.emit('rssPosting-route', {
      recentRSS: recentRSS
    });
  });
}

// Analyze sentiment for facebook public status update posts and save posts to db
function AnalyzeFacebookSentiment(facebookItems){
  var objFbPosts = {data: facebookItems};
  if (facebookItems.length > 0){
    // Use HTTP Post to send a batch of facebookItems set as a JSON object
    needle.post('http://www.sentiment140.com/api/bulkClassifyJson?appid=manuely@uci.edu', JSON.stringify(objFbPosts),
    function(err, resp, body){
        if (!err) {
          //when response is given, create a new mongoose document for each tweet
          for (var i = 0; i < body.data.length; i++){
            var FbPosting = new Document({
                id: body.data[i].id,
                created_at: body.data[i].created_at,
                user: [{
                  id: body.data[i].user[0].id,
                  name: body.data[i].user[0].name,
                  screen_name: null,
                  location: null
                }],
                title: body.data[i].title,
                text: body.data[i].text,
                link: null,
                source: "facebook",
                keywords: body.data[i].keywords,
                polarity: body.data[i].polarity
            });
            // console.log("shortened after sentiment: "+body.data[i].title);
            // console.log(FbPosting);

            // After tweet is saved, send to the client feed
            FbPosting.save(function (err, facebook) {
              if (err) return console.log(err);
              else
                console.log("Facebook sentiment success");
            });
          }
        }
        else{
          console.log(err);
        }
    });
  }
}

  // Grab recent facebook posts from db and send them to the feed
  function GetRecentfbposts(req){
    var query = Document.find({source:"facebook"}).sort({created_at: -1}).limit(35);
    query.exec(function(err, recentfbposts) {
      if (err)
        console.log(err);
      req.io.emit('facebook-route', {
        recentfbposts: recentfbposts
      });
    });
  }

// Get facebook public status update posts and save them to db
function GetFacebook(){
  var facebookKeyword = "";
    for (var i = 0; i < config.keywords.length; i++){
      facebookKeyword += config.keywords[i]+" ";
    }
    // console.log("facebookKeyword : "+facebookKeyword);
  var facebookUrl = config.facebookURL.facebook+'&access_token='+config.facebookCredentials.access_token+'&q='+facebookKeyword;
  var facebookItems = [];

  https.get(facebookUrl, function (res) {
    var body = "";

    res.on('data', function (chunk) {
      body += chunk;
    });

    res.on('end', function () {
      // Got all response, now parsing...

      if (!body || res.statusCode !== 200){
        return console.error(err);
      }
        //return callback({message: "Invalid Feed"});

        var json = JSON.parse(body);
        // var key, count = 0;
        // for(key in json.data) {
        //   if(json.data.hasOwnProperty(key)) {
        //     count++;
        //   }
        // }
        // console.log("json length : "+count);


        json.data.filter(function (post){
          if(post.type == "status"){

            var fbPosting = new Document({
              id: post.id,
              created_at: post.created_time,
              user: [{
                id: post.from.id,
                name: post.from.name,
                screen_name: null,
                location: null
              }],
              title: null,
              text: post.message,
              link: null,
              source: "facebook",
              keywords: null,
              polarity: null,
            });

            fbPosting.save(function(err,facebook){
              if(err)return console.log(err);
              else
                console.log("parsed Facebook success");
            });

            // facebookItems.push(fbPosting);

            // console.log(fbPosting);
          }

        });

        //--Verify end of function statement--
        // if(facebookItems.length == 0)
        //   console.log("No facebook items added!");

      });

});
}

  // Grab recent facebook posts from db and send them to the feed
  function GetRecentfbposts(req){
    var query = Document.find({source:"facebook"}).sort({created_at: -1}).limit(35);
    query.exec(function(err, recentfbposts) {
      if (err)
        console.log(err);
      req.io.emit('facebook-route', {
        recentfbposts: recentfbposts
      });
    });
  }

  // Grab recent Media and send them to the feed
  function GetRecentMedia(req){
    //get and send recent twitter
    var query = Document.find({source:"twitter"}).sort({created_at: -1}).limit(35);
    query.exec(function(err, recent_twitter) {
      if (err) {
        console.log(err);
      }

      req.io.emit('media-route', {
        recentMedia: recent_twitter
      })
    });

    //get and send recent facebook posts
    var query = Document.find({source:"facebook"}).sort({created_at: -1}).limit(35);
    query.exec(function(err, recentfbposts) {
      if (err) {
        console.log(err);
      }

      req.io.emit('media-route', {
        recentMedia: recentfbposts
      });
    });

    // get and send recent RSS posts
    var query = Document.find({source: "RSS"}).sort({created_at: -1}).limit(35);
    query.exec(function(err, recentRSS) {
      if (err) console.log(err);
      req.io.emit('media-route', {
        recentMedia: recentRSS
      });
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


// Get analytics from sentiment data
var twitter_percent = 0.0;
var facebook_percent = 0.0;
var rss_percent = 0.0;
var total_posts = 0;
function GetSourcePercentage(req){

  // aren't we getting this total elsewhere?
  Document.count({}, function(err, count) {
    if (err) return console.error(err);
    total_posts = count;
  });


  Document.count({source: 'twitter' }, function(err, count) {
    if (err) return console.error(err);
    twitter_percent = (count/total_posts)*100;
  });

  Document.count({source: 'facebook' }, function(err, count) {
    if (err) return console.error(err);
    facebook_percent = (count/total_posts)*100;
  });

  Document.count({source: 'RSS' }, function(err, count) {
    if (err) return console.error(err);
    rss_percent = (count/total_posts)*100;
  });

/*
  console.log('twitter percent:' + twitter_percent)
  console.log('facebook percent:' + facebook_percent)
  console.log('rss percent:' + rss_percent)
*/

  //Send message to client
  req.io.emit('source-percent-route', {
    twitter_percent: twitter_percent,
    facebook_percent: facebook_percent,
    rss_percent: rss_percent
  });
}



// Get analytics from sentiment data
  var earliest_date = "";
  var latest_date = "";
  var days = 0;
function GetCollectionDuration(req) {


  /*
    var query = Document.find({source: "RSS"}).sort({created_at: -1}).limit(35);
    query.exec(function(err, recentRSS) {
      */

  var query = Document.find({created_at: {$gt: '1900-01-01T00:00:24Z'}}).sort({created_at: 1}).limit(1);
  query.exec(function(err, earliest_record) {
    if (err) return console.error(err);
    earliest_date = new Date(earliest_record[0].created_at);
    //console.log('earliest date: ' + earliest_record[0].created_at);
  });


  var query = Document.find({created_at: {$gt: '1900-01-01T00:00:24Z'}}).sort({created_at: -1}).limit(1);
  query.exec(function(err, latest_record) {
    if (err) return console.error(err);
    latest_date = new Date(latest_record[0].created_at);
    //console.log('latest date: ' + latest_record[0].created_at);
  });

  //get difference of dates by ms and convert to days
  if ((earliest_date instanceof Date) && (latest_date instanceof Date)) {
    //days = +((latest_date.getTime() - earliest_date.getTime()) / 1000 / 60 / 60 / 24).toFixed(2);
    days = Math.round((latest_date.getTime() - earliest_date.getTime()) / 1000 / 60 / 60 / 24);
  }

  //Send message to client
  req.io.emit('collection-info-route', {
    earliest_date: earliest_date,
    latest_date: latest_date,
    days: days
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

// keywords splash page
app.get('/keywords.html', routes.keywords);

//*** Start up the server ***//
app.listen(SERVER_PORT);
