var m = require(process.cwd()+'/global/models');
var db = require('../models/DB').db();
var ext = require('../models/extends');
var Utils = require('./utils/utils');

index = function(args,user,callback){
}

users = function(args,user,callback){
	var uId = user.nosqlid;
	if(!args['name'] || args['name']=='')
		return callback(null,[]);
	var name = args['name'].toLowerCase();
	var strs = name.split(" ");
	var startQuery = "START n=node("+uId+"), u=node:users('";
	for (var i = 0; i<strs.length-1;i++)
		startQuery+='fullName:'+strs[i]+'~0.7 AND';
	startQuery+="(fullName:"+strs[strs.length-1]+"~0.5 OR fullName:"+strs[strs.length-1]+"*)')";
	var whereQuery = 'WHERE 1=1'
	if(args['friend']==true)
		whereQuery = ' AND not(friend is null)';
	if(args['friend']==false)
		whereQuery = ' AND friend is null';
	if(args['professor']==true)
		whereQuery = ' AND not(prof is null)';
	if(args['professor']==false)
		whereQuery = ' AND prof is null';
	var start = 0;
	var limit = 10;
	if(args['start'])
		start = args['start']
	if(args['limit'])
		limit = args['limit'];
	var query = [startQuery,
				'MATCH path = shortestPath(n-[*..10]-u), (n)-[friend?:friend]-(u), (u)-[career?:active_career]->()-[:in_degree_program]-(dp)-[:place]->()-[:place]->(uni), (u)-[prof?:is_professor]-(p)',
				whereQuery,
				'RETURN u,friend,dp,uni,career,prof,p',
				'ORDER BY length(NODEs(path))',
				'SKIP '+start,
				'LIMIT '+limit].join('\n');
	db.query(query,function(error,results){
		if(error)
			return callback(error, null);
		if(results.length == 0)
			return callback(null, []);
		var uModel = ext.getModel(m.USER);
		var dpModel = ext.getModel(m.DEGREE_PROGRAM);
		var uniModel = ext.getModel(m.UNIVERSITY);
		var profModel = ext.getModel(m.PROFESSOR);
		var users = results.map(function(res){
			var user = new uModel(res['u']);		
			if(res['friend']!=null){
				user.addExtraProperty('friend', true);	
			}else
				user.addExtraProperty('friend', false);	
			if(res['career']!=null){
				user.addExtraProperty('degree_program',new dpModel(res['dp']));
				user.addExtraProperty('university',new uniModel(res['uni']));
			}
			if(res['prof']!=null){
				user.addExtraProperty('pofessor',new profModel(res['p']));
			}
			return user; 
		})
		callback(null, users);
	})

}



classes= function(args,user,callback){
	if(args['careerId'])
		classFromStudent(args,user,callback);
	else if(args['degreeProgramId'] && args['professorId'])
		classFromProfessor(args,user,callback);
	else
		callback(null, []);
}

classFromProfessor = function(args,user,callback){
	var dpId = args['degreeProgramId'];
	var profId = args['professorId'];
	var name = args['name'];
	var whereQuery = 'WHERE c.name =~ "(?i).*'+name+'.*"' ;
	if(args['teach']==false)
		whereQuery += ' AND sub is null OR sub.teach? = false';
	if(args['teach']==true)
		whereQuery += ' not(sub is null) AND sub.teach! = true'
	var start = 0;
	var limit = 10;
	if(args['start'])
		start = args['start']
	if(args['limit'])
		limit = args['limit'];
	var query = ['START dp=node('+dpId+'), prof=node('+profId+')',
			'MATCH (dp)<-[:place]-(c), path = shortestPath(prof-[*..10]-c),(c)<-[?:professor_of]-(p), (c)<-[sub?:professor_of]-(prof)',
			whereQuery,
			'RETURN c,prof,p,sub,dp',
			'ORDER BY length(NODEs(path))',
			'SKIP '+start,
			'LIMIT '+limit].join('\n');
	db.query(query, function(err, results){
		if(err) return callback(err, []);
		var classMod = ext.getModel(m.CLASS);
		var profMod = ext.getModel(m.PROFESSOR);
		var dpModel = ext.getModel(m.DEGREE_PROGRAM);
		var classes = results.map(function(res){
			var temp = new classMod(res['c']);
			temp.addExtraProperty('degree_program',new dpModel(res['dp']))
			if(res['p'])
				temp.addExtraProperty('professor',new profMod(res['p']));
			else
				temp.addExtraProperty('professor',null);
			temp.addExtraProperty('teach', false);
			if(res['sub']!=null){
				temp['professor'] = new profMod(res['prof']);
				temp['teach'] = res['sub'].data;
				temp['teach']['id'] = res['sub'].id;
			} 
			return temp;
		});
		callback(null, classes);
	})
}

classFromStudent = function(args,user,callback){
	var cId = args['careerId'];
	var name = args['name'];
	var whereQuery = 'WHERE c.name =~ "(?i).*'+name+'.*"' ;
	if(args['subscribed']==false)
		whereQuery += ' AND sub is null';
	if(args['subscribed']==true)
		whereQuery += ' not(sub is null)'
	var start = 0;
	var limit = 10;
	if(args['start'])
		start = args['start']
	if(args['limit'])
		limit = args['limit'];
	var uniQuery = ['START n=node('+cId+')',
					'MATCH (n)-[:in_degree_program]->()-[:place]->()-[:place]->(university)',
					'RETURN ID(university) AS uni'].join('\n');
	db.query(uniQuery,function(error, result){
		if(error || !result.length)
			return callback(error,null)
		var uniId = result[0]['uni'];
		var query = ['START n=node('+cId+'), university=node('+uniId+')',
				'MATCH (university)<-[:place]-()<-[:place]-(dp)<-[:place]-(c), path = shortestPath(n-[*..10]-c),(c)<-[?:professor_of]-(prof), (c)<-[sub?:in_class]-(n)',
				whereQuery,
				'RETURN c,prof,sub,dp',
				'ORDER BY length(NODEs(path))',
				'SKIP '+start,
				'LIMIT '+limit].join('\n');
		db.query(query, function(err, results){
			if(err) return callback(err, []);
			var classMod = ext.getModel(m.CLASS);
			var profMod = ext.getModel(m.PROFESSOR);
			var dpModel = ext.getModel(m.DEGREE_PROGRAM);
			var classes = results.map(function(res){
				var temp = new classMod(res['c']);
				temp.addExtraProperty('degree_program',new dpModel(res['dp']))
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
	})
}

_classesByCareer=function(args,user,callback){
	var cId = args['careerId'];
	var name = args['name'];
	var whereQuery = 'WHERE name = ~ "(?i).*'+name+'.*"' ;
	if(args['subscribed']==false)
		whereQuery += ' AND sub is null';
	if(args['subscribed']==true)
		whereQuery += ' not(sub is null)'
	var query = ['START n=node('+cId+')',
				'MATCH (n)-[:in_degree_program]->()<-[:place]-(c)<-[sub?:in_class]-(n),(c)<-[?:professor_of]-(prof)',
				whereQuery,
				'RETURN c,prof,sub,count(*)'].join('\n');
	db.query(query, function(err, results){
		if(err) return callback(err, []);
		var classMod = ext.getModel(m.CLASS);
		var profMod = ext.getModel(m.PROFESSOR);
		var classes = results.map(function(res){
			var temp = new classMod(res['c']);
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

exports.class = classes;
exports.user = users;