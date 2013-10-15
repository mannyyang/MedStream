//instantiate app for angular use
var MedStreamApp = angular.module('MedStream', [])
  .factory('SocketFactory', function(){

    //instantiate client-side socket connection
    return io.connect();

  })
  .factory('KeywordChartFactory', function(){

    //instantiate chart.js
    //Get context with jQuery - using jQuery's .get() method.
    return $("#KeywordChart").get(0).getContext("2d");

  })
  .filter('reverse', function() {
    return function(items) {
      return items.slice().reverse();
    };
  });

//---- FEED CONTROLLER -----//
MedStreamApp.controller('FeedController', function FeedController($scope, SocketFactory) {
  // send ready signal to server.
  SocketFactory.emit('ready');

  //instantiate variables
  $scope.twitterfeed = [];

  // When socket receives tweet, add to the recent tweet array
  SocketFactory.on('tweet-route', function(data){
    if ($scope.twitterfeed.length > 20)
    {
      $scope.twitterfeed.shift();
    }
    $scope.twitterfeed.push(data.message);
    $scope.$apply();
  });
});

//---- TOTAL TWEETS CONTROLLER -----//
MedStreamApp.controller('TotalTweetsController', function TotalTweetsController($scope, SocketFactory) {
  // send ready signal to server.
  SocketFactory.emit('ready');

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
  // send ready signal to server.
  SocketFactory.emit('ready');

  // When socket receives tweet, add to the recent tweet array
  SocketFactory.on('keywords-route', function(data){
      // instantiate data
      var chartData = {
        labels : ["money", "cash", "dollars"],
        datasets : [
          {
            fillColor : "rgba(220,220,220,0.5)",
            strokeColor : "rgba(220,220,220,1)",
            data : [0, 0, 2]
          }
        ]
      };

    chartData.datasets[0].data = [data.moneyPer, data.cashPer, data.dollarsPer];
    new Chart(KeywordChartFactory).Bar(chartData);
  });

});