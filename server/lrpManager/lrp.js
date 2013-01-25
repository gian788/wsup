var path = require('path'),
    forever = require('forever'),
    child_process = require('child_process'),
    spawn = child_process.spawn,
    EventEmitter = require('events').EventEmitter
    zmq = require('zmq'),
    utils = require('../utils/common.js'),
    nodeUtil = require('util');

const managerAddress = 'ipc:///tmp/pm',
      managerSockId = '001lrp000001',
      managerExistTryTimeout = 1000,
      mangerPath = './lrpManager/process_manager.js',//TODO set correct dynamic dir
      MAX_CONNECT_RETRY = 20,
      CONNECT_RETRY_INTERVAL = 200,
      HEARTBEATING_INTERVAL = 5000,
      MAX_NO_HEARTBEAT = 3;

const REQ_HEARTBEAT = 'hb',
      REQ_START_PROCESS = 'sp',
      REQ_STOP_PROCESS = 'kp',      
      REQ_RECOVERY = 're',
      REQ_PROC_INFO = 'pi',
      REQ_UPDATE_PROC_INFO = 'pu';

const STATE_INIT = 0,
      STATE_READY = 1,
      STATE_NO_MANGER_PROCESS = 5;

const TYPE_JS = 0,
      TYPE_GENERIC = 1,
      TYPE_JAVA = 2,      
      TYPE_WRAPPED_JS = 10;

/**
 * Create a new lrp manager comunicator
 *
 * @constructor
 * @api public
 */
function Manager() {
  this._socket = zmq.socket('dealer');
  this._socket.identity = managerSockId;
  this._socket.connect(managerAddress);
  this._nextReqId = 1;  
  this._lastHeartbeat;
  this._state = STATE_INIT;
  this._replyQueue = {};
  this._mProc = {};
  
  var self = this;  
  startManager(this, function(){    
    self._socket.on('message', function(){
      self._lastHeartbeat = utils.time();
      handleIncomingMessage(self, arguments);
    });
    self.getProcess(function(err){
      self._state = STATE_READY; 
      self.emit('ready');         
    })
    startHeartbeating(self);    
  });
};

Manager.prototype.__proto__ = EventEmitter.prototype;

/**
  * Start long running process
  * @param string file he filename of the program to run
  * @param array args params to pass to the process
  * @param object options options passed along to `child_process.spawn`
  * @param object info info handled by lrpm associated with the prossess
  * @param function callaback callback function
  * @api public
  */
Manager.prototype.startProcess = function(file, args, options, info, callback){
  var self = this;
  send(this, REQ_START_PROCESS, {file: file, args: args, options: options, info: info}, function(err, res){
    if(err)
      return callback(err, null)
    self._mProc[res.lrpId] = {
      info: info
    };
    res.args = args;
    callback(null, res);
  });
}

/**
  * Stop a long running process
  * @param string id id of the lr process
  * @param function callback callback function
  * @api public
  */
Manager.prototype.stopProcess = function(id, callback){
  var self = this;
  send(this, REQ_STOP_PROCESS, {id: id}, function(){
    delete self._mProc[id];
  });
}

/**
  * Stop all running process
  * @param string id id of the lr process
  * @param function callback callback function
  * @api public
  */
Manager.prototype.stopAllProcess = function(callback){
  var self = this;
  for(var id in self._mProc){
    send(this, REQ_STOP_PROCESS, {id: id}, function(){
      delete self._mProc[id];
    });  
  }  
}

/**
  * Return info about processes managed by the lrp manager
  * @param function callback callback function
  * @api public
  */
Manager.prototype.processesInfo = function(callback){
  send(this, REQ_PROC_INFO, {}, callback);  
}

/**
  * Set info about processes managed by the lrp manager
  * @param array info info about the processes
  * @param function callback callback function
  * @api public
  */
Manager.prototype.setProcessesInfo = function(info, callback){
  var upInfo = {};
  for(var i in info){
    if(this._mProc[i]){
        this._mProc[i].info = info[i];
        upInfo[i] = info[i];
    }
  }
  send(this, REQ_UPDATE_PROC_INFO, {info: upInfo});  
}


/**
  * Check if the lrp manager is ready
  * @return boolean 
  * @api public
  */
Manager.prototype.isReady = function(){
  return this._state == STATE_READY ? true : false;
}

/**
  * Get the process form the lrp process manager
  * @param function callback callback function
  * @api public
  */
Manager.prototype.getProcess = function(callback){
  var self = this;
  send(this, REQ_RECOVERY, {}, function(err, res){
    if(err)
      return callback(err, null)
    for(var i in res){
      self._mProc[i] = res[i];
    }
    callback(null, utils.length(res));
  });
}

/**
  * Check if the specified process/es is active
  * @param string/array proc processId or processes object or id
  * @param function callback callback function; the res object is {ok, no} with two array
  * @api public
  */
Manager.prototype.checkProcess = function(proc){
  var self = this,
      ok = {},
      no = [];
  if(typeof(proc) == 'string'){
    return self._mProc[proc] ? self._mProc[proc] : false;
  }else{
    for(var i in proc){
      if(typeof(i) == 'number'){
        if(self._mProc[proc[i]]){
          ok[proc[i]] = self._mProc[proc[i]];
        }else{
          no.push(proc[i]);
        }
      }else{
        if(self._mProc[i]){
          ok[i] = self._mProc[i];
        }else{
          no.push(i);
        }
      }
    }
    return {ok: ok, no: no};
  }
}

