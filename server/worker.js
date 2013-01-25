var utils = require('./utils/common.js'),
	cm = require('./comunicationModule.js').CM(this, process.argv[2], process.argv[3], '001qryC01001');

cm.ready();

this.a = function(first, second, callback){
	console.log(arguments)
	console.log('a')
	callback(null, first + second);	
}

this.b = function(first, callback){
	console.log('b')
	if(typeof(callback) != 'function')
		return arguments[arguments.length - 1]('Error: only one arguments', null);
	callback(null, first*first);
}

