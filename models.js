var mongoose = require('mongoose');
var textSearch = require('mongoose-text-search');

var Schema = mongoose.Schema;

var mediaSchema = new Schema ({
        id: {type: String, index: {unique: true, dropDups: true}},
        created_at: Date,
        user: [{
                id: Number,
                name: String,
                screen_name: String,
                location: String
        }],
        title: String,
        text: String,
        link: String,
        source: String,
        keywords: [],
        polarity: Number
});

// give our schema text search capabilities
mediaSchema.plugin(textSearch);

// add a text index to the tags array
mediaSchema.index({ text: 'text' });

mongoose.model('Media', mediaSchema);

exports.Document = function(db) {
  return db.model('Media');
};