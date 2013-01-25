var Base = require('./Base');
var ext = require('./extends');
var DB = require('./DB');
var db = DB.db();

var Career = module.exports = function Career(node){
	if(!Career.PROPERTIES)
		setModelSpecs();
	Base.prototype.constructor.call(this, Career, node);
	this._node.data['objType'] = 2;
};

function setModelSpecs(){
	Career.INDEX_NAME = null;
	Career.INDEX_PROPERTIES = new Array();
	Career.PROPERTIES = new Array('id', 'career_id', 'reg_year', 'sqlid','objType','t');
	Career.CLASS_REL = "in_class";
	Career.GROUP_REL = "in_group";
	Career.DEGREE_PROGRAM_REL = "in_degree_program";
}

if(!Career.PROPERTIES)
	setModelSpecs();

ext.inherits(Base, Career);

ext.proxyProperty(Career,'id');
ext.proxyProperty(Career,'career_id',true);
ext.proxyProperty(Career,'reg_year',true);
ext.proxyProperty(Career,'sqlid',true);

Career.prototype._getClassRel = function (otherId, callback) {
	var query = [
	'START career=node(CAREER_ID), other=node(OTHER_ID)',
	'MATCH (career) -[rel?:CLASS_REL]-> (other)',
	'RETURN rel'
	].join('\n')
	.replace('CAREER_ID', this.id)
	.replace('OTHER_ID', otherId)
	.replace('CLASS_REL', Career.CLASS_REL);

	db.query(query, function (err, results) {
		if (err) return callback(err);
		var rel = results[0] && results[0]['rel'];
		callback(null, rel);
	});
};

Career.prototype.subscribeToClass = function(_class, data, callback){
	var _career = this;
	this._node.createRelationshipTo(_class._node, Career.CLASS_REL, data, function(e,r){
		if(e){
		 return callback(e,null);
		}
		callback(null, "Created");
	});
}

Career.prototype.unsubscribeFromClass = function (other, data, callback){
	var career = this;
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

Career.prototype.completeClass = function(classId, result, callback){
	var career = this;
	this._getClassRel(classId, function (err, rel) {
		if (err) return callback(err,null);
		if (!rel) return callback(null,null);
        // XXX neo4j lib doesn't alias delete to del; TODO file bug!
        rel.data['completed'] = true;
        if(result)
        	rel.data['result'] = result;
        rel.save(function(err){
        	if(err)
        		return callback(err)
        	return callback(null, true);
        })
    });
}

Career.prototype._getGroupRel = function (otherId, callback) {
	var query = [
	'START career=node(CAREER_ID), other=node(OTHER_ID)',
	'MATCH (career) -[rel?:GROUP_REL]-> (other)',
	'RETURN rel'
	].join('\n')
	.replace('CAREER_ID', this.id)
	.replace('OTHER_ID', otherId)
	.replace('GROUP_REL', Career.GROUP_REL);

	db.query(query, function (err, results) {
		if (err) return callback(err);
		var rel = results[0] && results[0]['rel'];
		callback(null, rel);
	});
};

Career.prototype.subscribeToGroup = function(group, data, callback){
	var _career = this;
	this._node.createRelationshipTo(group._node, Career.GROUP_REL, {}, function(err, result){
		if(err)
			callback(err, null);
		else
			callback(null, {career: _career, group: group});
	});
}

Career.prototype.unsubscribeFromGroup = function (other, data, callback){
	var career = this;
	this._getGroupRel(other.id, function (err, rel) {
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

Career.getById = function (id, callback) {
	Base.getById(Career, id, callback);
};

Career.search = function (key, val, callback) {
	Base.search(Career, key, val, callback);
};

// creates the user and persists (saves) it to the db, incl. indexing it:
Career.create = function(data, callback, creator, parent){
	if(!parent || !creator)
		return callback('Parent or Creator is null', null);
	Base.create(Career, data, null, null, function(err, result){
		if(err) return callback(err, null);
		var _result = result.object;
		var _creator, _parent;
		var cModel = ext.getModel(creator.type);
		cModel.getById(creator.id, function(e, r){
			if(e) return callback(e, null);
			r.addCareer(_result, {}, function(a, b){
				if(a) return callback(a, null);
				_creator = r;
				if(_parent)
					callback(null, {object:_result, user:_creator, degree_program:_parent});
			})
		});
		var pModel = ext.getModel(parent.type);
		pModel.getById(parent.id, function(e, r){
			if(e) return callback(e, null);
			_result._node.createRelationshipTo(r._node, Career.DEGREE_PROGRAM_REL, {}, function(a, b){
				if(a) return callback(a, null);
				_parent = r;
				if(_creator)
					callback(null, {object:_result, user:_creator, degree_program:_parent});
			})
		})
	});
};