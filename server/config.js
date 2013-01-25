var redis = require('redis'),
	ZooKeeper = require('./utils/zookeeper'),
	utils = require('./utils/common.js'),
	prefix = require('./utils/prefix.js').redis,
	prefixZk = require('./utils/prefix.js').zookeeper;
	lrp = require('./lrpManager/lrp.js');

const 	LOCAL_ADDRESS = 1,
		CLOUD_ADDRESS = 2;

const TYPE_BROKER = 0;
	  TYPE_WORKER = 1;

/*services = [
	'serviceID': {
		name: ,
		state: STATE_OFF,
		broker: {
			proc: lrpManagerid,
			id: ,			
			socket: {

			},
			config: {				
				file: ,
				args: []
			},
		},
		worker: {
			proc: [
				'lrpManagerIds': {
	
			}],
			config: {
				file: ,
				args: ,
			}
		},
		statistic: {

		}
	}]*/

function Config(options){
	this.zk = ZooKeeper.Zookeeper({
		connect: "localhost:2181"
	 	,timeout: 200000
	 	,debug_level: ZooKeeper.ZOO_LOG_LEVEL_WARNING
	 	,host_order_deterministic: false
	});

	//this.redisShared = redis.createClient(6479, '192.168.16.128'),
	this.redisLocal  = redis.createClient(6379, '127.0.0.1');

	this.node = {
		ip: utils.getServerIp()
	},
	this.mnb = {
		controlAddress: 'ipc:///tmp/mnb_ctr',
		pubAddress: 'tcp://127.0.0.1:7123',
	},
	this.broker = {
		defaultPath: '/srv/server/remoteB',
		localAddressPrefix: 'ipc:///tmp/',
		remoteAddressPrefix: 'tcp://127.0.0.1:',
		portRange: {start: 55000, end: 55200},
	},
	this.services = [];
	this.peers = {};

	this._workerSockIds = [];
	this._assigned_local_addr = [];
	this._assigned_cloud_addr = [];
	
}

Config.prototype.setNodePublicSocket = function(data, callback){
	var self = this;	
	if(!data.addr || !data.id)
		return callback('Error Config.setNodePublicSocket: Illegal Argument', null);
	self.mnb.addr = data.addr;
	self.mnb.id = data.id;

	//console.log(prefix.peer + this.node.id + ':' + prefix.socket, data)
	this.zk.set('/peer/' + this.node.id + '/socket/pub', utils.stringify(data), function(err, res){
		if(err)
			return utils.errorCallback(callback, err);
		return callback(null, data);
	});
}


/**
  * Set service info and save it on redis (if the infoPath is an array do a Array.push)
  * @param string service
  * @param string infoPath path on the service object where data are saved (eg. .broker)
  * @param object data
  * @param function callback callback function
  */
Config.prototype.setServiceInfo = function(service, infoPath, data, callback){
	var self = this;
	if(!data || typeof(data) == 'function'){
		if(typeof(data) == 'function')
			callback = data;
		data = infoPath;
		infoPath = undefined;
	}
	
	self.zk.get('/peer/' + self.node.id + '/service/' + service, function(err, res){
		if(err)
			callback(err, null);
		if(res != null)
			return callback(null, null);
		if(res == null){
			if(infoPath)
				return callback('Error at setServiceInfo: Invalid service specified "' + service + '".', null);
			else{
				res = '{}';
				setNewService(data)		
			}
		}

		var obj = utils.parse(res.toString());		
		var path = 'obj';
		if(infoPath){
			path += '.' + infoPath;					
			if(typeof(eval(path)) == 'object' && eval(path).length > 0){
				if(data.length > 0)
					for(var i in data)
						eval(path + '.push(data[' + i + '])');				
				else
					eval(path + '.push(data)');			
			}else{
				eval(path + ' = data');			
			}
		}else{
			if(res == '{}')
				obj = data
			else
				for(var i in data){
					if(typeof(eval(path)) == 'object' && eval(path).length > 0){
						eval(path + '.' + i + '.push(data[i])');			
					}else{
						eval(path + '.' + i + ' = data[i]');		
					}
				}

		}

		if(!self.services[service])
			self.services[service] = obj;
		else{
			path = 'self.services[service]';
			if(infoPath){
				path += '.' + infoPath;		
				eval(path + ' = data');		
			}else{
				for(var i in data){
					if(typeof(eval(path)) == 'object' && eval(path).length > 0){
						eval(path + '.' + i + '.push(data[i])');			
					}else{
						eval(path + '.' + i + ' = data[i]');		
					}
				}
			}
		}

		self.zk.set('/peer/' + self.node.id + '/service/' + service, utils.stringify(obj), function(err, res){
			if(err)
				return callback(err, null);
			if(callback)
				callback(null, true);
		});
	});
}


