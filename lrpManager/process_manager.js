var path = require('path'),
    forever = require('forever'),
    child_process = require('child_process'),
    spawn = require('child_process').spawn,
    zmq = require('zmq'),
    utils = require('../utils/common.js');

const REQ_START_PROCESS = 'sp',
      REQ_STOP_PROCESS = 'kp',
      REQ_HEARTBEAT = 'hb',
      REQ_PROC_INFO = 'pi',
      REQ_RECOVERY = 're',
      REQ_UPDATE_PROC_INFO = 'pu';

const STATE_INIT = 0,
      STATE_READY = 1,
      STATE_RECOVERY = 3;

const TYPE_JS = 0,
      TYPE_GENERIC = 1,
      TYPE_JAVA = 2,
      TYPE_SERVICE_WRAP = 3,
      TYPE_WRAPPED_JS = 10,

      BROKER = 0,
      WORKER = 1;

const sockId   = '001pmp000001',
      sockAddr = 'ipc:///tmp/pm',
      myProcId = 'p-m',
      RECOVERY_TEST_INTERVAL = 200;

const wrapperPath = './wrapper.js';

var reqCount = 0.
    nextReqId = 0,
    state = STATE_INIT,
    m_child = {},
    replyQueue = {},
    client = {};

init();

/**
  * Initialize the lrp manager process
  */
function init(){
  findMyProcesses(function(err, res){
    console.log('Active process:')
    console.log(res)
    if(res.length > 0){
      state = STATE_RECOVERY;
      for(var i in res)
        m_child[res[i]] = {};
    }    
    pmSocket = zmq.socket('router'); 
    pmSocket.identity = sockId;
    pmSocket.bindSync(sockAddr);
    pmSocket.on('message', function(){
      handleIncomingMessage(arguments);
    })
    state = STATE_READY;
  });
}

/**
  * Start long running process with forever
  * @param string file he filename of the program to run
  * @param array args params to pass to the process
  * @param object options options passed along to `child_process.spawn`
  * @returns config.services child_process
  */
startProcess = function(msg, callback){ 
  if(!msg.file)
    callback('Error: wrong filename passed!', null);

  var opt = {
      silent: true,
      spawnWith: {
        detached: true
      }
  };

  for(var i in msg.options){
    if(!opt[i] || (typeof(msg.options[i]) != 'object'))
      opt[i] = msg.options[i];
    else
      opt[i] = utils.mergeObject(opt, msg.options[i]);    
  }

  var id = newProcId();
  var type = msg.info.procType ? msg.info.procType : TYPE_JS; 
  var cmd = 'forever start ';
  console.log(msg)
  switch(type){
    case TYPE_JS:
      cmd += msg.file;
    break;
    case TYPE_JAVA:
      cmd += '-c java ' + msg.file;
    break;
    case TYPE_GENERIC:
      cmd += './lrpManager/up.js ' + msg.file;
    break;
    case TYPE_SERVICE_WRAP:
      cmd += msg.file + ' ' + msg.info.service;
    break;
    case TYPE_WRAPPED_JS:
      cmd += wrapperPath + ' ' + msg.info.service;
    break;
  }
  for(var i in msg.args){
    cmd += ' ' + msg.args[i];
  }
  cmd += ' -' + myProcId + id;
  console.log(cmd)
  /*if(type == TYPE_GENERIC){
    cmd = msg.file;    
    for(var i in msg.args){
      cmd += ' ' + msg.args[i];
    }    
    console.log(cmd)
    opt = {};
    var child = child_process.exec(cmd, opt, function(err, stdo, stde){
      console.log(err)      
    });
  }else{*/
    if(type == TYPE_GENERIC){
        opt = {
        };
    }
    var child = child_process.exec(cmd, opt, function(err, stdo, stde){
      if(err)
        console.log(err);
      utils.tryWithInterval(checkProcessWithLrpId, [id], 200, 10, true, function(err, res){
        if(!res)
          callback(err, null);
        m_child[res] = {        
          info: msg.info ? msg.info : {}
        };
        if(typeof(callback) == 'function')
          callback(err, {lrpId: res});
      });    
    });  
  //}
  
}

/**
  * Stop a long running process
  * @param string id id of the lr process
  */
stopProcess = function(id, callback){  
  if(!m_child[id])
    return callback('Error: wrong process id', null);
  child_process.exec('forever stop ' + id, [], function(err, stdo, stde){
    callback(null, null);
  });
}

/**
  * Return the info associated to the managed lrp
  * @param function callback callback function
  */
processesInfo = function(callback){
  var info = {};
  for(var i in m_child)
    if(m_child[i].info)
      info[i] = m_child[i].info;
    else
      info[i] = {};
  callback(null, info);
}

