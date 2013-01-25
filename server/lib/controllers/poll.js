var m = require(process.cwd()+'/global/models');
//var Utils = require('./utils/utils');

var servers = require(process.cwd() + '/config/servers')
var
  sys = require('util'),
  mysql = require('mysql-libmysqlclient'),

postVote = function(args, user, callback){
	if(!args.poll || !args.value || !user)
		return callback(400, null);

	var conn = mysql.createConnectionSync();
	conn.connectSync(servers.MYSQL.host, servers.MYSQL.user, servers.MYSQL.password, servers.MYSQL.database);
	conn.setCharsetSync('utf8');
	if (!conn.connectedSync()) {
		  console.log("Connection error " + conn.connectErrno + ": " + conn.connectError);
	}
	conn.query('INSERT INTO polls (user, poll, value) VALUES (' + user.nosqlid + ', ' + args.poll + ', ' + args.value + ');', function(err, res2){
		
	});
	callback(null, '');
}

exports.addvote = postVote;

