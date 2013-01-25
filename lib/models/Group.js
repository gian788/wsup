var DB = require('./DB');
var db = DB.db();

var Base = require('./Base');
var ext = require('./extends');

var Group = module.exports = function Group(node){
	if(!Group.PROPERTIES)
		setModelSpecs();
	Base.prototype.constructor.call(this, Group, node);
	this._node.data['objType'] = 25;
};

function setModelSpecs(){
	Group.INDEX_NAME = null;
	Group.INDEX_PROPERTIES = new Array();
	Group.PROPERTIES = new Array('id','name','objType','t');
}

if(!Group.PROPERTIES)
	setModelSpecs();

ext.inherits(Base, Group);

ext.proxyProperty(Group, 'id');
ext.proxyProperty(Group, 'name',true);

Group.getById = function (id, callback) {
	Base.getById(Group, id, callback);
};

Group.search = function (key, val, callback) {
	Base.search(Group, key, val, callback);
};

// creates the user and persists (saves) it to the db, incl. indexing it:
Group.create = function(data, callback, creator, parent){
	Base.create(Group, data, creator, parent, callback);
};