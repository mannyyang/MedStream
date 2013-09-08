var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var twitterSchema = new Schema ({
	id: {type: Number, index: true},
	created_at: Date,
	user: [{
		id: Number,
		name: String,
		screen_name: String,
		location: String
	}],
	text: String,
	hashtags: [String]
});

mongoose.model('Document', twitterSchema);

exports.Document = function(db) {
  return db.model('Document');
};