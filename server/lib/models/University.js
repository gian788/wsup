var Base = require('./Base');
var ext = require('./extends');

var DB = require('./DB');
var db = DB.db();

var INDEX_NAME = 'classes';

var INDEX_PROPERTIES = new Array('name');

var DEGREE_PROGRAMS_REL = "of_university";

var UniversityS_REL = "at_university";

var University = module.exports = function University(node){
	if(!University.INDEX_NAME)
		setModelSpecs();
	Base.prototype.constructor.call(this, University, node);
	this._node.data['objType'] = 21;
};

function setModelSpecs(){
	University.INDEX_NAME = 'universities';
	University.INDEX_PROPERTIES = new Array('name', 'city');
	University.PROPERTIES = new Array('id','name','city','sqlid', 'country','state','objType','t');
}

if(!University.INDEX_NAME)
	setModelSpecs();
ext.inherits(Base, University);

ext.proxyProperty(University, 'id');
ext.proxyProperty(University, 'name',true);
ext.proxyProperty(University, 'city', true);
ext.proxyProperty(University, 'country', true);
ext.proxyProperty(University, 'state', true);
ext.proxyProperty(University, 'sqlid',true);

University.getById = function (id, callback) {
	Base.getById(University, id, callback);
};

University.search = function (key, val, callback) {
	Base.search(University, key, val, callback);
};

// creates the user and persists (saves) it to the db, incl. indexing it:
University.create = function(data, callback, creator, parent){
	parent = null;
	Base.create(University, data, creator, parent, callback);
};