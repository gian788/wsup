var comMod = require('./comunicationModule.js'),
	cm = comMod.CM(this, '001qryW01001', 'ipc:///tmp/56000', '001qryC01001'),
	self = this;
	test = cm.getService('tst');

comMod.checkAllServiceReady([test], function(){
	cm.ready();
	
	test.a(1, 'second', function(err, res){
		console.log(err, res);
	});
	test.b(5, function(err, res){
		console.log(err, res);
	});
})