/**
  * Return the info associated to the managed lrp
  * @param function callback callback function
  */
heartbeating = function(clientId){
  if(!utils.in_array(m_child, clientId))
      client[clientId] = {};
  pmSocket.send([clientId, utils.stringify({req: REQ_HEARTBEAT})]);
}

/**
  * Start the recovery procedure with the client
  * @param string clientId client id
  */
recoveryClient = function(callback){
  var procs = {};
  for(var i in m_child){
    if(!m_child[i].info)
      procs[i] = {};
    else
      procs[i] = m_child[i].info;
  }
  callback(null, procs);
}

/*recoveryClient = function(clientId){
  send(clientId, REQ_RECOVERY, [], function(err, res){
    var err = {};

    for(var i in res){
      if(m_child[i]){
        m_child[i] = {
          info: res[i]
        }
      }else{        
        err.push(i);
      }
    }

    if(err.length)
      send(clientId, REQ_PROC_DEAD, err);    
    
    if(!client[clientId])
      client[clientId] = {};
  });
}*/

/**
  * Set info about managed processes 
  * @param array info info about the processes
  */
updateProcessesInfo = function(info){
  for(var i in info){
    if(m_child[i]){
      m_child[i].info = info[i];
    }
  }
}



function handleIncomingMessage(arguments){
  reqCount++;
  var msg = utils.parse(arguments[1]);
  var sender = arguments[0];

  /* FOR DEBUG ONLY */
  if(msg.req != REQ_HEARTBEAT){
    console.log('------------------------------------------------')
    console.log(reqCount + ': ' + sender + ': ');// + arguments[1].toString());
  }
  /* FOR DEBUG ONLY */
  
  if(isRequest(msg)){
    //request
    if(state == STATE_RECOVERY && !client[sender])
      recoveryClient(sender);

    switch(msg.req){
      case REQ_HEARTBEAT:
        heartbeating(sender);
      break;      
      case REQ_START_PROCESS:
        startProcess(msg, function(err, res){
            reqCallback(sender, msg.reqId, err, res);
        });
      break;
      case REQ_STOP_PROCESS:
        stopProcess(msg.id, function(err, res){
            reqCallback(sender, msg.reqId, err, res);
        });
      break;
      case REQ_PROC_INFO:
        processesInfo(function(err, res){
          reqCallback(sender, msg.reqId, err, res);
        });
      break;
      case REQ_UPDATE_PROC_INFO:
        updateProcessesInfo(msg.info);
      break;
      case REQ_RECOVERY:
        recoveryClient(function(err, res){
          reqCallback(sender, msg.reqId, err, res);
        });

      break;
    }  
  }else{
    //reply
    if(replyQueue[msg.reqId]){
      replyQueue[msg.reqId].cb(null, msg.res);
      delete replyQueue[msg.reqId];
    }
  } 
}

/**
  * Check if the lrp with the specified id exist
  */
function checkProcessWithLrpId(id, callback){
  forever.list(false, function (err, data) {
    if(err)
      callback(err, null);
    for(var i in data){
      var options = data[i].options;
      for(var j in options){
        if(options[j] == '-' + myProcId + id)
          return callback(null, data[i].uid);       
      }
    }
    return callback(null, false);
  });
}

/**
  * Return the process managed by the lrp pm
  */
function findMyProcesses(callback){
  forever.list(false, function (err, data) {
    if(err)
      callback(err, null);
    var res = [];
    for(var i in data){
      var options = data[i].options;
      for(var j in options)
        if(options[j].startsWith('-' + myProcId))
          res.push(data[i].uid)
    }
    return callback(null, res);
  }); 
}

/**
  * Return a new lrp id
  */
function newProcId(){
  var id = utils.randomString(4);
  while(utils.in_array(m_child, id))
    id = utils.randomString(4);
  return id;
}

/**
  * Send the reply to the request sender
  * @param string sockId sender socket id
  * @param int reqId sender request id
  * @param object err
  * @param object res
  */
function reqCallback(sockId, reqId, err, res){
  pmSocket.send([sockId, utils.stringify({'reqId': reqId, 'err': err, 'res': res})]);
}

/**
  * Send a request to lrp manager 
  */
function send(clientId, req, param, callback){
  var reqId = nextReqId++; 
  var args = {req: req, reqId: reqId};
  for(var i in param){
    args[i] = param[i];
  } 
  pmSocket.send([clientId, utils.stringify(args)]);
  if(!callback)
    return;
  replyQueue[reqId] = {t: new Date().getTime(), cb: callback};
}

/**
  * Check if the message is a request
  */
function isRequest(msg){
  if(msg.req)
    return true;
  return false;
}