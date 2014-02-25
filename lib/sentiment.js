'use strict';

// spawning a child process and running the stanford nlp code on it.
var spawn = require('child_process').spawn,
		nlp = spawn('java', ['-cp', './lib/stanford-nlp-jars/*', '-mx5g', 'edu.stanford.nlp.sentiment.SentimentPipeline', '-output', 'pennTrees','-stdin']);

process.stdin.pipe(nlp.stdin);

nlp.stdin.on("end", function() {
	process.exit(0);
});

nlp.stderr.on('data', function (data) {
	console.log('stderr: ' + data);
});

exports.getAnalysis = function(sentence) {

	nlp.stdout.on('data', function (data) {
		console.log(data);
	});

	nlp.stdin.write(sentence+"\n");
};