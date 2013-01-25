var utils = require('./utils/common.js'),
	Utils = require('./lib/controllers/utils/utils.js')
	zmq  = require('zmq'),
	modConf = require('./direct_query/modulesConfig.js');

if(process.argv.length < 5){
	throw 'Illegal Argument: ' + arguments.length + ' arguments found, 4 required.';
}

var service = process.argv[2],
	brokerAddress = process.argv[4], 
	dealerIdentity = process.argv[3];
console.log(process.argv);

var dealer,
	self = this;
var reqContr = [],
	replyQueue = {},
	brokers = [],
	services = [];

dealer = zmq.socket('dealer');
dealer.identity = dealerIdentity;
dealer.connect(brokerAddress);	
console.log('Dealer: ' + dealer.identity + ' ' + brokerAddress);
dealer.send(['READY']);

dealer.on('message', function(){
	var arr = Array.apply(null, arguments);
	var msg = utils.parse(arr[arr.length - 1].toString());	
	console.log('* ', msg)
	var contr = msg.args[0],
		func = msg.args[1];
	msg.args.splice(0, 2);
	console.log(modConf.getControllerPath(contr), contr, func, msg.args)
	if(!reqContr[contr]){
		var r = require(modConf.getControllerPath(contr));
		if(!r){
			arr[arr.length - 1] = utils.stringify({reqId: msg.reqId, err: 400, res: null});
			dealer.send(arr);
		}else{
			reqContr[service] = r;
		}			
	}
	if(typeof(reqContr[service][func]) == 'function'){
		msg.args.push(function(err, res){
			console.log(err, res)
			arr[arr.length - 1] = utils.stringify({reqId: msg.reqId, err: err, res: res ? Utils.toJson(res) : null});
			dealer.send(arr);
		});
		reqContr[service][func].apply(reqContr[service], msg.args);
	}
});

	

	






