'use strict';

function FeedController($scope) {
  var socket = io.connect();
  socket.on('tweets', function(tweet){
    $scope.twitterfeed = tweet;
    $scope.$apply();
  });

  // $scope.inputfeeds = function(){
  //   angular.forEach(tweets, function(tweet){
  //     $scope.twitterfeed.push(tweet);
  //   });
  // };
  // $scope.initializeFeed = function(tweet) {
  //   $scope.feed.push(tweet);
  // };
}