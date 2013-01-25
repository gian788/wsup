var Base = require('./Base');
var ext = require('./extends');
var DB = require('./DB');
var db = DB.db();

var Area = module.exports = function Area(node){
	if(!Area.PROPERTIES)
		setModelSpecs();
	Base.prototype.constructor.call(this, Area, node);
	this._node.data['objType'] = 26;
};

function setModelSpecs(){
	Area.PROPERTIES = new Array('id','areaType','objType','t');
	Area.INDEX_PROPERTIES = new Array();
}

if(!Area.PROPERTIES)
	setModelSpecs();
ext.inherits(Base, Area);

ext.proxyProperty(Area, 'id');
ext.proxyProperty(Area, 'areaType',true);

Area.getById = function (id, callback) {
	Base.getById(Area, id, callback);
};

Area.search = function (key, val, callback) {
	Base.search(Area, key, val, callback);
};

Area.create = function(data, callback, creator, parent){
	if(!parent)
		return callback('Missing creator or parent');
	Base.create(Area, data, null, parent, callback);
};