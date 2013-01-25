var Base = require('./Base');
var ext = require('./extends');

var DB = require('./DB');
var db = DB.db();

var Document = module.exports = function Document(node){
	if(!Document.PROPERTIES)
		setModelSpecs();
	Base.prototype.constructor.call(this, Document, node);
	this._node.data['objType'] = 43;
};

function setModelSpecs(){
	Document.PROPERTIES = new Array('id','name','desc','size','extension','url','download','type','path','t','objType');
	Document.INDEX_PROPERTIES = new Array();
}

if(!Document.PROPERTIES)
	setModelSpecs();
ext.inherits(Base, Document);

ext.proxyProperty(Document, 'id');
ext.proxyProperty(Document, 'name',true);
ext.proxyProperty(Document, 'desc',true);
ext.proxyProperty(Document, 'extension', true);
ext.proxyProperty(Document, 'size', true);
ext.proxyProperty(Document, 'path', true);
ext.proxyProperty(Document, 'type', true);
ext.proxyProperty(Document, 't', true);
ext.proxyProperty(Document, 'url',true);
ext.proxyProperty(Document, 'download',true);

Document.getById = function (id, callback) {
	Base.getById(Document, id, callback);
};

Document.search = function (key, val, callback) {
	Base.search(Document, key, val, callback);
};

Document.create = function(data, callback, creator, parent){
	if(!creator || !parent)
		return callback('Missing creator or parent');
	Base.create(Document, data, creator, parent, callback);
};