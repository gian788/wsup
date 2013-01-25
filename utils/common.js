var fs = require('fs');

/**
  * Check if a value is in the array
  * @param array array 
  * @param var value
  * @return boolean
  */
var in_array = function(array, value){
	for(var i in array)
		if (array[i] == value)
			return true;
	return false;
}

/**
  * Return the number of the object's properties
  * @param object object
  * @return int
  */
var length = function(object){
  if(typeof(object) != 'object')
    return 0;
  if(object.length > 0)
    return object.length;
  var len = 0;
  for(var i in object)
    len++;
  return len;
}

/**
  * Blocking sleep function
  * @param int millisecond millisecond to sleep
  */
sleep = function(milliseconds) {
  var start = new Date().getTime();
  for (var i = 0; i < 1e7; i++) {
    if ((new Date().getTime() - start) > milliseconds){
      break;
    }
  }
}

/**
  * Return the time in millisecond
  * @return int time in millisecond
  */
time = function(){
  return new Date().getTime();
}

parse = function(str){
  return JSON.parse(str);
}

stringify = function(obj){
  return JSON.stringify(obj);
}

/**
  * Generete a random string of specified length
  * @param int len length of the genereted string
  * @return string generated random string
  */
randomString = function(len){
  var str = '';  
  var chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXTZabcdefghiklmnopqrstuvwxyz'.split('')
  var chars_len = 61
  for (var i = 0; i < len; i++)
    str += chars[Math.floor(Math.random() * chars_len)]
  return str;
}

/**
  * Merge two object
  * @param object first object
  * @param object second object
  * @param boolean override if true override the first's object properties with the one's on the second object
  * @return object the merged object
  */
mergeObject = function(obj1, obj2, override){
  if(typeof(obj1) != 'object' || typeof(obj2) != 'object')
    throw new Error('Invalid Argument: the first two param must be two objects');

  if(override == 'undefined')
    override = true;
  var merge = {};
  for(var i in obj1)
    merge[i] = obj1[i];
  for(var i in obj2){
    if(override)
      merge[i] = obj2[i];    
  }
  return merge;
}

/**
  * Check the function condition every [interval] millisecond for [num] time
  * @param function fn the condition function
  * @param array args arguments of condition function
  * @param int interval millisecond time intervall between two condition check
  * @param int num max number of time to check the condition until it is true
  * @param boolean hasCallback set true if the condition function has a callback function
  * @param function callback callback function
  */
tryWithInterval = function(fn, args, interval, num, hasCallback, callback){
  var count = 0,
      res;
  if(hasCallback){
    var fnCall = 'fn(';
    var cb =  function(err, ret){
        res = ret;
      }; 
    for(var i in args)
        fnCall += 'args[' + i + ']' + ',';
      fnCall += 'cb)';   
    //console.log(args)   
  }
  
  var interId = setInterval(function(){
    if(hasCallback){    
      eval(fnCall)      
    }else{
      res = fn(args);
    }
    if(res){
      callback(null, res);
      clearInterval(interId);
    }
    if(++count >= num){
      callback(null, false);
      clearInterval(interId);
    };
  }, interval);
}


/* prototype function of default objects */

if (typeof String.prototype.startsWith != 'function') {
  String.prototype.startsWith = function (str){
    return this.slice(0, str.length) == str;
  };
}

if (typeof String.prototype.endsWith != 'function') {
  String.prototype.endsWith = function (str){
    return this.slice(-str.length) == str;
  };
}

var errorCallback = function(callback){
  if(callback)
    return callback(err, null);
  return;
}

var getConfigFromFile = function(path, callback){
  fs.readFile(path, function (err, data) {
    if(err) 
      return callback(err, null);
    callback(null, JSON.parse(data));
  })
}

var getConfigFromFileSync = function(path){
  var data = fs.readFileSync(path);
  return JSON.parse(data);  
}

var getHash = function(len){
  if(!len)
      return false;
  var hash = '' 
  var chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXTZabcdefghiklmnopqrstuvwxyz'.split('')
  var chars_len = 61
    for (var i = 0; i < len; i++)
      hash += chars[Math.floor(Math.random() * chars_len)]
  return hash
}

var getServerIp = function(){
    var os=require('os');
    var ifaces=os.networkInterfaces();
    for (var dev in ifaces) 
        for(var det in ifaces[dev])
            if (ifaces[dev][det].family == 'IPv4' && dev != 'lo') 
                return ifaces[dev][det].address;                            
    return "";
}


/* EXPORTS */

exports.in_array = in_array;
exports.length = length;
exports.parse = parse;
exports.stringify = stringify;
exports.randomString = randomString;
exports.mergeObject = mergeObject;
exports.tryWithInterval = tryWithInterval;
exports.sleep = sleep;
exports.time = time;
exports.errorCallback = errorCallback;
exports.getConfigFromFile = getConfigFromFile;
exports.getConfigFromFileSync = getConfigFromFileSync;
exports.getHash = getHash;
exports.getServerIp = getServerIp;