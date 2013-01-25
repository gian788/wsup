var m = require(process.cwd()+'/global/models');
var db = require('../models/DB').db();
var ext = require('../models/extends');
var Utils = require('./utils/utils');
var generic = require('./generic');
var servers = require(process.cwd()+'/config/servers');


index = function(args, user, callback){
	if(!args['parentId'])
		return callback('Missing arguments');
	var id = args['parentId'];
	var whereQuery = 'WHERE t.objType = '+m.DOCUMENT+' ';
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
	//console.log(query);
	db.query(query,function(err, results){
		if(err) return callback (err, null);
		var tModel = ext.getModel(m.DOCUMENT);
		var uModel = ext.getModel(m.USER);
		var ts = results.map(function(res){
			var temp = new tModel(res['t']);
			temp.addExtraProperty('creator',new uModel(res['c']));
			temp.addExtraProperty('post',res['posts'])
			if(res['privacy']!=null)
				temp.addExtraProperty('privacy',res['privacy'])
			return temp;
		});
		callback(null, ts);
	});
}

remove = function(args,user,callback){
	if(!args['_id'])
		return callback('Missing arguments');
	var id = args['_id'];
	var user = user;
	var query = ['START n=node('+args['_id']+')',
				'MATCH (n)-[:creator]->(c)',
				'RETURN n,ID(c) AS creator'].join('\n');
	db.query(query,function(err,result){
		if(err)
			return callback(err);
		if(result[0]['creator']!=user.nosqlid)
			return callback("Permission denied");
		var tModel = ext.getModel(m.DOCUMENT);
		var topic = new tModel(result[0]['n']);
		_topicId = topic.id;
		_path = topic.path;
		topic.del(function(error,res){
			if(error)
				return callback(error);	
			var
				sys = require('util'),
				mysql = require('mysql-libmysqlclient')
			var
				host = servers.MYSQL.host,
				_user = "php",
				password = "x58l1030V59a6cW",
				database = "general"
			var conn = mysql.createConnectionSync();
			conn.connectSync(host, _user, password, database);
			conn.setCharsetSync('utf8');
			var nosqlid = _topicId;
			var userId = user.nosqlid;
			var path = _path;
			var partQuery = '(nosqlid,userid,path) VALUES ('+nosqlid+','+userId+',"'+path+'")';
			if (!conn.connectedSync()) {
				  console.log("Connection error " + conn.connectErrno + ": " + conn.connectError);
			}
			//console.log(partQuery)
			conn.query("INSERT INTO deleted_docs "+partQuery+";",function(err2,res2){
				if(err2)
					return callback(err2,null);
				callback(null, 'deleted');
			});
		})
	})
}

getServer = function(args, user, callback){
	if(!args['_id'] )
		return callback("Missing arguments",null);
	var id = args['_id'];
	var query = ['START n=node('+id+')',
				'RETURN n'].join('\n');
	db.query(query, function(err, results){
		if(err) return callback(err, null);
		var dModel = ext.getModel(m.DOCUMENT);
		var user = new dModel(results[0]['n']);
		return callback(null, user);
	})
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
		var tModel = ext.getModel(m.DOCUMENT);
		db.query(query, function(err, results){
			if(err) return callback(err, null);
			var result = new tModel(results[0]['n']);
			var uModel = ext.getModel(results[0]['u'].data['objType'])
			var u = new uModel(results[0]['u']);
			var cModel = ext.getModel(results[0]['c'].data['objType']);
			var c = new cModel(results[0]['c']);
			result.addExtraProperty('creator', u);
			result.addExtraProperty('canEdit',seeEdit.canEdit);
			result.addExtraProperty('parent', c);
			if(results[0]['privacy']!=null)
				result.addExtraProperty('privacy',results[0]['privacy'])
			callback(null, result);
		})	
	})

}
/*
get = function(args, user, callback){
	if(!args['_id'])
		return callback("Missing arguments",null);
	var id = args['_id'];
	var query = ['START n=node('+id+')',
				'MATCH (c)<-[:creator]-(n)-[:place]->(p)',
				'RETURN n,c,p'].join('\n');
	db.query(query, function(err, results){
		if(err) return callback(err, null);
		var dModel = ext.getModel(m.DOCUMENT);
		var cModel = ext.getModel(m.USER);
		var pModel = ext.getModel(results[0]['p'].data['objType']);
		var user = new dModel(results[0]['n']);
		delete user['path'];
		user.addExtraProperty("creator",new cModel(results[0]['c']));
		user.addExtraProperty("parent",new cModel(results[0]['p']));
		return callback(null, Utils.toJson(user));
	})
}*/

addServer = function(args, user, callback){
	if(!args['parent'] || !args['creator'] || !args['obj'])
		return callback('Missing arguments');
	
	var type = m.DOCUMENT;
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
				_create(type,data,callback);
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
				_create(type,data,callback);
			});
		}
	}else{
		data['p']= {
			t: pType,
			i: pId
		}
		_create(type,data,callback);
	}
}

_create = function(type,data,callback){
	generic.insert(type, data, function(err, result){
		if(err) return callback(err,null);
		var res = Utils.toPlainObject(result.object);
		var _d = {
			o: res
		}
		_d.o['path']= "docs/"+result.object.extension+'/'+result.object.id+'.'+result.object.extension;
		_d.o['download']= 'http://docs.uniants.com/doc/'+result.object.id;
		_d.o['url'] = 'http://www.uniants.com/document/'+result.object.id;
		generic.update(type,_d,function(e, res1){
			if(e) return callback(err, null);
			if(result.parent.areaType)
				_d.o['privacy']=result.parent.areaType;
			_d.o['creator'] = result.creator;
			callback(null, Utils.toJson(_d.o));
		})
	});
}

add = function(args, user, callback){
	return callback('Permission denied');
}

exports.index = index;
exports.get = get;
exports.add = add;
exports.indexServer = index;
exports.getServer = getServer;
exports.addServer = addServer;
exports.remove = remove;