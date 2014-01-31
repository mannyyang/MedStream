//instantiate app for angular use
var MedStreamApp = angular.module('MedStream', [])
.factory('SocketFactory', function(){

  //instantiate client-side socket connection
  var socket = io.connect();
  socket.emit('ready');
  socket.emit('refresh');
  socket.emit('rssPosting-route');

  
  return socket;

})

.factory('KeywordChartFactory', function(){
  var chart = new Highcharts.Chart({
              chart: {
                  renderTo: 'KeywordChart',
                  type: 'bar'
              },
              title: {text: null},
              legend: {enabled: false},
              credits: {enabled: false},
              xAxis: {
                  labels: {enabled: false}
              },
              yAxis: {
                  min: 0,
                  title: {text: null}
              },
              tooltip: {
              },
              plotOptions: {

              },
              colors: ['#575adc','#e35f24', '#2ba8e2'],
              series: [{
                    name: 'doctor',
                    id: 'doctor',
                    data: [10]
        
                }, {
                    name: 'hospital',
                    id: 'hospital',
                    data: [15]
        
                }, {
                    name: 'patients',
                    id: 'patients',
                    data: [25]
        
                }
              ]
          });

  return chart;
})

.factory('VolumeTimeChartFactory', function(){
  
  var chart = new Highcharts.Chart({
    global: {
      useUTC: false
    },
    chart: {
        renderTo: 'VolumeTimeChart',
        type: 'line'
    },
    title: {text: null},
    legend: {enabled: false},
    credits: {enabled: false},
    xAxis: {
      type: 'datetime'
    },
    yAxis: {
      plotLines: [{
          value: 1,
          width: 1,
          color: '#808080'
      }],
      min: 0,
      title: {
        text: null
      }
    },
    tooltip: {
    },
    series: [
      {
        name: 'TweetsPerSec',
        data: [0, 0, 0,0,0,0,0,0,0,0,0]
      }]
});

return chart;
})

.filter('reverse', function() {
  return function(items) {
    return items.slice().reverse();
  };
});

//---- RSSFEED CONTROLLER -----//
// MedStreamApp.controller('RSSFeedController', function RSSFeedController($scope, SocketFactory) {
//   //instantiate variables
//   $scope.rssfeed = [];

//   // When socket receives rss, add to the recent rss array
//   SocketFactory.on('rss-route', function(data){
//     if ($scope.rssfeed.length > 30)
//     {
//       $scope.rssfeed.shift();
//     }
//     $scope.rssfeed.push(data.rssmessage);
//     $scope.$apply();
//   });
// });

//---- RSSFEED CONTROLLER -----//
MedStreamApp.controller('RSSPostingController', function RSSPostingController($scope, SocketFactory) {
  //instantiate variables
  $scope.rssPostingFeed = [];

  $('#refresh-button').click(function(){
    SocketFactory.emit('refresh-route');
  });

  // When socket receives tweet, add to the recent tweet array
  SocketFactory.on('rssPosting-route', function(data){
    $scope.rssPostingFeed = data.recentRSS;
    $scope.$apply();
  });
});

//---- FEED CONTROLLER -----//
MedStreamApp.controller('FeedController', function FeedController($scope, SocketFactory) {
  //instantiate variables
  $scope.twitterfeed = [];

  $('#refresh-button').click(function(){
    SocketFactory.emit('refresh-route');
  });

  // When socket receives tweet, add to the recent tweet array
  SocketFactory.on('tweet-route', function(data){
    $scope.twitterfeed = data.recentTweets;
    $scope.$apply();
  });
});

//---- Facebook FEED CONTROLLER -----//
MedStreamApp.controller('FacebookFeedController', function FacebookFeedController($scope, SocketFactory) {
  //instantiate variables
  $scope.facebookfeed = [];

  $('#refreshfb-button').click(function(){
    SocketFactory.emit('refreshfb-route');
  });

  // When socket receives fb post, add to the recent post array
  SocketFactory.on('facebook-route', function(data){
    // $scope.facebookfeed = data.recentfbposts;
    $scope.facebookfeed = data.recentfbposts;
    $scope.$apply();
  });
});

//---- TOTAL TWEETS CONTROLLER -----//
MedStreamApp.controller('TotalTweetsController', function TotalTweetsController($scope, SocketFactory) {
  //instantiate variables
  $scope.totalTweets = 0;
  $scope.todaysTweets = 0;

  // When socket receives tweet, add to the recent tweet array
  SocketFactory.on('total-tweets-route', function(data){
    $scope.totalTweets = data.totalTweets;
    $scope.todaysTweets = data.todaysTweets;
    $scope.$apply();
  });

});

//---- KEYWORD CHART CONTROLLER -----//
MedStreamApp.controller('KeywordChartController', function KeywordChartController($scope, SocketFactory, KeywordChartFactory) {
  // When socket receives tweet, add to the recent tweet array
  SocketFactory.on('keywords-route', function(data){
    KeywordChartFactory.get('doctor').setData([data.keywordOne]);
    KeywordChartFactory.get('hospital').setData([data.keywordTwo]);
    KeywordChartFactory.get('patients').setData([data.keywordThree]);
    KeywordChartFactory.redraw();
  });

});

//---- VOLUME TIME CHART CONTROLLER -----//
MedStreamApp.controller('VolumeTimeChartController', function VolumeTimeChartController($scope, SocketFactory, VolumeTimeChartFactory) {
  // When socket receives tweet, add to the recent tweet array
  var newData = [];
  SocketFactory.on('volume-time-route', function(data){
    VolumeTimeChartFactory.series[0].addPoint([data.todaysTime, data.countPerInterval], true, true);
  });
});

//---- FEED CONTROLLER -----//
MedStreamApp.controller('SearchController', function SearchController($scope, SocketFactory) {
  //instantiate variables
  $scope.searchresults = [];

  $('#search-button').click(function(){
    var searchWord = $('#SearchContainer input').val();
    SocketFactory.emit('search-route', searchWord);
  });

  $(document).keypress(function(e) {
    if(e.which == 13) {
        var searchWord = $('#SearchContainer input').val();
        if (searchWord.length > 0) {
          SocketFactory.emit('search-route', searchWord);
        }
    }
});

  // When socket receives tweet, add to the recent tweet array
  SocketFactory.on('search-result-route', function(data){
    $scope.searchresults = data.searchresults;
    $scope.$apply();
  });
});