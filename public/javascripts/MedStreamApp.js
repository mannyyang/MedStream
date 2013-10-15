//instantiate app for angular use
var MedStreamApp = angular.module('MedStream', [])
  .factory('SocketFactory', function(){

    //instantiate client-side socket connection
    return io.connect();

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
MedStreamApp.controller('TotalTweetsController', function FeedController($scope, SocketFactory) {
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