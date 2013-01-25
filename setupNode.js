var redis = require('redis').createClient(),
	prefix = require('./utils/prefix.js').redis,
	utils = require('./utils/common.js');

nodeId = '001';
nodeIp = '192.168.16.128';

//nodeId = '002';
//nodeIp = '192.168.16.67';

require('redis').createClient(6479, '192.168.16.128').sadd(prefix.peers, nodeId, function(err, res){
	if(err)
		return console.log(err);
	console.log('peer id ok');
});

//node id
redis.set(prefix.node.id, nodeId, function(err, res){
	if(err)
		console.log(err);
	else
		console.log('node id ok')
});
redis.set(prefix.node.ip, nodeIp, function(err, res){
	if(err)
		console.log(err);
	else
		console.log('node ip ok')
});	

require('child_process').fork('./exportService.js', ['-c', './config/service' + nodeId + '.json']);
