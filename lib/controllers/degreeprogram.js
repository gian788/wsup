var db = require('../models/DB').db();
var ext = require('../models/extends');
var Utils = require('./utils/utils');
var m = require(process.cwd() + '/global/models');

index = function(args, user, callback){
	if(!args['universityId'])
		return callback(null, new Array());
	var uniId =args['universityId'];
	var whereQuery = 'WHERE 1=1 ';
	for(i in args){
		if(i!='universityId' && args[i]!=""){
			if(args[i].indexOf('*')===0)
				args[i]= args[i].substring(1, args[i].length-1);
			if(args[i].indexOf('*')===args[i].length-1)
				args[i]= args[i].substring(0, args[i].length-2);
				whereQuery += 'AND dp.'+i +' =~ "(?i).*'+args[i]+'.*" '
			}
	}
	var query = ['START n=node('+uniId+')',
				'MATCH (n)<-[:place]-(gdp)<-[:place]-(dp)',
				whereQuery,
				'RETURN dp'].join('\n');
	//console.log(query);
	db.query(query, function(err, results){
		if(err) return callback(err, null);
		var dpMod = ext.getModel(m.DEGREE_PROGRAM);
		var dps = results.map(function(res){
			return new dpMod(res['dp']);
		});
		callback(null, dps);
	})
}

get = function(args, user, callback){
	if(!args['universityId'])
		return callback(null, []);
	var uniId =args['universityId'];
	//console.log(uniId);
	var whereQuery = 'WHERE 1=1 ';
	for(i in args){
		if(i!='universityId')
			if(args[i]!="")
				whereQuery += 'AND dp.'+i +' =~ "(?i)'+args[i]+'" '
	}
	var query = ['START n=node('+uniId+')',
				'MATCH (n)<-[:place]-(gdp)<-[:place]-(dp)',
				whereQuery,
				'RETURN dp'].join('\n');
	console.log(query);
	db.query(query, function(err, results){
		if(err) return callback(err, null);
		var dpMod = ext.getModel(m.DEGREE_PROGRAM);
		var dps = results.map(function(res){
			return new dpMod(res['dp']);
		});
		callback(null, dps);
	})
}
exports.index = index;
exports.get = get;