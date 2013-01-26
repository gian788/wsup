var utils = require('./utils/common.js')
var ZooKeeper = require ("./utils/zookeeper"),
	zk = ZooKeeper.Zookeeper({
		connect: "localhost:2181"
	 	,timeout: 200000
	 	,debug_level: ZooKeeper.ZOO_LOG_LEVEL_WARNING
	 	,host_order_deterministic: false
	});

/*zk.set('/peers/001/socket/pub', 'pubsocket :)', function(err, res){
	console.log(err, res)
})*/

//console.log(ZooKeeper)

//FLUSH ZOOKEEPER
zk.delTree('/peer', function(err, res){
	console.log(err, res)
})
/*

zk.zk.aw_get('/peer/004/socket/pub', function(type, state, path){
	console.log(type, state, path);
	}, function(rc, error, stat, data){
		console.log(rc, error, stat, data);
	});

/*ar = [1,2,3,4,5,6,7,8,9,10]


for(var i in ar){
	var val = i;
	zk.getChildren('/peer/001/service', function(err, res){
		console.log(val, utils.time());
	});
}*/
/*
zk.set('/peer/001', 'ok', function(err, res){
		console.log(err, res.toString())
	});
/*
zk.watchChildren('/peer', function(err, res){
	console.log('ch',err, res)
	zk.set('/peer/005', 'node 4a', function(err, res){
		console.log('set',err, res)
	})
	}, function(err, res){
		console.log('watch',err, res)
	});
*/

/*zk.getChildren('/peer', function(err, res){
	console.log(err, res)
})

/*zk.setNode('/peer/002', 'node 2', function(err, res){
	//console.log(err, res)
	zk.get('/peer/002', function(err, res, stat){
		//console.log(err, res, stat	)
		if(!res)
			console.log('No node')
		else
			console.log(err, res.toString(), stat)
	})	
})

/*zk.get('/peer/002', function(err, res, stat){
	console.log(err, res, stat	)
	if(!res)
		console.log('No node')
	else
		console.log(err, res, stat)
})*/