var redis = require('redis').createClient();
var redisPrefix = require(process.cwd() + '/global/redis.js');
var mysql = require('mysql-libmysqlclient');
var fs = require('fs');

getCounter = function(name, date, callback){
	if(!callback){
		callback = date;		
	}else{
		//check date
		name += '' + date;
	}
	redis.get(redisPrefix.PREFIX_STAT + name, function(err, res){
		if(err)
			return callback(err, null);
		if(res == null){
			return callback(null, 0);
		}
		callback(null,res);
	});
}

getSet = function(name, date, callback){
	if(!callback){
		callback = date;		
	}else{
		//check date
		name += '' + date;
	}

	redis.smembers(redisPrefix.PREFIX_STAT + name, function(err, res){
		if(err)
			return callback(err, null);
		callback(null, res);
	});
}

getList = function(name, date, callback){
	if(!callback){
		callback = date;		
	}else{
		//check date
		name += '' + date;
	}

	var range = 100,
		start = 0,
		stop = range - 1,
		list = [];

	lrange(name, start, stop, range, list, function(err, res){
		if(err)
			return callback(err, null);
		callback(null, res);
	});
}

lrange = function(key, start, stop, range, list, callback){
	console.log(redisPrefix.PREFIX_STAT + key + ' ' + start + ' ' + stop)
	redis.lrange(redisPrefix.PREFIX_STAT + key, start, stop, function(err, res){
		if(err)
			return callback(err, null);
		console.log(res.length)
		if(res.length == 0)
			return callback(null, list);
		for(var i in res){
			list.push(res[i]);
		}
		lrange(key, stop + 1, stop + range, range, list, callback);
	});
}

delKey = function(name, key, callback){
	if(!callback){
		callback = date;		
	}else{
		//check date
		name += ':' + date;
	}

	redis.del(redisPrefix.PREFIX_STAT + name, function(err, res){
		if(err)
			return callback(err, null);
		callback(null, res);
	});
}

getRangeAccess = function(date, hour, range, accesses, callback){
	if(range == 0)
		return callback(null, accesses)
	getCounter(PREFIX_REG, hour+':'+date, function(err, res){
		if(err){
			return callback(400, null);
		}
		if(res == null){
			accesses[hour] = 0;
		}
		else
			accesses[hour] = res;
		getRangeAccess(date, ++hour, --range, accesses, callback);
	});	
}

saveToFile = function(array, fileName, callback){
	fs.appendFile(fileName, array, function (err) {
	  if (err) 
	  	return callback(err, null);
	  callback(null, true);
	});
}

exports.getCounter = getCounter;
exports.getSet = getSet;
exports.delKey = delKey;
exports.getSet = getSet;
exports.getList = getList;
exports.getRangeAccess = getRangeAccess;