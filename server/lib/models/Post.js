var Base = require('./Base');
var ext = require('./extends');

var DB = require('./DB');
var db = DB.db();

var Post = module.exports = function Post(node){
	if(!Post.PROPERTIES)
		setModelSpecs();
	Base.prototype.constructor.call(this, Post, node);
	this._node.data['objType'] = 42;
};

function setModelSpecs(){
	Post.PROPERTIES = new Array('id','content','t','objType');
	Post.INDEX_PROPERTIES = new Array();
}

if(!Post.PROPERTIES)
	setModelSpecs();
ext.inherits(Base, Post);

ext.proxyProperty(Post, 'id');
ext.proxyProperty(Post, 'content',true);
ext.proxyProperty(Post, 't', true);

Post.getById = function (id, callback) {
	Base.getById(Post, id, callback);
};

Post.search = function (key, val, callback) {
	Base.search(Post, key, val, callback);
};

Post.create = function(data, callback, creator, parent){
	if(!creator || !parent)
		return callback('Missing creator or parent');
	Base.create(Post, data, creator, parent, callback);
};