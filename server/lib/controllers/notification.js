var Base = require('../models/Base');
var db = require('../models/DB').db();

const LAST_READ_REL = 'last_read_not';



var getNotification = function(args, callback){
	if(!args['nodeId'])
		callback("Missing arguments",null);
	var nodeId = args['nodeId'];
	var query = ['START n=node('+nodeId+')',
				'MATCH p=(n)-[:place*]->(c), (n)-[?:creator]->(u)',
				'WHERE c.objType=24',
				'RETURN NODES(p) AS p,u'].join('\n');
	db.query(query,function(err, results){
		if(err) return callback(err, null);
		if(!results.length)
			return callback(null, []);
		var notification = new Array();
		var temp = mapNotificationResult(results[0]);
		notification[temp.id] = temp.not;
		callback(null,notification);
	});
}

var postNotification = function(args, callback){

}

var mapNotificationResult = function(res){
	var n = res['p'].map(function(el){
		return {t: el.data.objType, i: el.id};
	});
	var a;
	var o;
	var lastObjectIndex = nodes.length-1;
	var lastObjectType = nodes[lastObjectIndex].data.objType;
	if(lastObjectType!=42 || lastObjectType!=60){
		a = 1;
		o = {t: lastObjectType, i : nodes[lastObjectIndex].id};
	}else{ //se la notifica parte da un nodo modifica o post il nodo di interesse diventa il suo padre, ovvero il nodo mofificato 
		a = 2;
		o = {t: nodes[lastObjectIndex-1].data.objType, i :nodes[lastObjectIndex-1].id};
	}
	var u = {
	}
	if(res['u'])
		u = {t: res['u'].data.objType, i:res['u'].id};
	return {id: o.i, not:{n:n, o: o, a: a, u:u}};
}

exports.getNotification = getNotification;