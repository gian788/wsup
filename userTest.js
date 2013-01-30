var user = require('/srv/server/lib/controllers/user');
var utils = require('./utils/common');

var count = 0,
	num = 400;

var cb = function(){
	if(++count==num){
		var end = utils.time();
		var elapsed = end - start;
		var thr = num / (elapsed / 1000);
		console.log(elapsed, 'ms', thr, 'm/s');
		return;
	}
	if(count % 100 == 0)
		console.log(count/100)
}

var start = utils.time();
for(var i = 0; i < num; i++){
	user.get({_id:115513}, {}, cb);
	if(i % 100 == 0)
		console.log(i/100)
}