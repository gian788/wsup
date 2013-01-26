var ZooKeeper = require('zookeeper'),
	utils = require('./common.js');


for(var key in ZooKeeper) {
	if(typeof(ZooKeeper[key]) == 'number')
  		exports[key] = ZooKeeper[key];  
}


function Zookeeper(options){
	this.zk = new ZooKeeper(options);
	this.zk.init();
}
	    
Zookeeper.prototype.setNode = function(path, data, callback){
	var self = this;
	self.zk.a_exists(path, false, function(rc, err, stat){
	  	if(rc == ZooKeeper.ZOK){
	  		self.zk.a_set(path, data, stat.version, function(rc, err, stat){
		    	if (rc != 0)
		            return callback(err, null);
		        callback(null, data);
	  		});
	  	}else{
	  		self.zk.a_create(path, data, 0, function(rc, err, path){
		    	if (rc != 0)
		            return callback(err, null);
		        callback(null, data);
		    });
	  	}
	});
}

Zookeeper.prototype.existsParentNode = function(path, callback){
	var self = this;
	self.zk.a_exists (path, false, function(rc, err, stat){
	  	if(rc == ZooKeeper.ZNONODE){
	  		var newPath = path.substring(0, path.lastIndexOf('/'));
	  		if(newPath.length == 0)
	  			newPath = '/';
	  		self.existsParentNode(newPath, callback);
	  	}else
	  		return callback(err, path);
	});
}

Zookeeper.prototype.set = function(path, data, callback){
	var self = this;
	self.existsParentNode(path, function(err, res){
		if(res.length == 1)
			res = '';		
		var remaining = path.substring(res.length + 1).split('/');
		if(remaining.length == 0)
			remaining.push('');
		var i = 0;
		var recFn = function(){
			res += '/' + remaining[i++];			
			if(res.length > 1 && res[res.length - 1] == '/')
				res = res.substring(0, res.length - 1)		
			if(i < remaining.length){
				self.setNode(res, '', function(err, r){
				    if (err)
				    	return callback(err, null);
					recFn();
				});
			}else{				
				self.setNode(res, data, function(err, r){
				    return callback(err, data);
				});				
			}			
		};
		recFn();
	});
}

Zookeeper.prototype.get = function(path, callback){
	this.zk.a_get(path, false, function(rc, err, stat, data){
		if(rc != 0)
			if(rc == ZooKeeper.ZNONODE)
				return callback(null, null, null);
			else
				return callback(err, null, null);
		callback(null, data, stat)
	});
}

Zookeeper.prototype.getChildren = function(path, callback){
	var self = this;
	self.zk.a_get_children(path, false, function(rc, err, children){
	    if(rc != 0)
	    	return callback(err, null);
	    if(children.length == 0)
	    	callback(null, []);
	    var count = 0,
	    	ch = {};
	    for(var i in children){
	    	(function(){
	    		var srv = children[i];
	    		self.get(path + '/' + srv, function(err, res){
		    		if(err)
		    			return callback(err, null);
		    		ch[srv] = res;
		    		if(++count == children.length)
		    			return callback(null, ch);
		    	});
	    	})();	    	
	    }
	});
}

Zookeeper.prototype.exists = function(path, callback){
	this.zk.a_exists (path, false, function(rc, err, stat){
	  	if(rc != 0){
	  		if(rc == ZooKeeper.ZNONODE){
	  			callback(null, false);
	  		}
	  	}else
	  		return callback(null, true);
	});
}

Zookeeper.prototype.del = function(path, callback){
	this.zk.a_delete_(path, -1, function(rc, err){
		if(rc != 0)
			return callback(err, null);
		callback(null, true);
	});
}

Zookeeper.prototype.watchChildren = function(path, cbChildren, cbWatch){
	this.zk.aw_get_children(path, function(type, state, path){
		if(type == ZooKeeper.ZOO_CHILD_EVENT)
			cbWatch(null);
		else
			cbWatch(type, path);
	}, function(rc, err, children){
		if(rc != 0)
	    	return cbChildren(err, null);
	    return cbChildren(null, children);
	});
}

Zookeeper.prototype.delTree = function(father, callback){
	var self = this;
	self.getChildren(father, function(err, children){
		if(err)
			return callback(err, null)
		if(utils.length(children) == 0){
			self.del(father, function(err, res){
				callback(err, 1);
			});
		}else{
			var count = 0;
			var deleted = 0;
			for(var i in children){				
				self.delTree(father + '/' + i, function(err, res){
					deleted += res;
					if(err)
						return callback(err, null);					
					if(++count == utils.length(children)){
						self.del(father, function(err, res){
							if(err)
								return callback(err, null)
							callback(null, deleted + 1);
						});							
					}
				});			
			}
		}
	});
}


exports.Zookeeper = function(options){
	return new Zookeeper(options);
}