var m = require(process.cwd()+'/global/models');
var db = require('../models/DB').db();
var ext = require('../models/extends');
var servers = require(process.cwd()+'/config/servers');

index = function(args, user, callback){
	var query = ['START n=node('+user.id+')',
				'MATCH (n)--(o)',
				'WHERE o.name =~ "(?i).*'+args['name']+'.*"',
				'RETURN o'].join('\n');
	db.query(query, function(err, results){
		if(err) return callback(err, null);
		var userMod = ext.getModel(m.USER);
		var users = results.map(function(res){
			return new userMod(res['n']);
		});
		callback(null, users);
	})
}

careers = function(args, user, callback){
	var uId = args['_id'];
	var query = ['START n=node(ID)',
				'MATCH (n)-[?:has_career]->(c)',
				'RETURN c'].join('\n')
				.replace('ID', uId);
	db.query(query, function(err, results){
		if(err) return callback(err, null);
		var carMod = ext.getModel(m.CAREER);
		var careers = results.map(function(res){
			return new carMod(res['c']);
		})
		callback(null, careers);
	})
}

get= function(args,user,callback){
	var query = ['START n=node('+args['_id']+'),u=node('+user.nosqlid+')',
				'MATCH (n)-[f?:friend]-(u)',
				'RETURN n,f'].join('\n');
	db.query(query,function(err,res){
		if(err)
			return callback(err,null);
		var uModel = ext.getModel(m.USER);
		var temp = new uModel(res[0]['n']);
		if(res[0]['f'])
			temp.addExtraProperty('friend',true);
		else
			temp.addExtraProperty('friend',false);
		callback(null, temp);
	})
}

update = function(args,user,callback){
	if(args['_id']!=user.nosqlid)
		return callback("User not allowed",null);
	var mod = ext.getModel(m.USER);
	if(!args['o'])
		return callback("Missing arguments",null);
	var o = args['o'];
	mod.getById(args['_id'], function(err, obj){ //return the object to update passing the id (data.o.i)
		var toSave = false;
		if(err) return callback(err)
		var partQuery = '';
		for(prop in o){
			obj[prop] = o[prop];
			partQuery+=prop +" = '"+o[prop]+"',";
		}
		partQuery = partQuery.substr(0,partQuery.length-1);
		obj.save(function(err1, result){
			if(err1){
				return callback(err1,null);
			}
			var
			  sys = require('util'),
			  mysql = require('mysql-libmysqlclient')
			var
				host = servers.MYSQL.host,
				user = "php",
				password = "x58l1030V59a6cW",
				database = "general"
			var conn = mysql.createConnectionSync();
			conn.connectSync(host, user, password, database);
			conn.setCharsetSync('utf8');
			if (!conn.connectedSync()) {
				  console.log("Connection error " + conn.connectErrno + ": " + conn.connectError);
			}
			conn.query("UPDATE user SET "+partQuery+" WHERE id="+obj.sqlid+";",function(err2,res2){
				if(err2)
					return callback(err2,null);
				callback(null, null);
			});				
		})
	});
}

getactivecareer = function(args,user,callback){
	if(!args['_id'])
		return callback('Missing arguments',null);
	var uId = args['_id'];
	var query = ['START n=node('+uId+')',
				'MATCh (n)-[:active_career]->(c)',
				'RETURN c'].join('\n');
	db.query(query,function(err, result){
		if(err)
			return callback(err,null)
		var cMod = ext.getModel(m.CAREER);
		callback(null, new cMod(result[0]['c']));
	})
}

addFriend = function(args, user, callback){
	
	require('../../notify/invite.js').addFriend(from,to,null);	
}

removeFriend = function(args,user,callback){
	if(!args['uId'])
		return callback('Missing arguments');
	var uModel = ext.getModel(m.USER);
	uModel.getById(user.nosqlid,function(err, u){
		if(err)
			return callback(err,null)
		u.removeFriendById(args['uId'],{},function(err,res){
			if(err)
				return callback(err,null)
			callback(null, true);
		})
	})
}

getfriends = function(args,user,callback){
	if(!args['_id'])
		return callback('Missing arguments',null);
	var query = ['START n=node('+args['_id']+')',
				'MATCH (n)-[:friend]-(s)',
				'RETURN s',
				'ORDER BY s.name, s.surname'].join('\n');
	db.query(query,function(err,results){
		if(err)
			return callback(err,null);
		var uModel = ext.getModel(m.USER);
		var temp = results.map(function(res){
			var t = new uModel(res['s']);
			t.addExtraProperty('friend',true);
			return t;
		})
		callback(null, temp);
	})
}


updatePassword = function(args, user, callback){
	if(args._id != user.nosqlid)
		return callback(400,null);
	if(!args.pass || !args.oldpass)
		return callback(400, null);

	var salt = '';
	var chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXTZabcdefghiklmnopqrstuvwxyz'.split('');
	var chars_len = 61;
	var l = 32;
    for (var i = 0; i < l; i++)
    	salt += chars[Math.floor(Math.random() * chars_len)];
	s = require('../../crypto/sha2.js').hash(salt + args.pass, { asString: true });
	var conn = require('mysql-libmysqlclient').createConnectionSync();
	conn.connectSync(servers.MYSQL.host, servers.MYSQL.user, servers.MYSQL.password, servers.MYSQL.database);
	conn.setCharsetSync('utf8');
	if (!conn.connectedSync()) {
		console.log("Connection error " + conn.connectErrno + ": " + conn.connectError);
	}
	conn.query('SELECT * FROM user WHERE nosqlid = "' + user.nosqlid + '";', function(err,res){
		if(err)
			return callback(err,null);
		if(res.affectedRows <= 0){
			callback('Invalid request', null);
			return;
		}	
		res.fetchAll(function (err, rows) {
			if (err) {
		      callback(err, null);
		      return;
		    }
			var testPass =  require('../../crypto/sha2.js').hash(rows[0].salt + args.oldpass, { asString: true });	
			if(testPass != rows[0].password)
				return callback(400, null);
			conn.query('UPDATE user SET password = "' + s + '", salt = "' + salt + '" WHERE id=' + user.uid + ";", function(err,res){
				if(err)
					return callback(err,null);
				return callback(null, '');
			});
		});
		
	});					
}

exports.addfriend = addFriend;
exports.getactivecareer = getactivecareer;
exports.index = index;
exports.update = update;
exports.getfriends = getfriends;
exports.get = get;
exports.removefriend = removeFriend;
exports.updatepassword = updatePassword;