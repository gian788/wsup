var db = require('../models/DB').db();
var ext = require('../models/extends');
var utils = require('./utils/utils');
var m = require(process.cwd()+'/global/models');

getclass = function(args,user,callback){
	if(!args['_id'])
		return callback("Missing arguments",null);
	var id = args['_id'];
	var whereQuery = 'WHERE sub.teach! = true';
	if(args['name'])
		whereQuery+= ' AND c.name = =~ "(?i).*'+args['name']+'.*"';
	var query = ['START n=node('+id+')',
				'MATCH (n)-[sub:professor_of]->(c)',
				whereQuery,
				'RETURN n,c,sub'].join('\n');
	db.query(query,function(err,results){
		if(err)
			return callback(err,null);
		var cModel = ext.getModel(m.CLASS);
		var pModel = ext.getModel(m.PROFESSOR);
		var temp = results.map(function(res){
			var t = new cModel(res['c']);
			t.addExtraProperty('professor',new pModel(res['n']));
			t.addExtraProperty('teach',{});
			t['teach'] = res['sub'].data;
			t['teach']['id'] = res['sub'].id;
			return t;
		})
		callback(null, temp);
	})
}

addclass = function(args, user, callback){
	if(!args['_id'] || !args['cId'])
		return callback("Missing arguments", null);
	var id = args['_id'];
	var cId = args['cId'];
	var profModel = ext.getModel(m.PROFESSOR);
	profModel.getById(id, function(err, result){
		if(err) return callback(err, null);
		var _professor = result;		
		var classModel = ext.getModel(m.CLASS);
		classModel.getById(cId, function(e, r){
			if(e) return callback(e, null);
			_professor._getClassRel(r.id,function(err,rel){
				if(err)
					return callback(err,null)
				if(rel){
					rel.data['teach'] = true;
					rel.save(function(err){
						if(err)
							return callback(err,null);
						/*var uQuery = ['START n=node('+result.id+')',
									'MATCH (n)<-[:is_professor]-(u)',
									'RETURN u'].join('\n');
						db.query(uQuery,function(c,u){
							if(c)
								return callback(c,null);
							var u = u[0]['u'];
							var not = {
								n : [{id:r.id,objType:m.CLASS,name:r.name,sqlid:r.sqlid}],
								a : 3,
								u : {id:u.id,objType:m.USER,name:ext.getName(m.USER,u.data),sqlid:u.data.sqlid},
								t: new Date().getTime()
							}
							var notInc = require(process.cwd()+'/notify/notify');
							notInc.send(not);
						})*/
						callback(null, {message: 'Added'});
					})
				}
			});
		})
	});
}

removeclass = function(args,user,callback){
	if(!args['class'])
		return callback('Missing arguments',null);
	var query = ['START u=node('+user.nosqlid+'),c=node('+args['class']+')',
				'MATCh (u)-[:has_professor]->()-[sub?:in_class]->(c)',
				'RETURN sub'].join('\n');
	db.query(query, function(err, rels){
		if(err)
			return callback(err,null);
		if(!rels.length)
			return callback(null,true);
		rels[0]['sub'].del(function(err){
			if(err)
				return callback(err,null);
			callback(null, true);
		})
	})
}

exports.getclass = getclass;
exports.addclass = addclass;