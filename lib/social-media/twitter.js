'use strict';

var mongoose = require('mongoose'),
    Media = mongoose.model('Media');

var twitter = require('twit');

/**
 * Stream twitter feed filtered by keywords, then
 * run sentiment analysis on each tweet, then add
 * it to the database
 */
module.exports = function(config, sentiment) {
// Start Twitter Feed

	// Set Twitter API key, token, & secret
	var T = new twitter(config.twitterCredentials);

	// Setting up the twitter stream
  var stream = T.stream('statuses/filter', { track: config.keywords });
  stream.on('tweet', function (tweet) {

    // search the twitter text to see if it matches any of the keywords
    var text = tweet.text.toLowerCase();
    var keywords = [];

    for (var i = 0; i < config.keywords.length; i++){
      if (text.search(config.keywords[i]) !== -1){
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

    sentiment.nlpStdIn.write(tweet.text+'\n');
 	 	sentiment.nlpStdOut.once('data', function (data) {
	  	console.log(tweet.text);
			console.log(data+'');
		});

  });

 

// End Twitter Feed
};
