var DB = require('./DB');
var db = DB.db();

var Base = require('./Base');
var ext = require('./extends');


var GroupDegreeProgram = module.exports = function GroupDegreeProgram(node){
	if(!GroupDegreeProgram.PROPERTIES)
		setModelSpecs();
	Base.prototype.constructor.call(this, GroupDegreeProgram, node);
	this._node.data['objType'] = 22;
};

function setModelSpecs(){
	GroupDegreeProgram.INDEX_NAME = null;
	GroupDegreeProgram.INDEX_PROPERTIES = new Array();
	GroupDegreeProgram.PROPERTIES = new Array('id','name', 'url', 'descr','code', 'sqlid','objType','t');
}

if(!GroupDegreeProgram.PROPERTIES)
	setModelSpecs();

ext.inherits(Base, GroupDegreeProgram);

ext.proxyProperty(GroupDegreeProgram, 'id');
ext.proxyProperty(GroupDegreeProgram, 'name',true);
ext.proxyProperty(GroupDegreeProgram, 'url',true);
ext.proxyProperty(GroupDegreeProgram, 'descr',true);
ext.proxyProperty(GroupDegreeProgram, 'code',true);
ext.proxyProperty(GroupDegreeProgram, 'sqlid',true);

GroupDegreeProgram.getById = function (id, callback) {
	Base.getById(GroupDegreeProgram, id, callback);
};

GroupDegreeProgram.search = function (key, val, callback) {
	Base.search(GroupDegreeProgram, key, val, callback);
};

GroupDegreeProgram.create = function(data, callback, creator, parent){
	Base.create(GroupDegreeProgram, data, creator, parent, callback);
};