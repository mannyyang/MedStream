//instantiate app for angular use
var KeywordsSubmitApp = angular.module('KeywordsSubmitApp', [])
.factory('SocketFactory', function(){
  //instantiate client-side socket connection
  var socket = io.connect("wss://localhost");
  
  return socket;
});

KeywordsSubmitApp.controller('KeywordsSubmitController', function KeywordsSubmitController($scope, SocketFactory) {
  //instantiate variables
  $scope.submittedKeywords = [];
  $scope.keywords = "";

  $('#keywordSubmit-button').click(function(){
    $scope.keywords = $('#search input').val();
    $scope.submittedKeywords = $scope.keywords.split(",");

    SocketFactory.emit('client-submit-route', {
      keywords: $scope.submittedKeywords
    });
  });

});