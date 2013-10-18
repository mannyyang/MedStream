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
      xaxis: {
        mode: "categories",
        tickLength: 0
      },
      yaxis: {
        min: 0,
        max: 60
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