var mongoose = require('mongoose');
var textSearch = require('mongoose-text-search');

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

// give our schema text search capabilities
twitterSchema.plugin(textSearch);

// add a text index to the tags array
twitterSchema.index({ text: 'text' });

mongoose.model('Tweets', twitterSchema);

exports.Document = function(db) {
  return db.model('Tweets');
};