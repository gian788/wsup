var zmq = require('zmq'),
	socket_ctr = zmq.socket('router'),
	socket_pub = zmq.socket('pub'),
	socket_sub = zmq.socket('sub'),
	//child_process = require('child_process'),
	//forever =forever = require('forever-monitor'),
	utils = require('./utils/common.js'),
	lrp = require('./lrpManager/lrp.js'),
	servers = require('./config/servers.js'),
	confMod = require('./config.js'),
	config = confMod.config();	

const REQ_BOOT = 'bt',
	  REQ_ADD_PEER = 'ap',
	  REQ_REM_PEER = 'rp',
	  REQ_UPD_PEER = 'up';

const STATE_OFF = -1,
	  STATE_INIT = 0,
      STATE_READY = 1,
      STATE_ACTIVE = 2,
      STATE_NO_MANGER_PROCESS = 5;

const SUB_ALL = 'ALL';

var replyQueue = {},
	waitingReadyQueue = {},	
	nextReqId = 1;

process.on('exit', function(){
	mnb_close();
})

/* BEGIN BROKER OPS */

/** Add new worker process/es to the specified service broker
  * @param service 	broker_id	the broker id
  * @param int 		n 			number of new worked to be start up 
  * @param function callaback 	callback function
  */
var broker_add_worker = function(service, n, callback){
	var count = 0,
		errs = [],
		worker = config.services[service].worker;

	for(var i in worker.config.args)
		args.push(worker.config.args[i])

	for(i = 0; i < n; i++){
		var args = [config.newSocketId(service, confMod.TYPE_WORKER), config.services[service].broker.config.socket.lba];//'ipc:///tmp/55001'];//
		lrpManager.startProcess(worker.config.file, args, [], {service: service, procType: worker.config.procType, type: confMod.TYPE_WORKER}, function(err, res){
			if(err){
				errs.push(err);
			}else{
				res['procType'] = worker.config.procType;
				res['type'] = confMod.TYPE_WORKER;
				//console.log(res)
	  			config.addServiceProcess(service, res, function(err, r){
	  				count++;
	  				if(callback && count + errs.length >= n){
						if(errs.length == 0)
							callback(null, count);
						else
							callback(errs, count);
					}
				});		
			}
		});  	
	}
}

/** 
  * Remove workers from the specified service
  * @param string 	brokerId the broker id
  * @param int/array(string) n number of new worked to shut down
  * @param function callaback callback function
  */
var broker_rem_woker = function(service, n, callback){
	var count = 0,
		i = 0,
		errs = [],
		proc = config.services[service].worker.proc,
		brokerId = config.services[service].broker.id

	if(typeof(n) == 'number'){
		if(proc.length < n)
			n = proc.length;
		for(var id in proc){
			if(i++ >= n)
				break;
			(function(){
				var wId = id;
				//send(brokerId, REQ_REM_PEER, {n: n}, function(err, res){
					lrpManager.stopProcess(wId, function(err, res){
						if(err){
							errs.push(err);
						}else{
							delete proc[wId];
							count++;	
						}
						if(callback && count + errs.length >= n)
							config.remServiceProcess(service, wId, function(err, res){
								if(errs.length > 0)
									callback(errs, count);
								else
									callback(null, count);	
							});
					});
				//});
			})();		
		}
	}

	if(typeof(n) == 'object'){
		for(var i in n){
			if(proc[i]){
				//send(brokerId, REQ_REM_PEER, {id: config.services[service].worker.proc[n[i]].sockId}, function(err, res){
				(function(){
					var wId = i;
					lrpManager.stopProcess(n[wId], function(err, res){
						if(err){
							errs.push(err);
						}else{
							delete proc[wId];
							count++;	
						}
						if(callback && count + errs.length >= n)
							config.remServiceProcess(service, n[wId], function(err, res){
								if(errs.length > 0)
									callback(errs, count);
								else
									callback(null, count);	
							});
					});
				});
				//});
			}
		}
	}
}


/** 
  * Add broker peer
  * @param string 	broker_id the broker id
  * @param array	peer 	  array of broker peer
  * @param function callaback callback function
  */