/**
  * Reply with the recovery info to the lrp manager process
  * @param array info info about the processes
  * @param function callback callback function
  * @api public
  */
Manager.prototype.replyRecovery = function(reqId){
  var info = {};
  for(var i in this._mProc){    
    info[i] = {info: this._mProc[i].info};
  }  
  reqCallback(this, reqId, null, info);
}

/**
  * Return the absolute path of the script from the current working directory
  * @param string script the script filename
  * @return string absolute path of the script
  * @api public
  */
var scriptFromCWD = function(script){
  return  path.join(__dirname, script);
}


/**
  * Send a request to lrp manager 
  * @param object self
  * @param ENUM(int) req request code
  * @param array param request params
  * @param funtion callback callback function
  */
function send(self, req, param, callback){
  var reqId = self._nextReqId++; 
  var args = {req: req, reqId: reqId};
  for(var i in param){
    args[i] = param[i];
  } 
  self._socket.send([utils.stringify(args)]);
  if(!callback)
    return;
  self._replyQueue[reqId] = {t: new Date().getTime(), cb: callback};
}

/**
  * Send the reply to the request sender
  * @param string sockId sender socket id
  * @param int reqId sender request id
  * @param object err
  * @param object res
  */
function reqCallback(self, reqId, err, res){
  self._socket.send([utils.stringify({'reqId': reqId, 'err': err, 'res': res})]);
}

/**
  * Start the lrp manager, if the lrp manager is already up does nothing
  */
startManager = function(self, callback){
  var pm_on = false;
  var connRetry = 0;

  self._socket.once('message', function(){
    var msg = utils.parse(arguments[0]); 
    if(msg.req == REQ_HEARTBEAT || msg.req == REQ_RECOVERY){
      clearInterval(interId);
      nodeUtil.print('\n')
      pm_on = true;
      callback();   
      if(msg.req == REQ_RECOVERY)
        self.emit('recovery');
    }
  });

  var spawned = false;
  var spawnedDI = false;
  var interId = setInterval(function(){

      if(!pm_on && connRetry < MAX_CONNECT_RETRY){
        var reqId = self._nextReqId++;
        self._socket.send([utils.stringify({req: REQ_HEARTBEAT, reqId: reqId})]);
        connRetry++;
        //console.log(connRetry)
        nodeUtil.print('.')
      }else{
        if(!spawned){
          spawned = true;
          var child = spawn('forever', ['start', mangerPath], {detached: true, stdio:  ['ignore', 'ignore', 'ignore']});
          child.once('start', function(){
            callback();
            clearInterval(interId);
          });
          connRetry = 0;  
        }else{
          if(!spawnedDI){
            connRetry = 0;
            spawnedDI = true;  
          }else{
            callback('Fatal Error: unable to start process manager!');
            clearInterval(interId);
          }          
        }
        
      }    
    }, CONNECT_RETRY_INTERVAL); 
  return;
}

/**
  * Handle an incoming message form the lru manager process
  */
function handleIncomingMessage (self, arguments){
  var msg = utils.parse(arguments[0]);
  /*if(msg.req != REQ_HEARTBEAT){
    console.log('------------------------------------------------')
    console.log('*', msg);
  } */ 
  if(isRequest(msg)){
    //Request
    switch(msg.req){
      case REQ_RECOVERY:
        self.replyRecovery(msg.reqId);
      break;
      case REQ_HEARTBEAT:
        handleHeartbeat(self)
      break;
    }
  }else{
    //Reply
    if(self._replyQueue[msg.reqId]){
      self._replyQueue[msg.reqId].cb(msg.err, msg.res);
      delete self._replyQueue[msg.reqId];
    }
  }
}

/**
  * Start heartbeating
  */
function startHeartbeating(self){
  self._connRetry = 0;

  setInterval(function(){    
    if(self._lastHeartbeat < utils.time() - (2 * HEARTBEATING_INTERVAL))
      self._noHeartbeatCount++;
    else
      self._noHeartbeatCount = 0;

    if(self._noHeartbeatCount > MAX_NO_HEARTBEAT){
      self._state = STATE_NO_MANGER_PROCESS;
      self.emit('error')
    }

    self._socket.send(utils.stringify({req: REQ_HEARTBEAT}));
    
  }, HEARTBEATING_INTERVAL);
}

/**
  * handle the heartbeat request
  */
function handleHeartbeat(self){
  self._lastHeartbeat = utils.time();  
}
  

/**
  * Check if the message is a request
  * @param object msg parsed request message
  */
function isRequest(msg){
  if(msg.req)
    return true;
  return false;
}


exports.Manager = function(options) {
  var manager = new Manager();
  //for (var key in options) sock[key] = options[key];
  return manager;
};

exports.scriptFromCWD = scriptFromCWD;

exports.REQ_HEARTBEAT = REQ_HEARTBEAT;
exports.REQ_START_PROCESS = REQ_START_PROCESS;
exports.REQ_STOP_PROCESS = REQ_STOP_PROCESS;
exports.REQ_RECOVERY = REQ_RECOVERY;
exports.REQ_PROC_INFO = REQ_PROC_INFO;
exports.REQ_UPDATE_PROC_INFO = REQ_UPDATE_PROC_INFO;




exports.TYPE_JS = TYPE_JS;
exports.TYPE_GENERIC = TYPE_GENERIC;
exports.TYPE_JAVA = TYPE_JAVA;