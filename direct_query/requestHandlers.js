var path=require('fs');
var http = require('http');
var controllersConfig = require('./modulesConfig.js');
var Utils = require('../lib/controllers/utils/utils.js');

var services = [];
//var cm = require('../comunicationModule.js').CM(this, '001dqyW01001', 'ipc:///tmp/57000', '001dqyC01001');
var cm = require('../comunicationModule.js').CM(this, process.argv[2], process.argv[3], process.argv[2].substring(0,3) + 'dqyC01001');
cm.ready();

exports.handle = function(controller, func, args, request, response, user){
	//res = response;
	if(!controllersConfig.existsController(controller)){
		//console.log('Invalid controller specified! : ' +  controller);
		//TODO replay nothing
		replay(400, null, response);
		return false;
	}
	//accessControl
	/*if(!args.sessid){
		replay('Access denied');
		return;
	}
	getUser(args.sessid, function(err, res){
		if(err){
			console.log(err);
			replay('Access denied');
			return;
		}
		//check permission		
		var mod = require(controllersConfig.getControllerPath(controller, res));
		if(typeof mod[func] === 'function'){
			mod[func](args, user, replay);		
		}else
		{
			console.log('Function not found in controller ' + controller);
			replay('Function not found in controller ' + controller);
		}
	});*/
	/*if(args.sessid){
		console.log(args.sessid);
	}*/
	//AD HOC MOD
	switch(func){
		case 'gethistory':
			if(controller == 'class'){
				controller = 'history';
				func = 'getclasspublichistory';
			}
		break;
		case 'getcount':
			return replay(400, null, response);
		break;
	}
	var serveController = function(err, result){		
		if(err){
			replay(err, null, response);
			return;
		}
		replay(null, result, response);
	}
	var callFunc = function(){
		if(service == 'neoLib' || service == 'HiNot'){
			if(services[service].state == 1){
				services[service].fn(controller, func, args, user, serveController);	
			}else{
				services[service].once('ready', serveController);
			}
		}else{
			services[service][func](args, user, serveController);
		}
	}

	delete args['sessid'];
	var service = controllersConfig.getControllerService(controller, user);
	//console.log(service, controller, func)
	if(!services[service]){
		services[service] = cm.getService(controllersConfig.getServicePrefix(service), function(err, res){
			if(err){
				//console.log('Not elab ', controller, func)
				return replay(400, null, response);
			}
			callFunc();		
		});
	}else{
		callFunc();
	}
	return;
}


replay = function(error, result, res){
  	if(error){
  		//unauthorized access
  		/*if(error == 401){
  			res.writeHead(401, {'Content-Type': 'text/plain','Access-Control-Allow-Origin':'*', 'Access-Control-Allow-Headers':['X-Requested-With','Range','Content-Type']});	
  		}*/
  		console.log(error)
  		if(typeof(error) == 'number'){
  			res.writeHead(error, {'Content-Type': 'text/plain','Access-Control-Allow-Origin':'*', 'Access-Control-Allow-Headers':['X-Requested-With','Range','Content-Type']});	
  		}else{
  			res.writeHead(500, {'Content-Type': 'text/plain','Access-Control-Allow-Origin':'*', 'Access-Control-Allow-Headers':['X-Requested-With','Range','Content-Type']});	
  		}	  	
	  	if(typeof(error) != 'number')
	  		console.dir(error)
	  	//TODO remove send error
	  	res.write(error.toString());
	  	res.end();	
	  	return;
  	}
  	res.writeHead(200, {'Content-Type': 'application/json','Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': ['X-Requested-With','Range','Content-Type'],'Content-Range':'*'});
  	if(result == null || (typeof(result) == 'Array' && result.length == 0)){
  		result = '[]';
  	} 
  	res.write(result);
  	res.end();
  	//console.log('sended', res, result)
  	return;
}


/*
getUser = function(sessid, callback){	
	if(typeof(user) == 'string'){	
		var redisPrefix = require('../global/redis.js');
		var redis = require('redis').createClient(6379,'127.0.0.1');
		var phpsessid = user;
		redis.on('connect', function(err, res){
			if(err){
				console.log(err);
				return;
			}
		});
		redis.on('ready', function(err, res){
			if(err){
				console.log(err);
				return;
			}
			redis.select(0, function(err, res){
				if(err){
					console.log(err);
					return;
				}				
				redis.get(redisPrefix.PREFIX_PRESISTEN_SESSION + phpsessid, function(err, res){
					if(res == null){
						callback(null, 401);
						return;
					}
					res = JSON.parse(res);
					callback(null, res);					
				});
			});
		});		
	}
	return false;
}*/