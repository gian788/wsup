var m = require(process.cwd()+'/global/models');
var db = require('../models/DB').db();
var ext = require('../models/extends');
var Utils = require('./utils/utils');
var generic = require('./generic');

index = function(args, user, callback){
	if(!args['parentId'])
		return callback("Missing arguments",null);
	var pId = args['parentId'];
	var limit = 10;
	if(args['limit'])
		limit = args['limit'];
	var query = ['START n=node('+pId+')',
				'MATCH (n)<-[:place]-(p)-[:creator]->(c)',
				'WHERE p.objType = '+m.POST,
				'RETURN p,c',
				'ORDER BY p.t'].join('\n');
	db.query(query, function(error, results){
		if(error)
			return callback(error,null);
		var pModel = ext.getModel(m.POST);
		var uModel = ext.getModel(m.USER);
		var allResults = results.map(function(post){
			var t =new pModel(post['p']);
			t.addExtraProperty('creator',new uModel(post['c'])); 
			return t;
		})
		var start = allResults.length - limit;
		if(limit == -1)
			return callback(null, allResults);
		if(start<0)
			start = 0;
		var toReturn = new Array();
		for(var i = start; i<allResults.length; i++){
			toReturn.push(allResults[i]);
		}
		callback(null, toReturn);
	})
}

add = function(args, user, callback){
	if(!args['parent'] || !args['obj'] || !args['user'])
		return callback("Missing arguments");
	var type = m.POST;
	var data = {
		o:args['obj'],
		u:{
			i: args['user']['i'],
			t: args['user']['t']
		},
		p:{
			t:args['parent']['t'],
			i:args['parent']['i']
		}
	}
	generic.insert(type, data, function(err, result){
		if(err) return callback(err, null);
		result.object.addExtraProperty('creator', result.creator);
		callback(null, result.object);
	})
}

remove = function(args,user,callback){
	if(!args['_id'])
		return callback('Missing arguments');
	var query = ['START n=node('+args['_id']+')',
				'MATCH (n)-[:creator]->(c)',
				'RETURN n,ID(c) AS creator'].join('\n');
	db.query(query,function(err,result){
		if(err)
			return callback(err);
		if(result[0]['creator']!=user.nosqlid)
			return callback("Permission denied");
		var tModel = ext.getModel(m.POST);
		var topic = new tModel(result[0]['n']);
		topic.del(function(error,res){
			if(error)
				return callback(error);
			callback(null, 'deleted');
		})
	})
}

exports.index = index;
exports.add = add;
exports.remove = remove;