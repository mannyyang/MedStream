'use strict';

var mongoose = require('mongoose'),
    Thing = mongoose.model('Thing');

/**
 * Get awesome things
 */
function api(io){

  api.awesomeThings = function(req, res) {
	  return Thing.find(function (err, things) {
	    if (!err) {
	      return res.json(things);
	    } else {
	      return res.send(err);
	    }
	  });
	};

  return api;
}

module.exports = api;