Config.prototype.loadAndSetNodeInfo = function(callback){
	var self = this;
	var numAsyncFn = 2;
	var count = 0;
	var cbFn = function(){
		//console.log('c1', count + 1, numAsyncFn)
		if(++count == numAsyncFn){
			//console.log('cb ok')
			return callback(null, true);
		}
	}
	//public socket
	self.zk.get('/peer/' + self.node.id + '/socket/pub', function(err, res){
		if(err)
			return callback(err, null);
		if(res == null)
			return cbFn();
		res = utils.parse(res);
		if(res.addr && res.id){
			self.mnb.pubAddress = res.addr;
			self.mnb.pubId = res.id;
		}
		cbFn();
	});
	//services
	self.zk.getChildren('/peer/' + self.node.id + '/service', function(err, services){
		if(err)
			return callback(err, null);
		if(utils.length(services) == 0)
			return cbFn();		
		var numAsyncFn2 = utils.length(services);
		var count2 = 0;
		var cbFn2 = function(){
			//console.log('c2', count2 + 1, numAsyncFn2)
			if(++count2 == numAsyncFn2){
				//console.log('cb2 ok')
				return cbFn();
			}
		}
		for(var i in services){
			(function(){
				//console.log('loading ', i)
				var numAsyncFn3 = 2;
				var count3 = 0;
				var cbFn3 = function(){
					//console.log('c3', count3 + 1, numAsyncFn3)
					if(++count3 == numAsyncFn3){
						//console.log('cb3 ok')
						return cbFn2();
					}
				}
				var srvId = i;
				var srv = utils.parse(services[i]);
				//console.log(srv)
				if(!self.services[srvId]){
					self.services[srvId] = srv;
					self._setServiceFields(srvId);
				}
				//set socket
				if(srv.broker.config.socket){
					self.services[srvId].broker.config.socket = srv.broker.config.socket;
					//update assigned addr
					self._assigned_local_addr.push(srv.broker.config.socket.lfa)
					self._assigned_local_addr.push(srv.broker.config.socket.lba)
					self._assigned_cloud_addr.push(srv.broker.config.socket.cfa)
					self._assigned_cloud_addr.push(srv.broker.config.socket.cba)
				}

				//set peer
				self.zk.getChildren('/peer/' + self.node.id + '/service/' + srvId + '/peer', function(err, peers){
					if(err)
						return cbFn3();
					if(!peers || utils.length(peers.length) == 0)
						return cbFn3();
					for(var k in peers){
						var peerId = k;
						//check peer (ping)
						self.services[srvId].peers[peerId] = peers[peerId];					
					}
					cbFn3();
				});
				//set proc
				self.zk.getChildren('/peer/' + self.node.id + '/service/' + srvId + '/proc', function(err, procs){
					if(err)
						return cbFn3();//callback(err, null);
					if(utils.length(procs) == 0)
						return cbFn3();
					for(var j in procs){
						var procId = j;
						var proc = utils.parse(procs[procId]);
						//console.log(srvId, proc)
						if(proc.type == TYPE_BROKER)
							self.services[srvId].broker.proc = proc;
						else
							self.services[srvId].worker.proc[procId] = proc;
						//check peer (ping)
					}
					//console.log(srvId,self.services[srvId].worker.proc)
					cbFn3();
				});
			})();			
		}
	});	
}

