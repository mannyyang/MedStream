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

  $("#insertKeywords").click(function(){
    $scope.submittedKeywords = $("#keywordTags").tagit("assignedTags");
    
    SocketFactory.emit('client-submit-route', {
      keywords: $scope.submittedKeywords
    });

    $('.form-wrapper img').show();
  });

  SocketFactory.on('client-submit-route', function(){
    window.location.href = "/index2.html";
  });

});