var utils = require('./utils/common.js'),
	prefix = require('./utils/prefix.js'),
	confMod = require('./config.js'),
	Utils = require('./lib/controllers/utils/utils.js')
	config = confMod.config(),
	redis = require('redis').createClient(),
	zmq  = require('zmq'),
	EventEmitter = require('events').EventEmitter;


if(process.argv.length < 5){
	throw 'Illegal Argument: ' + arguments.length + ' arguments found, 4 required.';
}

var serviceId = process.argv[2],
	brokerAddress = process.argv[4], //'ipc:///tmp/55001'; 
	dealerIdentity = process.argv[3];
	nodeId = dealerIdentity.substring(0,3);

var obj,
	dealer;
var replyQueue = {},
	brokers = [],
	services = [];
console.log(process.argv)
confMod.getServiceInfo(serviceId, nodeId, function(err, res){
	obj = require(res.worker.config.file);
	dealer = zmq.socket('dealer');
	dealer.identity = dealerIdentity;
	dealer.connect(brokerAddress);	

	console.log('Dealer: ' + dealer.identity + ', connected to:' + brokerAddress)
	dealer.send(['READY']);

	var self = this;
	dealer.on('message', function(){
		var arr = Array.apply(null, arguments);
		var msg = utils.parse(arr[arr.length - 1].toString());	
		console.log('* ', msg)
		if(typeof(obj[msg.fn]) == 'function'){
			var args = msg.args;		
			args.push(function(err, res){
				arr[arr.length - 1] = utils.stringify({reqId: msg.reqId, err: err, res: res == null ? null : Utils.toJson(res)});
				dealer.send(arr);
				//console.log(err, Utils.toJson(res))
			});
			obj[msg.fn].apply(obj, args);
		}
	});

})