var broker_add_peer = function(service, peer, callback){	
	//check if is already set the peer on service
	console.log('broker_add_peer', service, peer)
	if(!config.services[service].peers[peer])
		return callback('Error broker_add_peer: Wrong arguments.', null);
	var peerInfo = config.services[service].peers[peer],
		addr = peerInfo.socket.addr,
		id = peerInfo.socket.id;
	socket_ctr.send([config.services[service].broker.id, utils.stringify({req:REQ_ADD_PEER, addr: addr, id: id})]);
	config.addServicePeer(service, peer, peerInfo, callback);
}

/** 
  * Remove broker peer
  * @param string 	broker_id the broker id
  * @param array	peer 	  array of broker peer
  * @param function callaback callback function
  */
var broker_rem_peer = function(service, peer, callback){
	if(!config.services[service].peers[peer])
		return callback('Error broker_rem_peer: Wrong arguments.', null);
	var id = config.services[service].peers[peer].socket.id;
	socket_ctr.send([config.services[service].broker.id, utils.stringify({req:REQ_REM_PEER, id: id})]);	
	config.remServicePeer(service, id, callback);
}

/** 
  * Remove broker peer
  * @param string 	broker_id the broker id
  * @param array	peer 	  array of broker peer info to update
  * @param function callaback callback function
  */
var broker_update_peer = broker_add_peer;	


/* END OF BROKER OPS */

/* BEGIN OF MASTER NODE BROKER OPS */

/** 
  * Init the master node broker 
  * @param function callback
  */
var mnb_init = function(callback){
	var startServices = function(){
		console.log('LrpManager \t---\tUP');
		config.checkProcess(lrpManager, function(err, res){
			if(err)
				console.log(err);
				
			console.log('Check prev. active process: ' + (res ? 'OK' : 'some wrong process'));
		
			var count = 0,
				servicesNum = utils.length(config.services),
				errs = [];
			//start services
			console.log(config.services)
			for(var i in config.services){		
				(function(){
					var srv = i;
					mnb_start_service(srv, function(err, res){
						if(err)
							errs.push(err);
						console.log('Service - ' + config.services[srv].name + ' \t---\tUP')
						count++;
						if(count >= servicesNum){
							console.log(count + ' services started');									
							if(errs.length == 0)						
								return callback(null, count);
							return callback(errs, count);
						}
					});
				})();		
			}
		});
	}

	lrpManager = lrp.Manager();
	config.newId(function(err, res){
		//setup control socket		
		config.loadAndSetNodeInfo(function(){
			//console.log(config)
			//TODO PREV CONFIG
			socket_ctr.identity = config.node.id + 'mnb000001';
			socket_ctr.bindSync(config.mnb.controlAddress);
			socket_sub.subscribe(SUB_ALL);
			socket_pub.identity = config.node.id + 'mnbpub001';			
			socket_pub.bindSync(config.mnb.pubAddress);
			socket_ctr.on('message', handleControlMessage);	

			/*config.watchPeers(function(err, res){
				console.log(err, res)
				if(config.peers[res])
					handlePeerDown(res);
				else
					handlePeerUp(res);
			});*/

			config.setNodePublicSocket({addr:config.mnb.pubAddress, id: socket_pub.identity}, function(err, res){
				if(err){
					console.log('err: ', err);
				}				
				//load config from json
				loadServiceInfo(function(err, res){
					//console.log(err, res)

					//mnb peers discovery
					config.peersDiscovery(function(err, res){
						if(err){
							console.log('err: ', err);
						}
						//console.log(res)
						for(var i in res){
							mnb_add_peer(i);	
						}

						//start lrp manager
						if(lrpManager.isReady())
							startServices();
						else{
							lrpManager.on('ready', startServices);
						}
					});
				});
			});
		});
	});
}

/** 
  * Stop the master node broker  
  */
var mnb_close = function(){	
	console.log('stopAll')
	socket_ctr.close();
	socket_pub.close();
	socket_sub.close();
	lrp.stopAllProcess(function(err, res){
		callback(err, res);
	});
}


/** 
  * Start a service
  * @param string service service id
  * @param function callaback callback function
  */
