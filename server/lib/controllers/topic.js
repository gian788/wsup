var m = require(process.cwd()+'/global/models');
var db = require('../models/DB').db();
var ext = require('../models/extends');
var Utils = require('./utils/utils');
var generic = require('./generic');

index = function(args, user, callback){
	if(!args['parentId'])
		return callback('Missing arguments');
	var id = args['parentId'];
	var whereQuery = 'WHERE t.objType = '+m.TOPIC+' ';
	for(i in args){
		if(i!='parentId' && args[i]!=""){
			if(args[i].indexOf('*')===0)
				args[i]= args[i].substring(1, args[i].length-1);
			if(args[i].indexOf('*')===args[i].length-1)
				args[i]= args[i].substring(0, args[i].length-2);
				whereQuery += 'AND dp.'+i +' =~ "(?i).*'+args[i]+'.*" '
			}
	}
	if(user.type == 1)
		whereQuery+= ' AND not(HEAD(extract(a in RELATIONSHIPS(q) : a.areaType?)) = 3)';
	if(user.type == 2)
		whereQuery+= ' AND not(HEAD(extract(a in RELATIONSHIPS(q) : a.areaType?)) = 2)';
	var query = ['START n=node('+id+')',
				'MATCH q=(n)<-[:place*1..2]-(t),(c)<-[:creator]-(t)<-[?:place]-(p)',
				whereQuery,
				'RETURN distinct t,c, HEAD(extract(a in RELATIONSHIPS(q) : a.areaType?)) AS privacy, count(p) AS posts ',
				'ORDER BY t.t'].join('\n');
	db.query(query,function(err, results){
		if(err) return callback (err, null);
		var tModel = ext.getModel(m.TOPIC);
		var ts = results.map(function(res){
			var temp = new tModel(res['t']);
			var cModel = ext.getModel(res['c'].data.objType);
			temp.addExtraProperty('creator',new cModel(res['c']));
			temp.addExtraProperty('post',res['posts'])
			if(res['privacy']!=null)
				temp.addExtraProperty('privacy',res['privacy'])
			return temp;
		});
		callback(null, ts);
	});
}

get = function(args, user, callback){
	if(!args['_id'])
		return callback('Missing arguments',null);
	var id = args['_id'];
	Utils.canSee(user, id,function(error,seeEdit){
		if(error)
			return callback(error,null);
		if(!seeEdit.canSee)
			return callback("You can't see this element",null)

		var query = ['START n=node('+id+')',
				'MATCH q=(n)-[:place*1..2]->(c), (u)<-[:creator]-(n)',
				'WHERE c.objType=23 OR c.objType =24',
				'RETURN n,HEAD(extract(a in RELATIONSHIPS(q) : a.areaType?)) AS privacy, u, c'].join('\n');
		var tModel = ext.getModel(m.TOPIC);
		db.query(query, function(err, results){
			if(err) return callback(err, null);
			var result = new tModel(results[0]['n']);
			var uModel = ext.getModel(results[0]['u'].data['objType'])
			var u = new uModel(results[0]['u']);
			var cModel = ext.getModel(results[0]['c'].data['objType']);
			var c = new cModel(results[0]['c']);
			result.addExtraProperty('creator', u);
			result.addExtraProperty('parent', c);
			result.addExtraProperty('canEdit',seeEdit.canEdit);
			if(results[0]['privacy']!=null)
				result.addExtraProperty('privacy',results[0]['privacy'])
			callback(null, result);
		})	
	})

}

add = function(args, user, callback){
	if(!args['parent'] || !args['creator'] || !args['obj'])
		return callback('Missing arguments');
	var type = m.TOPIC;
	var pId = args['parent']['i'];
	var pType = args['parent']['t'];
	var data = {
		o: args['obj'],
		u: {
			t: args['creator']['t'],
			i: args['creator']['i']
		},
	};
	if(pType==m.CLASS){
		var tempId = null;
		if(args['privacy'] && args.privacy == 2){
			Utils.getClassArea(pId,args.privacy,user.type,function(e,r){
				if(e)
					return callback(e,null);
				if(!r)
					return callback('Privacy error');
				data['p']= {
					t: m.AREA,
					i: r
				}
				generic.insert(type, data, function(err, result){
					if(err) return callback(err,null);
					result.object.addExtraProperty('privacy',result.parent.areaType)
					result.object.addExtraProperty('creator',result.creator)
					callback(null, result.object);
				});
			});
		}else{
			tempId = Utils.getClassArea(pId,1,user.type,function(e,r){
				if(e)
					return callback(e,null);
				if(!r)
					return callback('Privacy error');
				data['p']= {
					t: m.AREA,
					i: r
				}
				generic.insert(type, data, function(err, result){
					if(err) return callback(err,null);
					result.object.addExtraProperty('privacy',result.parent.areaType)
					result.object.addExtraProperty('creator',result.creator)
					callback(null, result.object);
				});
			});
		}
	}else{
		data['p']= {
			t: pType,
			i: pId
		}
		generic.insert(type, data, function(err, result){
			if(err) return callback(err,null);
			result.object.addExtraProperty('creator',result.creator)
			callback(null, result.object);
		});
	}
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
		var tModel = ext.getModel(m.TOPIC);
		var topic = new tModel(result[0]['n']);
		topic.del(function(error,res){
			if(error)
				return callback(error);
			callback(null, 'deleted');
		})
	})
}

addpost = function(args, user, callback){
	if(!args['_id'] || !args['obj'] || !args['user'])
		return callback("Missing arguments");
	var type = m.POST;
	var data = {
		o:args['obj'],
		u:{
			i: args['user'],
			t: m.USER
		},
		p:{
			t:m.TOPIC,
			i:args['_id']
		}
	}
	generic.insert(type, data, function(err, result){
		if(err) return callback(err, null);
		//console.log(result);
		callback(null, result.object);
	})
}

getpost = function(args, user, callback){
	if(!args['_id'] || args['_id']==null)
		return callback("Missing arguments",null);
	if(!args['limit'] || !args['start']){
		var limit = 20;
		if(args['limit'])
			limit = 20;
		get({_id:args['_id']},function(err, res){		
			if(err) return callback(err, null);
			var start = res.post - limit;
			if(args['start'] && args['start']<start)
				start = args['start'];
			if(start<0)
				start = 0;
			_getPost(args['_id'], limit, start, callback);
		})
	}else{
		_getPost(args['_id'],args['limit'],args['start'], callback);
	}
}

_getPost = function(tId, limit, start, callback){
	var query = ['START n=node('+tId+')',
				'MATCH (n)<-[:place]-(p)-[:creator]->(u)',
				'RETURN p,u'].join('\n');	
	db.query(query, function(err, results){
		if(err) return callback(err, null);
		var pModel = ext.getModel(m.POST);
		var uModel = ext.getModel(m.USER);
		var temp = results.map(function(res){
			var temp = new pModel(res['p']);
			temp.addExtraProperty('user',new uModel(res['u']));
			return temp;
		})
		callback(null, temp);
	})
}

exports.index = index;
exports.get = get;
exports.add = add;
exports.getpost = getpost;
exports.addpost = addpost;
exports.remove = remove;