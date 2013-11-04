var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var twitterSchema = new Schema ({
	id: {type: Number, index: {unique: true, dropDups: true}},
	created_at: Date,
	user: [{
		id: Number,
		name: String,
		screen_name: String,
		location: String
	}],
	text: String,
	keywords: [],
	polarity: Number
});

mongoose.model('Tweets', twitterSchema);

exports.Document = function(db) {
  return db.model('Tweets');
};