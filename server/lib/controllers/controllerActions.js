var m = require(process.cwd()+'/global/models');
var db = require('../models/DB').db();

var specs = {};
var initializeSpec = function(){
specs[m.USER] = [{action: sqlAction, async:false}]
specs[m.CAREER] =  [{action: sqlAction, async: false}]
specs[m.PROFESSOR]= [{action: sqlAction, async: false}]
specs[m.UNIVERSITY]= [{action: sqlAction, async:false}]
specs[m.GROUP_DEGREE_PROGRAM] = [{action: sqlAction, async:false}]
specs[m.DEGREE_PROGRAM] = [{action: sqlAction, async:false}]
specs[m.CLASS]= [{action:sqlAction, async:false}]
specs[m.GROUP]= [{action:notificationAction, async:true}]
specs[m.TOPIC]= [{action:notificationAction, async:true}]
specs[m.POST]= [{action:notificationAction, async:true}]
specs[m.DOCUMENT]= [{action:notificationAction, async:true}]
}

var executeActions = function(type,data,callback){
	initializeSpec();
	_exec(specs[type],0,data,{},callback);
}

var _exec = function(actions, index, data, prevResult, callback){
	if(index == actions.length)
		return callback(null, true);
	var _actions = actions;
	var _index = index;
	var _data = data;
	var method = _actions[index]['action'];
	var async = _actions[index]['async'];
	method(_data, prevResult, function(err, result){
		if(err)
			callback(err,null);
		if(!async){	
			prevResult = result;
			_exec(_actions, ++index, _data,prevResult, callback);
		}
	})
	if(async){
		_exec(_actions, ++index, _data,prevResult, callback);
	}

}



var notificationAction = function(data, prevResult, callback){
	var nodeId = data.object.id;
	var query = ['START n=node('+nodeId+')',
				'MATCH p=(n)-[:place*]->(c), (n)-[?:creator]->(u)',
				'WHERE c.objType=24',
				'RETURN NODES(p) AS p, extract(n in nodes(p) : ID(n)) AS ids,u, TAIL(extract(a in RELATIONSHIPS(p): a.type?)) AS areaType'].join('\n');
	db.query(query,function(err, results){
		if(err) return callback(err, null);
		if(!results.length)
			return callback(null, []);
		var temp = mapNotificationResult(results[0]);
		var notInc = require(process.cwd()+'/notify/notify');
		notInc.send(temp);
		callback(null, true);
	});
}

var mapNotificationResult = function(res){
	var m = require(process.cwd()+'/global/models');
	var ext = require(process.cwd()+'/lib/models/extends');
	var nodes = new Array();
	for(a in res['p']){
		var obj = {
			id: res['ids'][a],
			name: ext.getName(res['p'][a].data.objType, res['p'][a].data),
			objType : res['p'][a].data.objType,
			t: res['p'][a].data.t
		}
		if(res['p'][a].data.areaType)
			obj['areaType'] = res['p'][a].data.areaType;
		if(res['p'][a].data.descr)
			obj['descr'] = res['p'][a].data.descr;
		if(res['p'][a].data.sqlid)
			obj['sqlid'] = res['p'][a].data.sqlid;
		nodes[a] = obj;
	}
	var lastIndex = 0;
	var lastModel = ext.getModel(nodes[lastIndex].objType);
	res['p'][lastIndex].id = nodes[lastIndex].id;
	var lastNode = new lastModel(res['p'][lastIndex]).toPlainObject();
	nodes[lastIndex] = lastNode;
	var a;
	var lastObjectIndex = nodes.length-1;
	var lastObjectType = nodes[lastObjectIndex].objType;
	if(lastObjectType!=m.TOPIC || lastObjectType!=60){
		a = 1;
	}else{ //se la notifica parte da un nodo modifica o post il nodo di interesse diventa il suo padre, ovvero il nodo mofificato 
		a = 2;
	}
	var u = {
	}
	if(res['u']){
		u = {
			id : res['u'].id,
			name: ext.getName(res['u'].data.objType, res['u'].data),
			objType : res['u'].data.objType,
			sqlid : res['u'].data.sqlid
		}
		/*
		var uModel = ext.getModel(res['u'].data.objType);
		u = new uModel(res['u']).toPlainObject();*/
	}
	if(res['areaType'] && res['areaType']!=null){
		return {n:nodes, a: a, u:u, area:res['areaType'],t:nodes[0].t};
	}
	return {n:nodes, a: a, u:u, t:nodes[0].t};
}

var sqlAction = function(data,prevResult,callback){
	callback(null, true);
}

exports.executeActions = executeActions;