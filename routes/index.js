
/*
 * GET home page.
 */
var dir = __dirname.substring(0, __dirname.length-7);

exports.index = function(req, res){
  res.sendfile(dir + '/views/index.html');
};