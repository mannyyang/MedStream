var express = require('express')
  , app = express()
  , http = require('http')
  , server = http.createServer(app)
  ,Twit = require('twit')
  , io = require('socket.io').listen(server);

server.listen(8080);

// routing
app.get('/', function (req, res) {
res.sendfile(__dirname + '/index.html');
});

 var T = new Twit({
    consumer_key:         'Vx1Pgf8UlLKKQtzUdZz95g'
  , consumer_secret:      'hMgEz35wGedZOTTQINcijTF6pknyxypNsjHOlk5uAw'
  , access_token:         '1551825924-l9sX9eNlTdRnL7UcQHmjAm1oC5gB8TYmynBC2gh'
  , access_token_secret:  '9M7yweRLlDGeMcBPHNZTUQssBnlFapmtYzWV4jf2M'
})

io.sockets.on('connection', function (socket) {
  console.log('Connected');


 T.get('search/tweets', { q: 'ucihealth since:2011-11-11', count: 100 }, function(err, reply) {
  io.sockets.emit('tweets', reply);
  });
 
 });

