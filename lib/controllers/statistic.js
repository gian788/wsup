var model = require('../models/Statistic.js');

var PREFIX_REGSTU ='regStu';
var PREFIX_REGPRO ='regPro';
var PREFIX_STARTREGSTU ='startRegStu';
var PREFIX_STARTREGPRO ='startRegPro';
var PREFIX_REQ = 'reqP:';
var PREFIX_VIEW = 'req:php:';

var controllerList = new Array("class:index", "search:class", "search:user", "user:index");



getRegistered = function(args, user, callback){
	
	/*if(!checkUser(user))
		return callback(401, null);*/

	var ret = {};

	model.getCounter(PREFIX_REGSTU, function(err, res){
		if(err){
			return callback(400, null);
		}
		if(res == null){
			ret.regStu = 0;
		}
		ret.regStu = res;
		model.getCounter(PREFIX_REGPRO, function(err, res){
			if(err){
				return callback(400, null);
			}
			if(res == null){
				ret.regPro = 0;
			}
			ret.regPro = res;
			model.getCounter(PREFIX_STARTREGSTU, function(err, res){
				if(err){
					return callback(400, null);
				}
				if(res == null){
					ret.startRegStu = 0;
				}
				ret.startRegStu = res;
				model.getCounter(PREFIX_STARTREGPRO, function(err, res){
					if(err){
						return callback(400, null);
					}
					if(res == null){
						ret.startRegPro = 0;
					}
					ret.startRegPro = res;
					callback(null, ret);
				});
			});
		});
	});
}

function checkUser(user){
	/*var usersAllowed = [''];
	for(var i in usersAllowed)
		if(usersAllowed[i] == user.nosqlid)
			return true;
	return false;*/
	return true;
}

getRequest = function(args, user, callback){
	if(!checkUser(user))
		return callback(401, null);
	model.getList(PREFIX_REQ, '13:16:10:2012', function(err, res){
		if(err){
			return callback(400, null);
		}
		if(res == null){
			return callback(null, '0');
		}
		callback(null, res);
	});
}

getDailyAccess = function(args, user, callback){
	getRangeAccess(args.date, 0, 24, [], callback)
}

getDailyAction = function(args, user, callback){

	_getDailyAction(0, {}, function(err, res){
		callback(null, res);
	});
	
}

_getDailyAction = function(index, ret, callback){
	model.getCounter(PREFIX_VIEW + controllerList[index], function(err, res){
			if(err){
				return callback(400, null);
			}
			if(res == null){
				ret[controllerList[index]] = 0;
			}
			else
				ret[controllerList[index]] = res;
			if(index == controllerList.length - 1)
				callback(null, ret);
			else
				_getDailyAction(++index, ret, callback);
		});
}

exports.getdailyaccess = getDailyAccess;
exports.getregistered = getRegistered;
exports.getrequest = getRequest;
exports.getdailyaction = getDailyAction;