//instantiate app for angular use
var MedStreamApp = angular.module('MedStream', [])
.factory('SocketFactory', function(){

  //instantiate client-side socket connection
  var socket = io.connect();
  socket.emit('ready');
  socket.emit('refresh');
  socket.emit('rss-route');
  socket.emit('rssPosting-route');  
  return socket;
})

.factory('KeywordChartFactory', function(){
  /*
    ToDo
    - need to bootstrap this in a way that doesn't require hard coding the series values of 'dcotor', 'patient', etc.
  */
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
              colors: ['#575adc','#e35f24', '#2ba8e2', '#2ba8e2'],
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
        
                }, {
                    name: 'victim',
                    id: 'victim',
                    data: [5]
        
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
      type: 'category'
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
        data: [0,0,0,0,0,0,0,0,0,0]
      }]
});

return chart;
})

.filter('reverse', function() {
  return function(items) {
    return items.slice().reverse();
  };
});

//---- ALLMEDIAFEED CONTROLLER -----//
MedStreamApp.controller('AllMediaController', function AllMediaController($scope, SocketFactory) {
  //instantiate variables
  $scope.allMediaFeed = [];

  //this should be read in from somewhere...
  var max_recent_post_count = 140;

  $('#refresh-button').click(function(){
    SocketFactory.emit('refresh-route');
  });

  // When socket receives tweet, add to the recent tweet array
  SocketFactory.on('media-route', function(data){
    //console.log('data: ' + JSON.stringify(data));

    //$scope.allMediaFeed = data.recentMedia;

    for (var item in data.recentMedia) {
      $scope.allMediaFeed.push(data.recentMedia[item]);

      if ($scope.allMediaFeed.length > max_recent_post_count) {
        $scope.allMediaFeed.shift();
        console.log('removing something...');
      }
    }


    $scope.$apply();
  });
});

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

// //---- TOTAL RSS CONTROLLER -----//
// MedStreamApp.controller('TotalRSSController', function TotalRSSController($scope, SocketFactory) {
//   //instantiate variables
//   $scope.totalRSS = 0;
//   $scope.todaysRSS = 0;

//   // When socket receives tweet, add to the recent tweet array
//   SocketFactory.on('total-rss-route', function(data){
//     $scope.totalRSS = data.totalRSS;
//     $scope.todaysRSS = data.todaysRSS;
//     $scope.$apply();
//   });

// });

//---- TOTALS CONTROLLER -----//
MedStreamApp.controller('TotalsController', function TotalsController($scope, SocketFactory) {
  //instantiate variables
  $scope.totalTweets = 0;
  $scope.todaysTweets = 0;
  $scope.totalRSS = 0;
  $scope.todaysRSS = 0;
  $scope.totalFacebook = 0;
  $scope.todaysFacebook = 0;

  // When socket receives tweet, add to the recent tweet array
  SocketFactory.on('totals-route', function(data){
    $scope.totalTweets = data.totalTweets;
    $scope.todaysTweets = data.todaysTweets;

    $scope.totalRSS = data.totalRSS;
    $scope.todaysRSS = data.todaysRSS;

    $scope.totalFacebook = data.totalFacebook;
    $scope.todaysFacebook = data.todaysFacebook;

    $scope.$apply();
  });

});

//---- FEED CONTROLLER -----//
MedStreamApp.controller('FeedController', function FeedController($scope, SocketFactory) {
  //instantiate variables
  $scope.twitterfeed = [];
/*
  $('#refresh-button').click(function(){
    SocketFactory.emit('refresh-route');
  });

  // When socket receives tweet, add to the recent tweet array
  SocketFactory.on('tweet-route', function(data){
    $scope.twitterfeed = data.recentTweets;
    $scope.$apply();
  });
*/
});

//---- Facebook FEED CONTROLLER -----//
MedStreamApp.controller('FacebookFeedController', function FacebookFeedController($scope, SocketFactory) {
  //instantiate variables
  $scope.facebookfeed = [];

  $('#refresh-button').click(function(){
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
// MedStreamApp.controller('TotalTweetsController', function TotalTweetsController($scope, SocketFactory) {
//   //instantiate variables
//   $scope.totalTweets = 0;
//   $scope.todaysTweets = 0;

//   // When socket receives tweet, add to the recent tweet array
//   SocketFactory.on('total-tweets-route', function(data){
//     $scope.totalTweets = data.totalTweets;
//     $scope.todaysTweets = data.todaysTweets;
//     $scope.$apply();
//   });

// });

//---- KEYWORD CHART CONTROLLER -----//
MedStreamApp.controller('KeywordChartController', function KeywordChartController($scope, SocketFactory, KeywordChartFactory) {
  // When socket receives tweet, add to the recent tweet array
  SocketFactory.on('keywords-route', function(data){

    for (var i = 0; i < data.keywordList.length; i++){
      var newData = [];

      newData.push(data.keywordPercentages[data.keywordList[i]]);

      KeywordChartFactory.get(data.keywordList[i]).setData(newData); 
    }

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

//---- Search CONTROLLER -----//
MedStreamApp.controller('SearchController', function SearchController($scope, SocketFactory) {
  //instantiate variables
  $scope.searchresults = [];
  $scope.searchWord = "";

  $('#search-button').click(function(){
    $scope.searchWord = $('#SearchContainer input').val();
    SocketFactory.emit('search-route', $scope.searchWord);
  });

  $(document).keypress(function(e) {
    if(e.which == 13) {
        $scope.searchWord = $('#SearchContainer input').val();
        if ($scope.searchWord.length > 0) {
          SocketFactory.emit('search-route', $scope.searchWord);
        }
    }
});

  // When socket receives tweet, add to the recent tweet array
  SocketFactory.on('search-route', function(data){
    $scope.searchresults = data.searchresults;
    $scope.$apply();
  });
});