Config.prototype.checkProcess = function(service, lrp, callback){
	if(!callback){
 		callback = lrp;
		lrp = service;
		service = undefined;
	}
	var self = this,
		err = true,
		count = 0;
	var fn = function(srv){		
		var count2 = 0;
		//console.log('check proc of service ' + srv, self.services[srv].worker, lrp.checkProcess(self.services[srv].broker.proc.lrpId),self.services[srv].broker.proc)
		if(self.services[srv].broker.proc){
			//console.log('**check broker', srv, self.services[srv].broker.proc.lrpId);
			if(!lrp.checkProcess(self.services[srv].broker.proc.lrpId)){
				//console.log('**broker down', srv);
				self.zk.del('/peer/' + self.node.id + '/service/' + srv + '/proc/' + self.services[srv].broker.proc.lrpId, function(error, res){
					//console.log(err,res)
				});
				self.services[srv].broker.proc = null;
				err = false;
			}
		}
		if(self.services[srv].worker && self.services[srv].worker.proc && utils.length(self.services[srv].worker.proc) > 0){
				var wrongProc = lrp.checkProcess(self.services[srv].worker.proc).no;
				//console.log('**wrong', srv,wrongProc)				
				if(wrongProc.length == 0)
					if(++count == utils.length(self.services))
							callback(null, err);
				for(var i in wrongProc){
					//console.log('/peer/' + self.node.id + '/service/' + srv + '/proc/' + wrongProc[i], 'delete ')
					delete self.services[srv].worker.proc[wrongProc[i]];						
					err = false;						
					self.zk.del('/peer/' + self.node.id + '/service/' + srv + '/proc/' + wrongProc[i], function(error, res){
						//console.log(error, res)
						//console.log(srv, 'delete')						
						if(++count2 == utils.length(wrongProc))
							if(++count == utils.length(self.services))
								callback(null, err);
					});					
				}
		}else{
			if(++count == utils.length(self.services))
				callback(null, err);
		}
		
	}

	if(service){
		fn(service);
		return err;
	}else{
		if(utils.length(self.services) == 0)
			return callback(null, null);
		for(var i in self.services)
			fn(i);
	}
}







Config.prototype.loadNodeInfo = function(callback){
	var self = this;
	self.redisLocal.get(prefix.node.ip, function(err, ip){
		if(err)
			return callback(err, null);
		if(ip)
			self.node.ip = ip;
		self.redisLocal.get(prefix.node.id, function(err, id){
			if(err)
				return callback(err, null);
			if(id)
				self.node.id = id;
			if(callback)
				callback();
		});
		//callback();
	});	
}

/**
  * Return a new socket id
  * @param function callback callback function where res is the socket id
  */
Config.prototype.newId = function(callback){
	var self = this;
	var newId;
	var watch = false;
	var attempt = 0;
	var setNewId = function(){
		++attempt;
		//console.log('New id attempt #' + attempt)
		//create new id with test-and-set like alg.
		self.zk.watchChildren('/peer', 
			function(err, peers){
				//console.log('ch',err, peers)
				if(peers && peers.length > 0)
					var max = parseInt(peers[0], 10)
				else
					var max = 0;
				for(var i in peers){
					if(parseInt(peers[i], 10) > max)
						max = peers[i];
				}
				newId = '' + (parseInt(max) + 1);
				var l = 3 - newId.length
				for(var i = 0; i < l; i++)
					newId = '0' + newId;
				if(!watch){
					self.node.hash = utils.getHash(10);
					self.zk.set('/peer/' + newId, self.node.hash, function(err, res){
						self.zk.set('/peer/' + newId + '/service', '', function(err, res){
							//console.log('set newId: ' + newId, err, res);
							self.redisLocal.set(prefix.node.id, newId, function(err, res){
								self.node.id = newId;
								self.redisLocal.set(prefix.node.hash, self.node.hash, function(err, res){								
									callback(null, newId);
								});								
							});
						});						
					});	
				}else{
					console.log('Error: "new id race" collision')
					utils.sleep((Math.random() * 10) + 1);
					setNewId();
				}	
			}, function(err, res){
				//console.log('watch',err, res)
				watch = true;				
			});							
	};

	//check for previuos config
	self.redisLocal.get(prefix.node.id, function(err, id){
		if(err)
			return callback(err, null);
		self.redisLocal.get(prefix.node.hash, function(err, hash){
			if(err)
				return callback(err, null);
			//console.log("Prev conf: ", id, hash)

			if(id && hash){
				self.zk.get('/peer/' + id, function(err, res){
					//console.log('exists', err, res.toString())			
					if(err)
						return callback(err, null);
					if(!res){
						self.redisLocal.del(prefix.node.id, function(err, res){
							if(err)
								return callback(err, null);		
							setNewId();
						});
					}else{
						//console.log('zkHash', res.toString())
						if(hash == res.toString()){
							self.node.id = id;
							return callback(null, id);
						}else
							setNewId();
					}
				});
			}else{
				setNewId();			
			}
		});
	});	
}