var mnb_start_service = function(service, callback){
	var active = function(){
		config.services[service].state = STATE_READY;//			
		//console.log(service, config.services[service].worker.config)

		console.log('waitingReadyQueue')
		console.log(config.services[service].peers)

		if(config.services[service].worker && config.services[service].worker.config)
			mnb_active_service(service, callback);
		if(utils.length(config.services[service].peers) > 0)
			mnb_active_remote_service(service, callback);
	};
	//console.log('start service ', service, config.services[service].broker)
	if(config.services[service].broker.proc){
		//broker already active
		//console.log(service, ' broker already up', config.services[service].broker.proc)
		active();		
	}else{
		var broker = config.services[service].broker;
		var id = config.newSocketId(service, confMod.TYPE_BROKER);
		if(!id)
			return callback('Error: bad generated socket id for service "' + service +'".', null);	
		var args = [id, config.mnb.controlAddress];	
		for(var i in broker.config.args)
			args.push(broker.config.args[i]);

		waitingReadyQueue[id] = active;
		lrpManager.startProcess(broker.config.file ? broker.config.file : config.broker.defaultPath, args, [], {service: service, type: confMod.TYPE_BROKER, procType: lrp.TYPE_GENERIC}, function(err, res){
			//console.log('started broker',service);
			if(err)
				return callback(err, null);
			config.services[service].state = STATE_INIT;//		
			res['procType'] = lrp.TYPE_GENERIC;
			res['type'] = confMod.TYPE_BROKER;
			//console.log(res)
	  		config.addServiceProcess(service, res, function(err, r){
	  			if(err)
	  				return callback(err, null);	  				
			});
		});	
	}	
}

/** 
  * Activate a service
  * @param string service service id
  * @param function callaback callback function
  */
var mnb_active_service = function(service, callback){
	//console.log('active service', service);
	if(!config.services[service].worker){
		console.log('No worker config found for this service ' + service);
		callback(null, null);
	}
	var worker = config.services[service].worker,
		num;
	
	if(config.services[service].state != STATE_READY)
		return callback('Error: service not ready', null);
	//console.log(service)
	if(worker.proc &&  worker.config){
		
		if(utils.length(worker.proc) >= worker.config.startProcNum)
			return callback(utils.length(worker.proc));
		else
			num = worker.config.startProcNum - utils.length(worker.proc);
	}else{
		if(!worker.config)
			return callback(null, 0);
		num = worker.config.startProcNum;
	}		

	broker_add_worker(service, num, function(err, res){
		config.services[service].state = STATE_ACTIVE;//
		var socket = config.services[service].broker.config.socket;
		/*config.setServiceInfo(service, {socket: {addr: socket.cfa, id: socket.cfi}}, function(e, r){
			if(e){
				if(err){
					err.push(e);
				}else
					callback(e, res);	
			}else{
				callback(err, res);
			}
		})*/
		callback(err, res);
		//notify to other peers
	});		
}

/** 
  * Activate a service with remote worker
  * @param string service service id
  * @param function callaback callback function
  */
var mnb_active_remote_service = function(service, callback){
	//console.log('active remote service', service);
	//console.log('ars', service)
	if(config.services[service].state != STATE_READY)
		return callback('Error: service not ready', null);
	var peers = config.services[service].peers;
	//console.log(service,  'peers', peers)
	if(!peers)
		return callback('No peers found for service ' + service, null);
	//console.log(config.services)
	for(var i in peers){
		broker_add_peer(service, i, function(err, res){			
			if(err)
				return callback(err, null);
			return callback(null, res);
		});	
	}	
}

/** 
  * Stop a service
  * @param string service service id
  * @param boolean onlyWorker true to stop only worker and not the broker
  * @param function callaback callback function
  */
var mnb_stop_service = function(service, onlyWorker, callback){
	if(!callback){
		callback = onlyWorker;
		onlyWorker = false;
	}

	var stopBroker = function(){
		if(!onlyWorker)
			lrpManager.stopProcess(config.services[service].worker.proc.length, function(err, res){
				config.services[service].state = STATE_OFF;
				callback(err, res);
			});	
	}

	if(config.services[service].proc.length > 0)
		broker_rem_woker(service, config.services[service].worker.proc.length, function(err, res){
			config.services[service].state = STATE_READY;
			stopBroker();
		})
	else
		stopBroker();	
}

