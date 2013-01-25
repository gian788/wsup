var m = require(process.cwd()+'/global/models');
var db = require('../models/DB').db();
var ext = require('../models/extends');
var Utils = require('./utils/utils');
var generic = require('./generic');

get = function(args, user, callback){
	if(!args['_id'])
		return callback("Missing arguments",null);
	var id = args['_id'];
	//if cId is present in request args, check if the user is subscribed to class
	if(args['uId'])
		return checkGroupSubscription(args['uId'],args['_id'], callback);
	var query = ['START n=node('+id+')',
				'RETURN n'].join('\n');
	db.query(query, function(err, result){
		if(err)	return callback(err, null);
		if(!results.length)
			return callback(404,null);
		var cModel = ext.getModel(m.GROUP);
		var temp = new cModel(result[0]['n']);
		callback(null, temp);
	})
}

add = function(args, user, callback){
	if(!args['parent'] || !args['obj'] || !args['career'])
		return callback("Missing arguments");
	var type = m.GROUP;
	var careerId = args['career'];
	var data = {
		o:args['obj'],
		u:{
			i: user.nosqlid,
			t: m.USER
		},
		p:{
			t: m.CLASS,
			i: args['parent']
		}
	}
	generic.insert(type, data, function(err, result){
		if(err) return callback(err, null);
		var careerModel = ext.getModel(m.CAREER);
		careerModel.getById(careerId,function(a,career){
			if(a)
				return callback(a,null);
			career.subscribeToGroup(result.object,{},function(e,f){
				if(e)
					return callback(e,null);		
				result.object.addExtraProperty('creator', result.creator);
				callback(null, result.object);
			})
		})
	})
}

checkGroupSubscription = function(id, cId, callback){
	var query = ['START user=node('+id+'),group=node('+cId+')',
	'MATCH (user)-[:has_career]->(career)-[r?:in_group]->(group)',
	'RETURN distinct group,user,career,r'].join('\n');
	db.query(query, function(err, results){
		if(err) return callback(err,null);
		if(!results.length)
			return callback(404,null);
		var result = results[0];
		var classModel = ext.getModel(m.GROUP);
		var careerModel = ext.getModel(m.CAREER);
		var _career = null;
		var _group = new classModel(result['group']);
		var _rel = null;
		if(result['r'] != null){
			_career =  new careerModel(result['career']);
			_rel = result['r'].data;
			_rel['id'] = result['r'].id;
		}
		var temp = {
			career: _career,
			group: _group,
			relationship: _rel
		}
		callback(null, temp);
	});
}

getstudents = function(args,user,callback){
	var whereQuery = 'WHERE not(ID(s) = ID(u))';
	if(args['friends'] && args['friends']==true)
		whereQuery+= ' AND not(f is null)';
	if(args['friends'] && args['friends']==false)
		whereQuery+= ' AND f';

	var query = ['START n=node('+args['_id']+'),u=node('+user.nosqlid+')',
				'MATCH (n)<-[:in_group]-()<-[:has_career]-(s), (u)-[f?:friend]-(s)',
				whereQuery,
				'RETURN distinct s,f',
				'ORDER BY s.name,s.surname'].join('\n');
	db.query(query,function(err,result){
		if(err)
			return callback(err,null);
		var uModel = ext.getModel(m.USER);
		var users = result.map(function(res){
			var u = new uModel(res['s']);
			if(res['f'])
				u.addExtraProperty('friend',true)
			else
				u.addExtraProperty('friend',false);
			return u;
		})
		callback(null, users);
	})
}

getHistory = function(args, user, callback){
	var history = require('./history.js');
	history.getGroupHistory(args._id, callback);
}

exports.get = get;
exports.getstudents = getstudents;
exports.add = add;
exports.gethistory = getHistory;