/**
  * Discover active mnb peers
  * @param function callback callback function where res is the array containing the peers ids
  */
Config.prototype.peersDiscovery = function(callback){
	var self = this;	
	console.log('searching for remote peers...')
	self.zk.getChildren('/peer', function(err, p){
		if(err){
			return callback(err, null);
		}

		var count = 0,
			numPeers = utils.length(p);

		var endFunc = function(){
			//console.log(self.peers)
			if(++count == numPeers){				
				self.peersServices(self.peers, function(err, res){					
					if(err){
						return callback(err, null);
					}
					console.log(utils.length(p) + ' peers found');
					callback(null, self.peers)
				});
			}
		};

		for(var i in p){
			if(i != self.node.id){
				if(!self.peers[i]){
					self.peers[i] = {};					
				}
				(function(){
					var peer = i;
					self.zk.get('/peer/' + peer + '/socket/pub', function(err, res){
						if(err){
							return callback(err, null);
						}
						//console.log(peer, prefix.peer + peer + ':' + prefix.socket, res)
						res = utils.parse(res);						
						if(res){
							self.peers[peer].socket = {
								addr: res.addr,
								id: res.id
							}	
							//console.log(prefix.peer + peer + ':' + prefix.socket, res, self.peers[peer].socket)						
						}
						endFunc();
					})
				})();
			}else{
				delete p[i];
				endFunc();
			}
		}
	});	
}

/**
  * Return active services on the specified peer node
  * @param string peer peer id
  * @param function callback callback function where res is the array of active services
  */
Config.prototype.peerServices = function(peer, callback){
	var self = this;
	self.zk.getChildren('/peer/' + peer + '/service', function(err, res){
		if(err){
			console.log('err: ', err)
			return callback(err, null);
		}
		if(res.length == 0)
			return callback(null, null);
		var srv = {};
		var count = 0;
		for(var i in res){			
			var service = utils.parse(res[i]);
			console.log(i, service.broker.config.socket)
			if(service.broker.config.socket && service.sharable){
				console.log('remote service ' + service.name)
				if(!self.services[i]){
					self.services[i] = {}
					setNewService(self.services[i]);
					self.services[i].sharable = false;				
				}
				if(!self.services[i].peers)
						self.services[i].peers = {};

				self.services[i].peers[peer] = {
					socket: {
						addr: service.broker.config.socket.cfa,
						id: service.broker.config.socket.cfi
					}
				};
				self.services[i].name = service.name;
				srv[i] = self.services[i];
				//console.log(i, srv[i].peers);
				self.setServiceInfo(i, self.services[i], function(err, ins){
					//console.log('setINfo _ peersDiscovery', err, ins)
					count++;
					if(count == utils.length(res))
						callback(null, srv);
				})
				/*if(!self.services[service.name]){
					self.services[service.name] = {}
					setNewService(self.services[service.name]);				
				}
				if(!self.services[service.name].peers)
						self.services[service.name].peers = {};

				self.services[service.name].peers[peer] = {
					socket: {
						addr: service.broker.config.socket.cfa,
						id: service.broker.config.socket.cfi
					}
				};
				srv[service.name] = self.services[service.name];*/
			}else{
				count++;
				if(count == utils.length(res))
					callback(null, srv);
			}
			
		}
	});	
}

/**
  * Return active services on all peer node
  * @param function callback callback function where res is the array of active services
  */
Config.prototype.peersServices = function(peers, callback){
	if(!callback){
		callback = peers;
		peers = [];
	}
	var self = this,
		srv = [],
		count = 0;	

	if(utils.length(self.peers) == 0)
		return callback(null, null)
	
	console.log('peers', self.peers)
	for(var i in self.peers){
		self.peerServices(i, function(err, res){
			//console.log(i, res)
			//console.log(self.peers)
			if(err)
				return callback(err, null);
			count++;
			srv[self.peers[i]] = res;
			if(count == utils.length(self.peers))
				callback(null, srv);
		});
	}	
	
}