/**
  * Add a mnb peer and setup the pu/sub channel
  * @param string nodeId the node id
  */
var mnb_add_peer = function(nodeId){
	socket_sub.connect(config.peers[nodeId].socket.addr);
	socket_sub.subscribe(config.node.id);		
}


/** 
  * Publish node info like service status, perf index, ecc  
  */
var mnb_pub_nodeInfo = function(){
	//realtime 
	//0mq pub


	//static
	//zookper
}

/** 
  * Update peer info from peer 
  
  */
var mnb_update_peerInfo = function(){

}

/** Alert peer of critical info like service status changed
  
  */
var mnb_alert_peer = function(){
	//realtime

}


/* PRIVATE FUNCTION */

/**
  * Send a message and setup a callback for the reply
  * @param string 	brokerId
  * @param 			req
  * @param array 	args
  * @param function callback 
  */
var send = function(brokerId, req, param, callback){
	var reqId = nextReqId++;
	var args = {reqId: reqId, req: req};
	for(var i in param)
		args[i] = param[i];
	
	socket_ctr.send([brokerId, utils.stringify(args)]);
	if(!callback)
    	return;
  	replyQueue[reqId] = {t: new Date().getTime(), cb: callback};
}

var handleControlMessage = function(){
	var msg = utils.parse(arguments[1].toString());		
	//console.log(arguments[0].toString(), '-> ', msg);
	if(isReq(msg)){
		switch(msg.req){
			case REQ_BOOT:
				handleBoot(arguments[0]);			
			break;
		}			
	}else{
		//console.log('reply', replyQueue)
		if(replyQueue[msg.reqId]){
		    replyQueue[msg.reqId].cb(null, msg.res);
		    delete replyQueue[msg.reqId];
		}
	}
}	

/**
  * Send the reply to the request sender
  * @param string brokerId sender socket id
  * @param int reqId sender request id
  * @param object err
  * @param object res
  */
function reqCallback(brokerId, reqId, err, res){
  self._socket.send([brokerId, utils.stringify({'reqId': reqId, 'err': err, 'res': res})]);
}

/**
  * Check if the message is a request
  * @param object msg message
  * @returns boolean
  */
var isReq = function(msg){
	return msg.req ? true : false;
}

/**
  * Broker boot actions
  * @param string brokerId
  */
var handleBoot = function(brokerId){
	//console.log(config.services['nlb'].peers)		
	config.setBrokerSocket(brokerId, function(err, brokerConfig){
		if(err)
			return console.log(err);
		//console.log(brokerId, brokerConfig)
		send(brokerId, lrp.REQ_CONFIG, brokerConfig, waitingReadyQueue[brokerId]);	
	})	
}

/**
  *
  */
var handleReady = function(brokerId){
	reqCallback()
}


var newPeerLocalInfo = function(type, id, address){
	//TODO
	/*if(!brokers[type])
		return;

	var config = {
		id: id,
		addr: address
	}

	socket_ctr.send([brokers[type], JSON.stringify(config)]);*/
}


/** Return connection information for sending request to the specified 
  * service and send it to the broker.
  * @param string service
  */
var getServiceConnectionInfo = function(broker_id, args){
	if(!config.services[service] || !args['srv']){
		socket_ctr.send([broker_id, comm.WRONG_REQ]);
		return;
	}
	socket_ctr.send([broker_id, {
			addr: config.services[service].config.lfa,
			id: config.services[service].id
		}]);
	return;
}


var loadServiceInfo = function(callback){
	var serviceConfig = utils.getConfigFromFileSync(process.argv[2]); //'./config/service' + process.argv[2] + '.json');
	var count = 0;
	for(var i in serviceConfig){
		config.setServiceInfo(i, serviceConfig[i], function(err, res){
			if(err)
				return callback(err, null);
			count++;
			if(count == utils.length(serviceConfig)){
				callback(null, count);							
			}
		});
	}
}



//TODO DELETE DEBUG ONLY
if(process.argv.length < 3){
	console.log('Missing config file.');
	process.exit();
}


mnb_init(function(err, res){
	if(err)
		console.log(err)
	console.log('MN Broker ready at ' + config.mnb.controlAddress);
})			

