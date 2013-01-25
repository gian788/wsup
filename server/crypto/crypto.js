/*var crypto = require('crypto');
var enc_algorithm = 'aes-256-cbc';*/
var aes = require('./aes.js');
var phpsessid_redis_field = 'sid';
var redisPrefix = require('../global/redis.js');
var redis = require('redis').createClient();
var enc_bit = 256;

function decrypt(text, key)
{
	var enc = aes.ctr.decrypt(text, key, enc_bit);
	return enc;
}

function encrypt(plain, key){
	/*var cipher = crypto.createCipher(enc_algorithm, key);
	var crypted = cipher.update(plain,'utf8','base64');
	crypted += cipher.final('base64');
	return crypted;*/	
	var enc = aes.ctr.encrypt(plain, key, enc_bit);
	return enc;
} 

decryptFromPhpsessid = function(phpsessid, text, callback){	
	redis.get(redisPrefix.PREFIX_PRESISTEN_SESSION + phpsessid, function(err, res){
		if(res == null){
			callback("PHPSESSID not founded",null);
			return;
		}
		res = JSON.parse(res);
		if(res.s_key){
			var dec = JSON.parse(decrypt(text, ''+res.s_key));	
			obj = {data:dec.data, user: res};
			if(dec.req_id < res.req_id || dec.req_id > res.req_id + 10){
				callback('***possible sidejacking for user ' + res.uid + '*** - (u:'+ res.req_id + ', r:' + dec.req_id + ')', obj);
				//TODO log this
				return;
			}else{
				res.req_id++;
				redis.set(redisPrefix.PREFIX_PRESISTEN_SESSION + phpsessid, JSON.stringify(res), function(err, res){
					if(err){
						callback('error on incrementing req_id', obj);
					}
					callback(null,obj);	
				});
				
			}
		}else
			callback("Session key not founded for this PHPSESSID");
	});
}


getUser = function(phpsessid, callback){
	if(!phpsessid){
		callback(null, null);
		return;
	}
	var redis = require('redis').createClient();
	redis.get(redisPrefix.PREFIX_PRESISTEN_SESSION + phpsessid, function(err, res){
		if(res == null){
			callback("PHPSESSID not founded",null);
			return;
		}
		res = JSON.parse(res);
		callback(null, res);		
	});
}
/*function encryptFromUserId(userId, plain, callback){
	var redisPrefix = require('../global/redis.js');
	var redis = require('redis').createClient();	
	redis.hget(redisPrefix.PREFIX_USER + userId, phpsessid_redis_field, function(err, res){
		console.log('phpsessid ' + res)
		if(res == null){
			callback("User not founded");
			return;
		}
		callback(null, encrypt(plain, res));
	});
}*/


exports.decryptFromPhpsessid = decryptFromPhpsessid;
exports.encrypt = encrypt;
exports.decrypt = decrypt;
exports.getuser = getUser;

/*
EXAMPLE:

var PHPSESSID = 'vn9u5jmve26o3ora50u8fg1j10';
var cipheredText = '3wOAat5HNlCgUrDMoq8=';
decryptFromPhpsessid(PHPSESSID, cipheredText, function(err, res){
	console.log(err);
	console.log(res);
})
*/

  
