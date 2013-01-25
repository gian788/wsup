var Base = require('./Base');
var ext = require('./extends');

var DB = require('./DB');
var db = DB.db();

var Topic = module.exports = function Topic(node){
	if(!Topic.PROPERTIES)
		setModelSpecs();
	Base.prototype.constructor.call(this, Topic, node);
	this._node.data['objType'] = 41;
};

function setModelSpecs(){
	Topic.PROPERTIES = new Array('id','name','desc','t','ref','objType');
	Topic.INDEX_PROPERTIES = new Array();
}

if(!Topic.PROPERTIES)
	setModelSpecs();
ext.inherits(Base, Topic);

ext.proxyProperty(Topic, 'id');
ext.proxyProperty(Topic, 'name',true);
ext.proxyProperty(Topic, 'desc', true);
ext.proxyProperty(Topic, 't', true);
ext.proxyProperty(Topic, 'ref',true);

Topic.getById = function (id, callback) {
	Base.getById(Topic, id, callback);
};

Topic.search = function (key, val, callback) {
	Base.search(Topic, key, val, callback);
};

Topic.create = function(data, callback, creator, parent){
	if(!creator || !parent)
		return callback('Missing creator or parent');
	Base.create(Topic, data, creator, parent, callback);
};