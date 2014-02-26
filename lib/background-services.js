module.exports = function(config, sentiment) {

	require('./social-media/twitter')(config, sentiment);
	
};