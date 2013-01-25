var modConf = require('./direct_query/modulesConfig.js');

var controller = [];

var fn = function(service, func, args, user, callback){
	if(!controller[service])
		controller[service] = require(modConf.getControllerPath(service));

	controller[service][func](args, user, callback);
}

exports.fn = fn;