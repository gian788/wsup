var servers = require('../config/servers.js');

var defaultPermision = 1; 

var controllers = {
	'career': true,
	'class': true,
	'degreeprogram': true,
	'document': true,
	'invite': true,
	'notifications': true,
	'poll': true,
	'post': true,
	'registration': true,
	'report':true,
	'search': true,
	'topic': true,
	'university': true,
	'user': true,
	'group': true,
	'professor': true,
	'statistic': true,

	'neoLib': true,
	};

var controllersPath = {
	'career': servers.LIB.controllersPath + 'career.js',
	'class': servers.LIB.controllersPath + 'class.js',
	'degreeprogram': servers.LIB.controllersPath + 'degreeprogram.js',
	'document': servers.LIB.controllersPath + 'document.js',
	'notifications': servers.LIB.controllersPath + 'notifications.js',
	'history': servers.LIB.controllersPath + 'history.js',
	'invite': servers.LIB.controllersPath + 'invitation.js',
	'poll': servers.LIB.controllersPath + 'poll.js',
	'post': servers.LIB.controllersPath + 'post.js',
	'registration': servers.LIB.controllersPath + 'registration.js',
	'report': servers.LIB.controllersPath + 'report.js',
	'search': servers.LIB.controllersPath + 'search.js',
	'topic': servers.LIB.controllersPath + 'topic.js',
	'university': servers.LIB.controllersPath + 'university.js',
	'user': servers.LIB.controllersPath + 'user.js',
	'group': servers.LIB.controllersPath + 'group.js',
	'professor': servers.LIB.controllersPath + 'professor.js',
	'statistic': servers.LIB.controllersPath + 'statistic.js',

	'HiNot': '/srv/server/hinot.js',
	'neoLib': '/srv/server/neoLib.js',
	};

/*var controllersPrefix  = {
	'career': servers.LIB.controllersPath + 'career.js',
	'class': servers.LIB.controllersPath + 'class.js',
	'degreeprogram': servers.LIB.controllersPath + 'degreeprogram.js',
	'document': servers.LIB.controllersPath + 'document.js',
	'notifications': servers.LIB.controllersPath + 'notifications.js',
	'invite': servers.LIB.controllersPath + 'invitation.js',
	'poll': servers.LIB.controllersPath + 'poll.js',
	'post': servers.LIB.controllersPath + 'post.js',
	'registration': servers.LIB.controllersPath + 'registration.js',
	'report': servers.LIB.controllersPath + 'report.js',
	'search': servers.LIB.controllersPath + 'search.js',
	'topic': servers.LIB.controllersPath + 'topic.js',
	'university': 'uni',
	'user': servers.LIB.controllersPath + 'user.js',
	'group': servers.LIB.controllersPath + 'group.js',
	'professor': servers.LIB.controllersPath + 'professor.js',
	'statistic': servers.LIB.controllersPath + 'statistic.js',

	'neoLib': 'nlb',
};*/

var controllersService = {
	'career': 'neoLib',
	'class': 'neoLib',
	'degreeprogram': 'neoLib',
	'document': 'neoLib',
	'notifications': 'HiNot',
	'history': 'HiNot',
	'invite': 'HiNot',
	'poll': 'neoLib',
	'post': 'neoLib',
	'registration': 'neoLib',
	'report': 'neoLib',
	'search': 'neoLib',
	'topic': 'neoLib',
	'university': 'neoLib',
	'user': 'neoLib',
	'group': 'neoLib',
	'professor': 'neoLib',
	'statistic': 'neoLib',

	'neoLib': '/srv/server/neoLib.js',
};

var servicePrefix = {
	'neoLib': 'nlb',
	'HiNot': 'hnt',
}

existsController = function(controller){
	return controllers[controller] != undefined;
}

getControllerPath = function(controller, user){
	return controllersPath[controller];
}

/*getControllerPrefix = function(controller, user){
	return controllersPrefix[controller];
}*/

getControllerService = function(controller, user){
	return controllersService[controller];
}

getServicePrefix = function(service){
	return servicePrefix[service];
}

exports.getServicePrefix = getServicePrefix;
exports.existsController = existsController;
exports.getControllerPath = getControllerPath;
//exports.getControllerPrefix = getControllerPrefix;
exports.getControllerService = getControllerService;