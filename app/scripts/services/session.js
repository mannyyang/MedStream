'use strict';

angular.module('medStreamApp')
  .factory('Session', function ($resource) {
    return $resource('/api/session/');
  });
