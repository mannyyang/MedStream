//instantiate app for angular use
var MedStreamApp = angular.module('MedStream', [])
.factory('SocketFactory', function(){

  //instantiate client-side socket connection
  var socket = io.connect();
  socket.emit('ready');
  
  return socket;

})
.factory('KeywordChartFactory', function(){

  var data = [ ["doctor", 0], ["hospital", 0], ["patients", 0] ];

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
      max: 60
    }
  });

  return plot;

})
.factory('VolumeTimeChartFactory', function(){

  var data = [];

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
      max: 10
    }
  });

  return plot;

})
.filter('reverse', function() {
  return function(items) {
    return items.slice().reverse();
  };
});

//---- FEED CONTROLLER -----//
MedStreamApp.controller('FeedController', function FeedController($scope, SocketFactory) {
  //instantiate variables
  $scope.twitterfeed = [];

  // When socket receives tweet, add to the recent tweet array
  SocketFactory.on('tweet-route', function(data){
    if ($scope.twitterfeed.length > 30)
    {
      $scope.twitterfeed.shift();
    }
    $scope.twitterfeed.push(data.message);
    $scope.$apply();
  });
});

//---- TOTAL TWEETS CONTROLLER -----//
MedStreamApp.controller('TotalTweetsController', function TotalTweetsController($scope, SocketFactory) {
  //instantiate variables
  $scope.totalTweets = 0;

  // When socket receives tweet, add to the recent tweet array
  SocketFactory.on('total-tweets-route', function(data){
    $scope.totalTweets = data.message;
    $scope.$apply();
  });
});

//---- KEYWORD CHART CONTROLLER -----//
MedStreamApp.controller('KeywordChartController', function KeywordChartController($scope, SocketFactory, KeywordChartFactory) {
  // When socket receives tweet, add to the recent tweet array
  SocketFactory.on('keywords-route', function(data){
    var newData = [ ["doctor", data.keywordOne], ["hospital", data.keywordTwo], ["patients", data.keywordThree] ];
    KeywordChartFactory.setData([ newData ]);
    KeywordChartFactory.draw();
  });

});

//---- KEYWORD CHART CONTROLLER -----//
MedStreamApp.controller('VolumeTimeChartController', function VolumeTimeChartController($scope, SocketFactory, VolumeTimeChartFactory) {
  // When socket receives tweet, add to the recent tweet array
  var newData = [];
  SocketFactory.on('volume-time-route', function(data){
    if (newData.length > 10)
    {
      newData.shift();
    }
    newData.push( [data.todaysTime, data.countPerSec] );
    VolumeTimeChartFactory.setData([ newData ]);
    VolumeTimeChartFactory.setupGrid();
    VolumeTimeChartFactory.draw();
  });

});