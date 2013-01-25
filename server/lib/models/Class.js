var DB = require('./DB');
var db = DB.db();
var Base = require('./Base');
var ext = require('./extends');

var Class = module.exports = function Class(node){
	if(!Class.PROPERTIES)
		setModelSpecs();
	Base.prototype.constructor.call(this, Class, node);
	this._node.data['objType'] = 24;
};

function setModelSpecs(){
	Class.INDEX_NAME = null;
	Class.INDEX_PROPERTIES = new Array();
	Class.PROPERTIES = new Array('id','name','sqlid','cod_kion', 'ay','location_descr','cfu', 'partition_descr','pubArea','stuArea','profArea','objType','period','year','t' );
}

if(!Class.PROPERTIES)
	setModelSpecs();

ext.inherits(Base, Class);

ext.proxyProperty(Class,'id');
ext.proxyProperty(Class,'name',true);
ext.proxyProperty(Class,'cod_kion', true);
ext.proxyProperty(Class,'sqlid',true);
ext.proxyProperty(Class,'ay',true);
ext.proxyProperty(Class,'location_descr',true);
ext.proxyProperty(Class,'cfu',true);
ext.proxyProperty(Class,'partition_descr',true);
ext.proxyProperty(Class,'pubArea',true);
ext.proxyProperty(Class,'stuArea',true);
ext.proxyProperty(Class,'profArea',true);
ext.proxyProperty(Class,'period',true);
ext.proxyProperty(Class,'year',true);


//static functions
Class.getById = function (id, callback) {
	Base.getById(Class, id, callback);
};

Class.search = function (key, val, callback) {
	Base.search(Class, key, val, callback);
};

// creates the user and persists (saves) it to the db, incl. indexing it:
Class.create = function(data, callback, creator, parent){
	Base.create(Class, data, creator, parent, function(error, result){
		if(error)
			return callback(error, null);
		var areaModel = ext.getModel(26);
		areaModel.create({areaType:1},function(pubError,pubResult){
			if(pubError)
				return callback(pubError,null);
			var publicId = pubResult.object.id;
			areaModel.create({areaType:2},function(stuError,stuResult){
				if(stuError)
					return callback(stuError,null)
				var studentId = stuResult.object.id;
				areaModel.create({areaType:3},function(profError,profResult){
					if(profError)
						return callback(profError,null)
					var professorId = profResult.object.id;
					result.object.pubArea = publicId;
					result.object.stuArea = studentId;
					result.object.profArea = professorId;
					result.object.save(function(err){
						if(err)
							return callback(err,null)
						callback(null, result)
					})
				},null, {id:result.object.id, type:result.object.objType, rel:{areaType:3}})
			},null, {id:result.object.id, type:result.object.objType, rel:{areaType:2}})
		},null, {id:result.object.id, type:result.object.objType, rel:{areaType:1}})
	});
};
