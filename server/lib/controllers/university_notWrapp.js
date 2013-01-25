var m = require('../../global/models');
var db = require('../models/DB').db();
var ext = require('../models/extends');
var Utils = require('./utils/utils');

var cm = require('../../comunicationModule.js').CM(this, process.argv[2], process.argv[3], '001uniC01001');
cm.ready();

index = function(args, user, callback){
	if(Utils.isEmpty(args))
		var queryStart = 'START n=node:universities("name:*")';
	else{
		var queryStart = 'START n=node:universities("';
			for (i in args){
				queryStart += i+':'+args[i]+'* AND ';
			}
			queryStart = queryStart.substring(0, queryStart.length -4);
			queryStart += '")';
	}
	var query = [queryStart,
	'RETURN n'].join('\n');
	//console.log(query);
	db.query(query, function(err, results){
		if(err) return callback(err, null);
		var uniMod = ext.getModel(m.UNIVERSITY);
		var universities = results.map(function(res){
			return new uniMod(res['n']);
		});
		callback(null, universities);
	})
}

get = function(args, user, callback){
	if(Utils.isEmpty(args))
		var queryStart = 'START n=node:universities("name:*")';
	else{
		var queryStart = 'START n=node:universities("';
			for (i in args){
				queryStart += i+':'+args[i]+' AND ';
			}
			queryStart = queryStart.substring(0, queryStart.length -4);
			queryStart += '")';
	}
	var query = [queryStart,
	'RETURN n'].join('\n');
	db.query(query, function(err, results){
		if(err) return callback(err, null);
		var uniMod = ext.getModel(m.UNIVERSITY);
		var universities = results.map(function(res){
			return new uniMod(res['n']);
		})
		callback(null, universities);
	})
}

degreeprograms = function(args, user, callback){
	var uId = args['_id'];
	var query = ['START n=node('+uId+')',
	'MATCH (n)<-[?:place]-(dp)',
	'RETURN dp'].join('\n');
	db.query(query, function(err, results){
		if(err) return callback(err, null);
		var dpMod = ext.getModel(m.DEGREE_PROGRAM);
		var dps = results.map(function(res){
			return new dpMod(res['dp']);
		})
		callback(null, dps);
	})
}

search = function(args, user, callback){
	var queryStart = 'START n=node:universities("';
		for (i in args){
			queryStart += i+':'+args[i]+'* AND ';
		}
		queryStart = queryStart.substring(0, queryStart.length -4);
		queryStart += '")';
var query = [queryStart,
'RETURN n'].join('\n');
//console.log(query);
db.query(query, function(err, results){
	if(err) return callback(err, null);
	var uniMod = ext.getModel(m.UNIVERSITY);
	var universities = results.map(function(res){
		return new uniMod(res['n']);
	})
	callback(null, universities);
})
}

exports.index = index;
exports.search = search;
exports.get = get;
exports.degreeprograms = degreeprograms;