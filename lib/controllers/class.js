var m = require(process.cwd()+'/global/models');
var db = require('../models/DB').db();
var ext = require('../models/extends');
var Utils = require('./utils/utils');

index = function(args, user, callback){
	if(!args['careerId'])
		return callback(null, []);
	var careerId = args['careerId'];
	var whereQuery = 'WHERE 1=1';
	for(i in args){
		if(i!='careerId' && i!='subscribed' && i!='completed' && i!='year')
			whereQuery += ' AND class.'+i +' =~ "(?i).*'+args[i]+'.*"'
	}
	if(args['completed'] == true)
		whereQuery += ' AND sub.status! = 2';
	if(args['subscribed'] == false){
		whereQuery += ' AND sub is null';
	}
	if(args['year'])
		whereQuery += ' AND r.usy! = '+args['year'];
	if(args['subscribed'] == true){
		whereQuery += ' AND not(sub is null)';
	}
	var query = ['START n=node('+careerId+')',
		'MATCH (n)-[:in_degree_program]->(dp)<-[r:place]-(class)<-[?:professor_of]-(prof), (n)-[sub?:in_class]->(class)',
		whereQuery,
		'RETURN class,dp,prof,sub,count(*)'].join('\n');
	db.query(query, function(err, results){
		if(err) return callback(err, null);
		var classMod = ext.getModel(m.CLASS);
		var profMod = ext.getModel(m.PROFESSOR);
		var classes = results.map(function(res){
			var temp = new classMod(res['class']);
			if(res['prof'])
				temp.addExtraProperty('professor',new profMod(res['prof']));
			else
				temp.addExtraProperty('professor',null);
			temp.addExtraProperty('subscribed', false);
			if(res['sub']!=null){
				temp['subscribed'] = res['sub'].data;
				temp['subscribed']['id'] = res['sub'].id;
			} 
			return temp;
		});
		callback(null, classes);
	})
}

get = function(args, user, callback){
	if(!args['_id'])
		return callback("Missing arguments",null);
	var id = args['_id'];
	//if cId is present in request args, check if the user is subscribed to class
	if(args['uId'])
		return checkStudentSubscription(args['uId'],args['_id'], callback);
	if(args['pId'])
		return checkProfessorSubscription(args['pId'],args['_id'], callback);
	var query = ['START n=node('+id+')',
				'RETURN n'].join('\n');
	db.query(query, function(err, result){
		if(err)	return callback(err, null);
		var cModel = ext.getModel(m.CLASS);
		var temp = new cModel(result[0]['n']);
		callback(null, temp);
	})
}

checkStudentSubscription = function(id, cId, callback){
	var query = ['START user=node('+id+'),class=node('+cId+')',
	'MATCH (user)-[:has_career]->(career)-[r?:in_class]->(class)',
	'RETURN distinct class,user,career,r'].join('\n');
	db.query(query, function(err, results){
		if(err) return callback(err,null);
		var result = results[0];
		var classModel = ext.getModel(m.CLASS);
		var careerModel = ext.getModel(m.CAREER);
		var _career = null;
		var _class = new classModel(result['class']);
		var _rel = null;
		if(result['r'] != null){
			_career =  new careerModel(result['career']);
			_rel = result['r'].data;
			_rel['id'] = result['r'].id;
		}
		var temp = {
			career: _career,
			class: _class,
			relationship: _rel
		}
		callback(null, temp);
	});
}

checkProfessorSubscription = function(id, cId, callback){
	var query = ['START user=node('+id+'),class=node('+cId+')',
	'MATCH (user)-[:is_professor]->(career)-[r?:professor_of]->(class)',
	'RETURN distinct class,user,career,r'].join('\n');
	db.query(query, function(err, results){
		if(err) return callback(err,null);
		var result = results[0];
		var classModel = ext.getModel(m.CLASS);
		var profModel = ext.getModel(m.PROFESSOR);
		var _career = null;
		var _class = new classModel(result['class']);
		var _rel = null;
		if(result['r'] != null && result['r'].data['teach'] && result['r'].data['teach']==true){
			_career =  new profModel(result['career']);
			_rel = result['r'].data;
			_rel['id'] = result['r'].id;
		}
		var temp = {
			career: _career,
			class: _class,
			relationship: _rel
		}
		callback(null, temp);
	});
}


getPublicHistory = function(args, user, callback){
	var history = require('./history.js');
	history.getClassPublicHistory(args._id, callback);
}

getStudentHistory = function(args, user, callback){
	var history = require('./history.js');
	history.getClassStudentHistory(args._id, callback);
}

getProfessorHistory = function(args, user, callback){
	var history = require('./history.js');
	history.getClassProfessorHistory(args._id, callback);
}

getstudents = function(args,user,callback){
	var whereQuery = 'WHERE not(ID(s) = ID(u))';
	if(args['friends'] && args['friends']==true)
		whereQuery+= ' AND not(f is null)';
	if(args['friends'] && args['friends']==false)
		whereQuery+= ' AND f';

	var query = ['START n=node('+args['_id']+'),u=node('+user.nosqlid+')',
				'MATCH (n)<-[:in_class]-()<-[:has_career]-(s), (u)-[f?:friend]-(s)',
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

exports.index = index;
exports.get = get;
exports.getpublichistory = getPublicHistory;
exports.gethistory = getPublicHistory;
exports.getstudenthistory = getStudentHistory;
exports.getprofessorhistory = getProfessorHistory;
exports.getstudents = getstudents;