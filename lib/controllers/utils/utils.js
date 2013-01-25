toJson = function(obj){	
	return JSON.stringify(toPlainObject(obj));
}

toPlainObject = function(obj){
	if(obj.toPlainObject && typeof obj.toPlainObject == 'function')
		return obj.toPlainObject();
	if(typeof(obj) != 'Array' && typeof(obj) != 'object')
		return obj;
	var temp = new Array();
	if(Object.prototype.toString.call(obj) == "[object Array]"){
		for(var i = 0; i < obj.length; i++)
			if(typeof obj[i].toPlainObject == 'function')
				temp.push(obj[i].toPlainObject());
			else
				temp.push(obj[i]);
		return temp;
	}
	temp = new Object();
	for (i in obj)
		if(obj[i]!=null && typeof obj[i].toPlainObject == 'function')
			temp[i] = obj[i].toPlainObject();
		else
			temp[i] = obj[i];
		return temp;
}

isEmpty= function(x){for(p in x)return!1;return!0};

contains = function(a, obj) {
	var i = a.length;
	while (i--) {
		if (a[i] === obj) {
			return true;
		}
	}
	return false;
}

canSee = function(user, objectId,callback){
	var m = require(process.cwd()+'/global/models');
	var db = require(process.cwd()+'/lib/models/DB').db();
	var uType = user.type;
	var query = ['START n=node('+user.nosqlid+'),e=node('+objectId+')',
				'MATCH p=(e)-[:place*]->(cg), (n)-[:has_career|is_professor]-()-[sub?:in_class|in_group|professor_of]->(cg)',
				'WHERE cg.objType! = 24 OR cg.objType! = 25',
				'RETURN extract(a in NODES(p) : a.objType) AS types,LAST(extract(a in RELATIONSHIPS(p) : a.areaType?)) AS areaType,sub'].join('\n');
	db.query(query,function(err,result){
		if(err){
			return callback(err,null);
		}
		var types = result[0]['types'];
		var areaType = result[0]['areaType'];
		var sub = result[0]['sub'];
		if(types[types.length-1] == m.GROUP && sub)
			return callback(null, {canSee:true,canEdit:true});
		if(types[types.length-1] == m.GROUP && !sub)
			return callback(null, {canSee:false,canEdit:false});
		var cS = false;
		if(areaType){
			if(areaType==1)
				cS = true;
			if(areaType==2 && uType==1)
				cS = true;
			if(areaType==3 && uType==2)
				cS = true;
		}
		var cE = false;
		if(sub)
			cE = true;
		return callback(null, {canSee:cS,canEdit:cE});
	})
}

var getClassArea = function(classId,privacy,userType,callback){
	var _classId = classId
	var _privacy = privacy
	var _userType = userType
	var m = require(process.cwd()+'/global/models');
	var db = require(process.cwd()+'/lib/models/DB').db();
	var query = ['START n=node('+_classId+')',
				'RETURN n'].join('\n');
	db.query(query,function(err,result){
		if(err || !result.length)
			return callback(err,null);
		if(_privacy == 1)
			return callback(null,result[0]['n'].data.pubArea);
		if(_privacy == 2){
			if(_userType == 1)
				return callback(null,result[0]['n'].data.stuArea);
			if(_userType == 2)
				return callback(null,result[0]['n'].data.profArea);
		}
		return callback(null,null);
	})
}

exports.toJson = toJson;
exports.toPlainObject = toPlainObject;
exports.isEmpty = isEmpty;
exports.contains = contains;
exports.canSee = canSee;
exports.getClassArea = getClassArea;