/**
  * Define and set broker socket configuration for the specified broker
  * @param string brokerId
  * @param function callback callback function where res contains socket configuration
  */
Config.prototype.setBrokerSocket = function(brokerId, callback){
	var service = ('' + brokerId).substr(3,3),
		net_dev = 'B01',
		self = this;

	if(self.services[service].broker.config.socket)
		var brokerConfig = self.services[service].broker.config.socket;
	else
		var	brokerConfig = {
			lfa: self.newSocketAddress(LOCAL_ADDRESS),
			lba: self.newSocketAddress(LOCAL_ADDRESS),
			cfa: self.newSocketAddress(CLOUD_ADDRESS),
			cba: self.newSocketAddress(CLOUD_ADDRESS),

			lfi: self.node.id + service + net_dev + 'LF1',
			lbi: self.node.id + service + net_dev + 'LB1',
			cfi: self.node.id + service + net_dev + 'CF1',
			cbi: self.node.id + service + net_dev + 'CB1',
		};

	console.log(service, brokerConfig);

	self.services[service].broker.config.socket = brokerConfig;
	self.broker.id = brokerId.toString();

	self.zk.get('/peer/' + self.node.id +'/service/' + service, function(err, res){
		if(err)
			return callback(err, null);
		res = utils.parse(res);
		if(!res.broker)
			res.broker = {};

		res.broker.config.socket = brokerConfig;
		res.broker.id = brokerId.toString();
		self.zk.set('/peer/' + self.node.id +'/service/' + service, utils.stringify(res), function(err, res){
			if(err)
				return callback(err, null);
			callback(null, brokerConfig);
		});
	});
}

/**
  * Return a new socket id for the specified service
  * @param string service
  * @param ENUM{TYPE_BROKER, TY_WORKER} type type of socket owner
  * @returns config.services string id
  */
Config.prototype.newSocketId = function(service, type){
	var id = '' + this.node.id + service;
	var n;
	if(type == TYPE_BROKER){
		id += 'B01001';
		return id;
	}
	else{
		//console.log('w', service)		
		id += 'W01';
		for(var i = 0; i < 999; i++){
			if(i < 10)
				n = '00' + i;
			else if(i < 100)
				n = '0' + i;
			if(!utils.in_array(this._workerSockIds, id + n)){
				id += n;
				this._workerSockIds.push(id);
				return id;
			}
		}	
	}
	return false;
}

/**
  * Return a new socket address for the specified service
  * @param string addr prefix address (eg. 'ipc:///tmp/' or 'tcp://127.0.0.1:')
  * @param enum{LOCAL_ADDRESS, CLOUD_ADDRESS} type address type
  * @returns config.services string new socket address
  */
Config.prototype.newSocketAddress = function(addr, type){
	var addr;
	if(!type){
		type = addr;
		addr = undefined;
	}
	if(type == LOCAL_ADDRESS){
		if(!addr)
			addr = this.broker.localAddressPrefix;
		var i = this.broker.portRange.start;
		while(i <= this.broker.portRange.end){
			if(!utils.in_array(this._assigned_local_addr, addr + i)){
				addr = addr + i;
				this._assigned_local_addr.push(addr);
				break;
			}
			i++;
		}
		if(i > this.broker.portRange.end){
			console.log('\nERROR:\tCan\'t assign new address. All allowed address are already assigned!\n');
			return false;
		}
	}
	if(type == CLOUD_ADDRESS){
		if(!addr)
			if(!this.node.ip)
				addr = this.broker.remoteAddressPrefix;
			else
				addr = 'tcp://' + this.node.ip + ':';
		var i = this.broker.portRange.start;
		while(i <= this.broker.portRange.end){
			if(!utils.in_array(this._assigned_cloud_addr, addr + i)){
				addr = addr + i;
				this._assigned_cloud_addr.push(addr);
				break;
			}
			i++;
		}
		if(i > this.broker.portRange.end){
			console.log('\nERROR:\tcan\'t assign new address. All allowed address are already assigned!\n');
			return false;
		}
	}
	return addr;
}

