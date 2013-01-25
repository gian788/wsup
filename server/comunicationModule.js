var utils = require('./utils/common.js'),
	prefix = require('./utils/prefix.js'),
	confMod = require('./config.js'),
	Utils = require('./lib/controllers/utils/utils.js')
	config = confMod.config(),
	//redis = require('redis').createClient(),
	zmq  = require('zmq'),
	ZooKeeper = require('./utils/zookeeper'),
	EventEmitter = require('events').EventEmitter;

function CM(obj, dealerIdentity, brokerAddress, routerIdentity){	
	if(arguments.length < 4){
		throw 'Illegal Argument: ' + arguments.length + ' arguments found, 4 required.';
	}

	config.loadNodeInfo();
	this.obj = obj;
	this.dealer = zmq.socket('dealer');
	this.router = zmq.socket('router');
	this.dealer.identity = dealerIdentity;
	this.dealer.connect(brokerAddress);	
	this.router.identity = routerIdentity;
	this.isReady = false;
	//this.dealer.send(['READY']);

	this.replyQueue = {};
	this.brokers = [];
	this.services = [];
	this.nextReqId = 1;	

	console.log('Dealer: ' + this.dealer.identity + ' ' + brokerAddress)
	console.log('Router: ' + this.router.identity);

	var self = this;
	this.dealer.on('message', function(){
		var arr = Array.apply(null, arguments);
		var msg = utils.parse(arr[arr.length - 1].toString());	
		//console.log('* ', msg)
		if(typeof(self.obj[msg.fn]) == 'function'){
			var args = msg.args;		
			args.push(function(err, res){
				arr[arr.length - 1] = utils.stringify({reqId: msg.reqId, err: err, res: Utils.toJson(res)});
				self.dealer.send(arr);
			});
			self.obj[msg.fn].apply(self.obj, args);
		}
	});

	this.router.on('message', function(){
		var msg = utils.parse(arguments[1].toString());		
		//console.log('-> ',msg);
		if(self.replyQueue[msg.reqId]){
		    self.replyQueue[msg.reqId].cb(msg.err, msg.res);
		    delete self.replyQueue[msg.reqId];
		}
	});

}

CM.prototype.getService = function(name, callback) {
	return new Service(name, this, callback);
};

CM.prototype.ready = function(){
	if(!this.isReady){
		this.dealer.send(['READY']);
		this.isReady = true;
	}
}

CM.prototype.checkAllServiceReady = function(){
	for(var i in this.services)
		if(this.services[i].state != 1)
			return;
	//this.ready();
}

/**
  * Send a message and setup a callback for the reply
  * @param string 	module	function name
  * @param string 	fn 		function name
  * @param array 	args 	function arguments
  * @param function callback 
  */
CM.prototype.send = function(module, fn, args, callback){
	var reqId = this.nextReqId++;
	var param = {reqId: reqId, fn: fn, args: args};
	//console.log([this.brokers[module],utils.stringify(param)])
	this.router.send([this.brokers[module],utils.stringify(param)]);
	this.replyQueue[reqId] = {t: new Date().getTime(), cb: callback};
}


Service = function(name, cm, callback){
	this.name = name;
	this.state = 0;
	this.cm = cm;
	this.cm.services[name] = {state: 0};
	var self = this;

	console.log('service: ', name)
	config.getService(name, function(err, res){
		if(err){
			if(callback)
				return callback(err, null);
			else
				throw err;
		}
		if(res == null){
			console.log('Error: no info about service ' + name + ' found!');
			return callback('Error: no info about service ' + name + ' found!', null);
		}
		self.cm.brokers[name] = res.broker.config.socket.lfi;
		self.cm.router.connect(res.broker.config.socket.lfa);
		console.log(name, res.broker.config.socket.lfa, res.broker.config.socket.lfi)
		//console.log('config:service:' + name + ':fn')
		/*zk = ZooKeeper.Zookeeper({
			connect: "localhost:2181"
		 	,timeout: 200000
		 	,debug_level: ZooKeeper.ZOO_LOG_LEVEL_WARNING
		 	,host_order_deterministic: false
		}).get*/
		console.log('config:service:' + name + ':fn')
		require('redis').createClient(6479, '192.168.16.128').smembers('config:service:' + name + ':fn', function(err, availFn){
			if(err){
				if(callback)
					return callback(err, null);
				else
					throw err;
			}
			//console.log('availFn',availFn)
			for(var i in availFn){	
				(function(){
					var fn = availFn[i];
					self[fn] = function(){
						if(typeof(arguments[arguments.length - 1]) != 'function'){
							throw 'Missing callback';
						}
						var callback = arguments[arguments.length - 1];					
						self.cm.send(name, fn, Array.prototype.slice.call(arguments, 0, arguments.length - 1), callback);	
					}	
				})();				
			}		
			cm.services[name].state = 1;
			self.state = 1;
			cm.checkAllServiceReady();
			self.emit('ready');
			if(callback)
				callback(null, self);
		});

			//console.log('availFn',availFn)
			
		/*self['fn'] = function(){
			if(typeof(arguments[arguments.length - 1]) != 'function'){
				throw 'Missing callback';
			}
			var callback = arguments[arguments.length - 1];					
			self.cm.send(name, 'fn', Array.prototype.slice.call(arguments, 0, arguments.length - 1), callback);	
		}	
		cm.services[name].state = 1;
		self.state = 1;
		cm.checkAllServiceReady();
		self.emit('ready');
		if(callback)
			callback(null, self);
		*/
	});	
}

Service.prototype.__proto__ = EventEmitter.prototype;


var checkAllServiceReady = function(services, callback){
	var count = 0;
	for(var i in services){
		if(services[i].cm.services[services[i].name].state == 1)
			count++;
			if(count == services.length)
				return callback();
		else{
			services[i].on('ready', function(){
				count++;
				if(count == services.length)
					return callback();
			})
		}
	}
}

exports.config = 
exports.CM = function(obj, dealerIdentity, brokerAddress, routerIdentity){
	return new CM(obj, dealerIdentity, brokerAddress, routerIdentity);
}

exports.checkAllServiceReady = checkAllServiceReady;