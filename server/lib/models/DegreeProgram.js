var DB = require('./DB');
var db = DB.db();

var Base = require('./Base');
var ext = require('./extends');


var DegreeProgram = module.exports = function DegreeProgram(node){
	if(!DegreeProgram.PROPERTIES)
		setModelSpecs();
	Base.prototype.constructor.call(this, DegreeProgram, node);
	this._node.data['objType'] = 23;
};

function setModelSpecs(){
	DegreeProgram.INDEX_NAME = null;
	DegreeProgram.INDEX_PROPERTIES = new Array();
	DegreeProgram.PROPERTIES = new Array('id','name', 'act_y','act_y_ord', 'law_code','type_descr', 'sqlid','objType','t');
}

if(!DegreeProgram.PROPERTIES)
	setModelSpecs();

ext.inherits(Base, DegreeProgram);

ext.proxyProperty(DegreeProgram, 'id');
ext.proxyProperty(DegreeProgram, 'name',true);
ext.proxyProperty(DegreeProgram, 'act_y',true);
ext.proxyProperty(DegreeProgram, 'law_code',true);
ext.proxyProperty(DegreeProgram, 'type_descr',true);
ext.proxyProperty(DegreeProgram, 'sqlid',true);
ext.proxyProperty(DegreeProgram, 'act_y_ord',true);

DegreeProgram.getById = function (id, callback) {
	Base.getById(DegreeProgram, id, callback);
};

DegreeProgram.search = function (key, val, callback) {
	Base.search(DegreeProgram, key, val, callback);
};

DegreeProgram.create = function(data, callback, creator, parent){
	Base.create(DegreeProgram, data, creator, parent, callback);
};