Config.prototype.addServiceProcess = function(service, proc, callback){
	var self = this;
	//console.log('addServiceProcess', service, proc)
	self.zk.set('/peer/' + self.node.id + '/service/' + service + '/proc/' + proc.lrpId, utils.stringify(proc), function(err, res){
		if(err)
			return callback(err, null);
		self._setServiceFields(service);
		if(proc.type == TYPE_BROKER)
			self.services[service].broker.proc = proc;
		else
			self.services[service].worker.proc[proc.lrpId] = proc;
		callback(null, res);
	});
}

Config.prototype.remServiceProcess = function(service, procId, callback){
	var self = this;
	self.zk.del('/peer/' + self.node.id + '/service/' + service + '/proc/' + proc.id, function(err, res){
		if(err)
			return callback(err, null);
		if(proc.type == TYPE_BROKER)
			self.services[service].broker.proc = null;
		else
			delete self.services[service].worker.proc[procId];
		callback(null, res);
	});	
}

Config.prototype.addServicePeer = function(service, peerId, peerInfo, callback){
	//console.log('addServicePeer', service, peerId, peerInfo)
	var self = this;
	self.zk.set('/peer/' + self.node.id + '/service/' + service + '/peer/' + peerId, utils.stringify(peerInfo), function(err, res){
		if(err)
			return callback(err, null);
		self._setServiceFields(service);
		self.services[service].peers[peerId] = peerInfo;
		callback(null, res);
	});
}

Config.prototype.updateServicePeer = Config.prototype.addServicePeer;

Config.prototype.remServicePeer = function(service, peerId, callback){
	var self = this;
	self.zk.del('/peer/' + self.node.id + '/service/' + service + '/peer/' + peerId, function(err, res){
		if(err)
			return callback(err, null);
		delete self.services[service].peers[peerId];
		callback(null, res);
	});
}

Config.prototype.watchPeers = function(callback){
	var self = this,
		children = {};
	self.zk.watchChildren('/peer', function(err, res){
			if(err)
				return callback(err, null);
			children = res;
		}, function(type, path){
			//reset watch
			self.watchPeers(callback);
			self.zk.getChildren('/peer', function(err, res){
				if(err)
					return callback(err, null);
				//check for delete
				for(var i in children)
					if(!res[children[i]])
						return callback(null, children[i]);
				//check for add
				for(var i in res)
					if(!utils.in_array(children, i))
						return callback(null, i);
				callback(null, null);
			});
			
		});
}

Config.prototype.getService = function(service, callback){		
	this.zk.get('/peer/' + this.node.id + '/service/' + service, function(err, res){
		//console.log('getService', utils.parse(res))
		if(err)
			return callback(err, null);
		callback(null, utils.parse(res));
	});
}

var getServiceInfo = function(service, nodeId, callback){		
	zk = ZooKeeper.Zookeeper({
		connect: "localhost:2181"
	 	,timeout: 200000
	 	,debug_level: ZooKeeper.ZOO_LOG_LEVEL_WARNING
	 	,host_order_deterministic: false
	}).get('/peer/' + nodeId + '/service/' + service, function(err, res){
		//console.log('getService', utils.parse(res))
		if(err)
			return callback(err, null);
		callback(null, utils.parse(res));
	});
}


var setNewService = function(obj){	
	if(!obj.broker)
		obj.broker = {};
	if(!obj.broker.state)
		obj.broker.state = 0;
	if(!obj.broker.config)
		obj.broker.config = {type: 1};
}

Config.prototype._setServiceFields = function(service, data){
	if(!this.services[service])
		this.services[service] = {};

	if(!this.services[service].broker)
		this.services[service].broker = {};
	if(!this.services[service].broker.state)
		this.services[service].broker.state = 0;
	if(!this.services[service].broker.config)
		this.services[service].broker.config = {type: 1};
	if(!this.services[service].broker.proc)
		this.services[service].broker.proc = null;

	if(!this.services[service].worker)
		this.services[service].worker = {};
	if(!this.services[service].worker.proc)
		this.services[service].worker.proc = {};

	if(!this.services[service].peers)
		this.services[service].peers = {};	
}


exports.config = 
exports.createConfig = function(options){
	var config = new Config(options);
	return config;
}


exports.TYPE_BROKER = TYPE_BROKER;
exports.TYPE_WORKER = TYPE_WORKER;
exports.getServiceInfo = getServiceInfo;