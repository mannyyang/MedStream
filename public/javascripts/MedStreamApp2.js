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
                  type: 'column'
              },
              title: {text: null},
              legend: {enabled: false},
              credits: {enabled: false},
              colors: ['#575adc','#e35f24', '#2ba8e2', '#2ba8e2'],
              xAxis: {
                labels: {enabled: true},
                categories: ['doctor', 'hospital', 'patients', 'victim']
              },
              yAxis: {
                  min: 0,
                  title: {text: null}
              },
              tooltip: {
              },
              plotOptions: {
                  series: {colorByPoint: true}
              },
              
              series: [{
                    data: [0, 0, 0, 0]
                  }
              ]
          });

  return chart;
})

.factory('SentimentChartFactory', function(){
  /*
    ToDo
    - need to bootstrap this in a way that doesn't require hard coding the series values
  */
  var chart = new Highcharts.Chart({
              chart: {
                  renderTo: 'SentimentChart',
                  type: 'column'
              },
              title: {text: null},
              legend: {enabled: false},
              credits: {enabled: false},
              colors: ['#12bb2a','#c5c5c5', '#e62d15'],
              xAxis: {
                labels: {enabled: true},
                categories: ['positive', 'neutral', 'negative']
              },
              yAxis: {
                  min: 0,
                  title: {text: null}
              },
              tooltip: {
              },
              plotOptions: {
                  series: {colorByPoint: true}
              },
              
              series: [{
                    data: [0, 0, 0]
                  }
              ]
          });

  return chart;
})



.factory('SourceChartFactory', function(){
  /*
    ToDo
    - need to bootstrap this in a way that doesn't require hard coding the series values
  */
  var chart = new Highcharts.Chart({
              chart: {
                  renderTo: 'SourceChart',
                  type: 'column'
              },
              title: {text: null},
              legend: {enabled: false},
              credits: {enabled: false},
              colors: ['#3cf','#3b5998', '#e4713e'],
              xAxis: {
                labels: {enabled: true},
                categories: ['twitter', 'facebook', 'rss']
              },
              yAxis: {
                  min: 0,
                  title: {text: null}
              },
              tooltip: {
              },
              plotOptions: {
                  series: {colorByPoint: true}
              },
              
              series: [{
                    data: [0, 0, 0]
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
        type: 'area'
    },
    title: {text: null},
    legend: {enabled: false},
    credits: {enabled: false},
    plotOptions: {
      area: {
        fillColor: "#c0deed"
      },
      lineWidth: 1
    },
    colors : ['#3cf'],
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
        name: 'Tweets per Interval',
        data: [0,0,0,0,0,0,0,0,0,0,0,0,0]
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

    for (var item in data.recentMedia) {
      $scope.allMediaFeed.push(data.recentMedia[item]);

      if ($scope.allMediaFeed.length > max_recent_post_count) {
        $scope.allMediaFeed.shift();
        //console.log('removing something...');
      }
    }


    $scope.$apply();


    $scope.concatKeywords = function(arr) {
      //ToDo: build entire class string here
      var str = "";
      for (var thing in arr) {
        str += arr[thing].toLowerCase() + " "
        //$scope.filters_source.push(arr[thing], 1)
      }
      return str;
    }
  });
});



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

//---- Collection Info Controller -----//
// NOT FINISHED
MedStreamApp.controller('CollectionInfoController', function CollectionInfoController($scope, SocketFactory) {
/*
  $('#refresh-button').click(function(){
    SocketFactory.emit('refresh-route');
  });
*/

  $scope.duration = 0;
  $scope.begin_date = '';
  $scope.end_date = '';

  // When socket receives tweet, add to the recent tweet array
  SocketFactory.on('collection-info-route', function(data){
      console.log('collection info: ' + JSON.stringify(data));
      $scope.duration = data.days;
      $scope.begin_date = data.earliest_date;
      $scope.end_date = data.latest_date;
  });
});


//---- Client Config Controller -----//
// retrieve client config data from server
// NOT FINISHED
MedStreamApp.controller('ClientConfigController', function ClientConfigController($scope, SocketFactory) {
/*
  $('#refresh-button').click(function(){
    SocketFactory.emit('refresh-route');
  });
*/

  console.log('inside ClientConfigController');

  // When socket receives tweet, add to the recent tweet array
  SocketFactory.on('client-config-route', function(data){
      //console.log('client config: ' + JSON.stringify(data));
  });
});



//---- Sentiment CHART CONTROLLER -----//
MedStreamApp.controller('SentimentChartController', function SentimentChartController($scope, SocketFactory, SentimentChartFactory) {
  // When socket receives tweet, add the data to array and then to chart, redraw
  SocketFactory.on('sentiments-route', function(data){

    var newData = [Math.round(data.positive), Math.round(data.neutral), Math.round(data.negative)];
    SentimentChartFactory.series[0].setData(newData);
    SentimentChartFactory.redraw();
  });
});


//---- Source CHART CONTROLLER -----//
MedStreamApp.controller('SourceChartController', function SentimentChartController($scope, SocketFactory, SourceChartFactory) {
  // When socket receives tweet, add the data to array and then to chart, redraw
  SocketFactory.on('source-percent-route', function(data){

    var newData = [Math.round(data.twitter_percent), Math.round(data.facebook_percent), Math.round(data.rss_percent)];

    //console.log('newData[]' + JSON.stringify(newData))

    SourceChartFactory.series[0].setData(newData);
    SourceChartFactory.redraw();
  });
});


//---- KEYWORD CHART CONTROLLER -----//
MedStreamApp.controller('KeywordChartController', function KeywordChartController($scope, SocketFactory, KeywordChartFactory) {
  // When socket receives tweet, add to the recent tweet array
  SocketFactory.on('keywords-route', function(data){

    //console.log('keyword data: ' + JSON.stringify(data.keywordList));

    // set the categories according to what the server sends us
    KeywordChartFactory.xAxis[0].setCategories(data.keywordList.sort());

    var newData = [];
    for (var i = 0; i < data.keywordList.length; i++){


      //><><>< debug
      //console.log('key: ' + data.keywordList[i] + ', val: ' + data.keywordPercentages[data.keywordList[i]]);

      newData.push(Math.round(data.keywordPercentages[data.keywordList[i]]));

      //KeywordChartFactory.get(data.keywordList[i]).setData(newData);
    }

    //console.log('newData[]' + JSON.stringify(newData))

    KeywordChartFactory.series[0].setData(newData);

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

// store the filter values selected by user
MedStreamApp.controller('FilterController', function Filtercontroller($scope) {
  $scope.filters_source = [];
});
