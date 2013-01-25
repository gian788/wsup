var servers = require(process.cwd()+'/config/servers');

add= function(args,user,callback){
	var
		sys = require('util'),
		mysql = require('mysql-libmysqlclient')
	var
		host = servers.MYSQL.host,
		_user = "php",
		password = "x58l1030V59a6cW",
		database = "general"
	var conn = mysql.createConnectionSync();
	conn.connectSync(host, _user, password, database);
	conn.setCharsetSync('utf8');
	var objId = args['objid'];
	var userId = user.nosqlid;
	var why = args['why'];
	if(args['description'])
		var description = args['description'].replace(/"/g,'');
	var partQuery = '(objid,user,why) VALUES ('+objId+','+userId+','+why+')';
	if(args['description'])
		partQuery = '(objid,user,why,description) VALUES ('+objId+','+userId+','+why+',"'+description+'")';
	if (!conn.connectedSync()) {
		  console.log("Connection error " + conn.connectErrno + ": " + conn.connectError);
	}
	console.log(partQuery)
	conn.query("INSERT INTO abuse_report "+partQuery+";",function(err2,res2){
		if(err2)
			return callback(err2,null);
		callback(null, null);
	});	
}

exports.add = add;