//--- Keywords ---//
exports.keywords = [ 'doctor', 'patients', 'hospital' ];

//--- RSS Feed URLS ---//
exports.rssURLS = {
	ocregister: 'http://www.ocregister.com/common/rss/rss.php?catID=23541',
	latimes: 'http://feeds.latimes.com/latimes/news/local',
};

//--- Twitter Credentials ---//
exports.twitterCredentials = {
    consumer_key:         'Vx1Pgf8UlLKKQtzUdZz95g',
    consumer_secret:      'hMgEz35wGedZOTTQINcijTF6pknyxypNsjHOlk5uAw',
    access_token:         '1551825924-l9sX9eNlTdRnL7UcQHmjAm1oC5gB8TYmynBC2gh',
    access_token_secret:  '9M7yweRLlDGeMcBPHNZTUQssBnlFapmtYzWV4jf2M'
};

//--- RSS Feed ---//
exports.cacheTime = 60 * 60 * 1000; // 1 hour in milliseconds
exports.maxItems = 20; //currently 9 works for OC Register, issue with empty titles (throws error)
