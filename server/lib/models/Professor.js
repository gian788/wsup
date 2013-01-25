var Base = require('./Base');
var ext = require('./extends');
var DB = require('./DB');
var db = DB.db();
var Class = require('./Class');
var Group = require('./Group');

var Professor = module.exports = function Professor(node){
	if(!Professor.INDEX_NAME)
		setModelSpecs();
	Base.prototype.constructor.call(this, Professor, node);
	this._node.data['objType'] = 3;
};

function setModelSpecs(){
	Professor.INDEX_NAME = 'professors';
	Professor.INDEX_PROPERTIES = new Array('name','surname');
	Professor.PROPERTIES = new Array('id','title', 'sqlid','name','surname','email','objType','t');
	Professor.CLASS_REL = "professor_of";
}

if(!Professor.INDEX_NAME)
	setModelSpecs();

ext.inherits(Base, Professor);

ext.proxyProperty(Professor,'id');
ext.proxyProperty(Professor,'title',true);
ext.proxyProperty(Professor,'sqlid',true);
ext.proxyProperty(Professor,'name',true);
ext.proxyProperty(Professor,'surname',true);
ext.proxyProperty(Professor,'email',true);

Professor.prototype._getClassRel = function (otherId, callback) {
	var query = [
	'START career=node(PROFESSOR_ID), other=node(OTHER_ID)',
	'MATCH (career) -[rel?:CLASS_REL]-> (other)',
	'RETURN rel'
	].join('\n')
	.replace('PROFESSOR_ID', this.id)
	.replace('OTHER_ID', otherId)
	.replace('CLASS_REL', Professor.CLASS_REL);

	db.query(query, function (err, results) {
		if (err) return callback(err);
		var rel = results[0] && results[0]['rel'];
		callback(null, rel);
	});
};

Professor.prototype.subscribeToClass = function(_class, data, callback){
	var _prof = this;
	for(i in data)
		if(i!='type' || i!='registered')
			delete data[i];
	this._node.createRelationshipTo(_class._node, Professor.CLASS_REL, data, function(err, result){
		if(err)
			callback(err, null);
		else
			callback(null, {professor: _prof, class: _class});
	});
}

Professor.prototype.unsubscribeFromClass = function (other, data, callback){
	var _prof = this;
	this._getClassRel(other.id, function (err, rel) {
		if (err) return callback(err);
		if (!rel) return callback(null);
        // XXX neo4j lib doesn't alias delete to del; TODO file bug!
        rel['delete'](function(err, result){
        	if(err)
        		callback(err, null);
        	else
        		callback(null, result);
        });
    });
}

//static functions

Professor.getById = function (id, callback) {
	Base.getById(Professor, id, callback);
};

Professor.search = function (key, val, callback) {
	Base.search(Professor, key, val, callback);
};

// creates the user and persists (saves) it to the db, incl. indexing it:
Professor.create = function(data, callback, creator, parent){
	Base.create(Professor, data, null, parent, function(err, result){
		if(err) return callback(err, null);
		var _result = result;
		if(creator){
			var cModel = ext.getModel(creator.type);
			cModel.getById(creator.id, function(e, r){
				r.addProfessor(_result.object,{},callback);
			});
		}else{
			callback(null, _result);
		}
	});
};