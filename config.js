//--- Keywords ---//
exports.keywords = [];

//--- RSS Feed URLS ---//
exports.rssURLS = {
	ocregister: 'http://www.ocregister.com/common/rss/rss.php?catID=23541',
	latimes: 'http://feeds.latimes.com/latimes/news/local',
};

//--- Facebook Feed URL ---//
exports.facebookURL = {
	facebook: 'https://graph.facebook.com/search?type=post&metadata=true'
};

//--- Facebook Credentials ---//
exports.facebookCredentials = {
	access_token: '321837561287973|PjQbEttq8t3K5gt20_2lWHgj5gg'
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
exports.maxItems = 50; 

// appearance config
exports.client_config = {
	keywords: {
				values: [ 'doctor', 'patients', 'hospital' , 'victim'],
				color: {'doctor': '#575adc', 'patients' : '#2BA8E2', 'hospital' : '#E35F24', 'victim' : '#2BA8E2', 'default' : '#800'}
			  }

}