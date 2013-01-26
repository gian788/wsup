var utils = require('./utils/common.js')
var ZooKeeper = require ("./utils/zookeeper"),
	zk = ZooKeeper.Zookeeper({
		connect: "localhost:2181"
	 	,timeout: 200000
	 	,debug_level: ZooKeeper.ZOO_LOG_LEVEL_WARNING
	 	,host_order_deterministic: false
	});

//FLUSH ZOOKEEPER
zk.delTree('/peer', function(err, res){
	console.log(err, res);
	process.exit();
})
