var db = require('../models/DB').db();
var ext = require('../models/extends');
var utils = require('./utils/utils');
var m = require('/srv/server/global/models');

addclass = function(args, user, callback){
	if(!args['_id'] || !args['cId'])
		return callback("Missing arguments", null);
	var id = args['_id'];
	var cId = args['cId'];
	var careerModel = ext.getModel(m.CAREER);
	careerModel.getById(id, function(err, result){
		if(err) return callback(err, null);
		var _career = result;		
		var classModel = ext.getModel(m.CLASS);
		classModel.getById(cId, function(e, r){
			if(e) return callback(e, null);
			_career.subscribeToClass(r, {}, function(a, b){
				if(a)
					return callback(a,null);
				var uQuery = ['START n=node(' + result.id + ')',
							'MATCH (n)<-[:has_career]-(u)',
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
					var notInc = require(process.cwd() + '/notify/notify');
					notInc.send(not);
				})
				return callback(null, {message: b});
			});
		})
	});
}

removeclass = function(args,user,callback){
	if(!args['class'])
		return callback('Missing arguments',null);
	var query = ['START u=node('+user.nosqlid+'),c=node('+args['class']+')',
				'MATCh (u)-[:has_career]->()-[sub?:in_class]->(c)',
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

updateclass = function(args,user, callback){
	if(!args['class'])
		return callback('Missing arguments',null);
	var query = ['START u=node('+user.nosqlid+'),c=node('+args['class']+')',
				'MATCh (u)-[:has_career]->()-[sub?:in_class]->(c)',
				'RETURN sub'].join('\n');
	db.query(query, function(err, rels){
		if(err)
			return callback(err,null);
		if(!rels.length)
			return callback(null,true);
		if(args['notify']==true)
			rels[0]['sub'].data['notify'] = true;
		else if(args['notify']==false)
			rels[0]['sub'].data['notify'] = false;
		else
			return callback(null, true);
		rels[0]['sub'].save(function(err){
			if(err)
				return callback(err,null);
			callback(null, true);
		})
	})
}

getclass = function(args, user, callback){
	if(!args['_id'])
		return callback("Missing arguments",null);
	var id = args['_id'];
	var whereQuery = 'WHERE 1=1';
	if(args['name'])
		whereQuery+= ' AND c.name = =~ "(?i).*'+args['name']+'.*"';
	if(args['notify'] == true)
		whereQuery += 'AND sub.notify? = true';
	if(args['notify'] == false)
		whereQuery += ' AND sub.notify! = false';
	if(args['active'] == true)
		whereQuery += ' AND sub.completed? = false';
	if(args['active'] == false)
		whereQuery += ' AND sub.completed! = true';
	var query = ['START n=node('+id+')',
				'MATCH (n)-[sub:in_class]->(c)<-[?:prof]-(prof)',
				whereQuery,
				'RETURN c,sub,prof'].join('\n');
	db.query(query,function(err,results){
		if(err)
			return callback(err,null);
		var cModel = ext.getModel(m.CLASS);
		var pModel = ext.getModel(m.PROFESSOR);
		var temp = results.map(function(res){
			var t = new cModel(res['c']);
			if(res['prof'])
				t.addExtraProperty('professor',new pModel(res['prof']));
			t.addExtraProperty('subscribed',{});
			t['subscribed'] = res['sub'].data;
			t['subscribed']['id'] = res['sub'].id;
			return t;
		})
		callback(null, temp);
	})
}

addcompleteclass = function(args, user, callback){
	if(!args['_id'] || !args['class'])
		return callback("Missing arguments",null);
	var id = args['_id'];
	var classId = args['class'];
	var examResult = null;
	if(args['result'])
	examResult = args['result'];
	var query = ['START n=node('+id+')',
				'RETURN n'].join('\n');
	db.query(query, function(err, result){
		if(err)	return callback(err, null);
		var cModel = ext.getModel(m.CAREER);
		var temp = new cModel(result[0]['n']);
		temp.completeClass(classId,examResult, function(e, r){
			if(e)
				return callback(e, null);
			return callback(null, {message:"Exam Completed"});
		})
	})
}

exports.addclass = addclass;
exports.addcompleteclass = addcompleteclass;
exports.getclass = getclass;
exports.removeclass = removeclass;
exports.updateclass = updateclass;