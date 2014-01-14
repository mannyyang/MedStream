//instantiate app for angular use
var MedStreamApp = angular.module('MedStream', [])
.factory('SocketFactory', function(){

  //instantiate client-side socket connection
  var socket = io.connect();
  socket.emit('ready');
  socket.emit('refresh');
  
  return socket;

})
.factory('KeywordChartFactory', function(){

  var data = [];

  //instantiate flot.js
  var plot = $.plot("#KeywordChart", [ data ], {
    series: {
      bars: {
        show: true,
        barWidth: 0.5,
        align: "center"
      }
    },
    grid: {
      labelMargin: 25
    },
    xaxis: {
      mode: "categories",
      tickLength: 0,
      min: -.5,
      max: 2.5
    },
    yaxis: {
      min: 0,
      max: 75
    }
  });

  return plot;

})
.factory('VolumeTimeChartFactory', function(){

  var data = [[]];

  //instantiate flot.js
  var plot = $.plot("#VolumeTimeChart", [ data ], {
    series: {
      lines: { show: true, fill: true },
      points: { show: true }
    },
    xaxis: {
      mode: "categories",
    },
    yaxis: {
      min: 0,
    }
  });

  $('#VolumeTimeChart').resize();

  return plot;

})
.filter('reverse', function() {
  return function(items) {
    return items.slice().reverse();
  };
});

//---- RSSFEED CONTROLLER -----//
MedStreamApp.controller('RSSFeedController', function RSSFeedController($scope, SocketFactory) {
  //instantiate variables
  $scope.rssfeed = [];

  // When socket receives rss, add to the recent rss array
  SocketFactory.on('rss-route', function(data){
    if ($scope.rssfeed.length > 30)
    {
      $scope.rssfeed.shift();
    }
    $scope.rssfeed.push(data.rssmessage);
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
    var newData = [];

    for (var i = 0; i < data.keywordList.length; i++){
      var dataPoint = [];

      dataPoint[0] = data.keywordList[i];
      dataPoint[1] = data.keywordPercentages[data.keywordList[i]];

      newData.push([dataPoint]);
    }

    KeywordChartFactory.setData(newData);
    KeywordChartFactory.draw();
    $('#KeywordChart').resize();
  });

});

//---- VOLUME TIME CHART CONTROLLER -----//
MedStreamApp.controller('VolumeTimeChartController', function VolumeTimeChartController($scope, SocketFactory, VolumeTimeChartFactory) {
  // When socket receives tweet, add to the recent tweet array
  var newData = [];
  SocketFactory.on('volume-time-route', function(data){
    if (newData.length > 10)
    {
      newData.shift();
    }
    newData.push( [data.todaysTime, data.countPerInterval] );
    VolumeTimeChartFactory.setData([ newData ]);
    VolumeTimeChartFactory.setupGrid();
    VolumeTimeChartFactory.draw();
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