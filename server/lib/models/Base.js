var DB = require('./DB');
var db = DB.db();

var ext = require('./extends');

//base constructor
var Base = module.exports = function Base(model, node){
	this._node = node;
	this.toSave = false;
	this.indexesToSave = new Array();
	this.properties = model.PROPERTIES.map(function(p){return p});
	if(model.INDEX_NAME)
		this.index_name = model.INDEX_NAME;
}

Base.PARENT_REL = 'place';  //rel type to the parent
Base.CREATOR_REL = 'creator'; //rel type to the creator
Base.NEXT_REL = 'next_child';

ext.proxyProperty(Base, 'objType', true);
ext.proxyProperty(Base, 't', true);
//add a new property to print
Base.prototype.addExtraProperty = function(name, value){
	this.properties.push(name);
	this[name] = value;
}

//save the object
Base.prototype.save = function (callback) {
	var base = this;
	if(!this.toSave)
		return callback(null,this);
	this._node.save(function (err) {
		if(err)
			callback(err, null);
		else{
			if(base.index_name)
				base.index(callback); //if the object has an index index it
			else{
				callback(null, base);
			}
		}
	});
};

function my_index(i, specs, callback){
	var obj = specs.obj;
	var url = obj._node.db._services.node_index+'/'+obj.index_name+'/'+specs.properties[i]+'/'+obj.id;
	var indexProperty = specs.properties[i];
	var indexValue = obj[specs.properties[i]];
	obj._node._request.del(url,function(_0, response){
		if(!indexValue || indexValue=="")
			return callback(null, obj);
		obj._node.index(obj.index_name, indexProperty, indexValue, function(err){
			specs.toDo--;
			if(err){
				specs.error = err;
				return callback(specs.error, null);				
			}
			obj.indexesToSave.splice(i, 1);
			if(!specs.toDo){
				obj.toSave = false;
				callback(null, obj);
			}
		})
	});	
}

Base.prototype.index = function(callback){
	var obj = this;
	var toDo = obj.indexesToSave.length;
	if(!toDo)
		callback(null, this)
	var tempIndexProp = obj.indexesToSave.map(function(prop){return prop;});
	var error;
	var specs = {obj: obj, toDo: toDo, err: error, properties: tempIndexProp};
	for(var j = 0; j<tempIndexProp.length; j++){
		if(specs.error)
			return;
		my_index(j, specs, callback);
	}
}

Base.prototype.setParent = function(type, parent,data, callback){
	var _this = this;
	var _parent = parent;
	var _nextCreated = false;
	var _parentCreated = false;
	if(this.objType > 40){
		db.query('START n=node('+_parent.id+') MATCH (n)<-[?:place]-(c) WHERE c.objType>40 AND ID(c) <> '+_this.id+' RETURN c ORDER BY c.t', function(err, results){
			if(err) return callback(err, null);
			if(results[0]['c'] == null){
				_nextCreated = true;
				if(_parentCreated)
					callback(null,{parent: _parent, object: _this});
				return;
			}
			var last = results[results.length-1]['c'];
			last.createRelationshipTo(_this._node, Base.NEXT_REL, {}, function(e, res){
				if(e) return callback(e, null);
				_nextCreated = true;
				if(_parentCreated)
					callback(null,{parent: _parent, object: _this});
			})
		})
	}
	this._node.createRelationshipTo(_parent._node, Base.PARENT_REL, data , function(err, result){
		if(err) return callback(err, null);
		_parentCreated = true;
		if(_this.objType<41){
			callback(null, {parent: _parent, object: _this});
		}
		if(_this.objType > 40 && _nextCreated){
			return callback(null, {parent: _parent, object: _this});
		}
	})
}

Base.prototype.getParent = function(callback){
	var query = ['START n=node(ID)',
				'MATCH (n)-[rel?:PARENT_REL]-> (par)',
				'RETURN par']
				.join('\n')
				.replace('ID', this.id)
				.replace('PARENT_REL', Base.PARENT_REL);
	db.query(query, function(err, results){
		if(err) return callback(err, result);
		var parentModel = ext.getModel(results[0]['par'].data['objType']);
		var _parent = new parentModel(results[0]['par']);
		callback(null, _parent);
	})
}

Base.prototype.setCreator = function(type, creator, callback){
	var _this = this;
	var _creator = creator;
	this._node.createRelationshipTo(_creator._node, Base.CREATOR_REL, {} , function(err, result){
		if(err) return callback(err, null);
		callback(null, {creator: _creator, object: _this});
	})
}

Base.prototype.getCreator = function(callback){
	var query = ['START n=node(ID)',
				'MATCH (n)-[rel?:CREATOR_REL]-> (creator)',
				'RETURN creator']
				.join('\n')
				.replace('ID', this.id)
				.replace('CREATOR_REL', Base.CREATOR_REL);
	db.query(query, function(err, results){
		if(err) return callback(err, result);
		var creatorModel = ext.getModel(results[0]['creator']['objType']);
		var _creator = new creatorModel(results[0]['creator']);
		callback(null, _creator);
	})
}

Base.prototype.del = function (callback) {
	var _this = this;
	if(this.objType > 40){
		var delQuery = ['START n=node('+_this.id+')',
						'MATCH (n)<-[:place]-(child)',
						'RETURN child'].join('\n');
		db.query(delQuery,function(err,children){
			if(err)
				return callback(err,null);
				var _id = _this.id;
				var total = children.length;
				if(total!=0)
						deleteChildNodes(0,children,function(err,res){
							if(err)
								return callback(err,null);
							var query = ['START n=node('+_id+')',
										'MATCH (prev)-[?:'+Base.NEXT_REL+']->(n)-[?:'+Base.NEXT_REL+']->(next)',
										'RETURN prev,next'].join('\n');
							db.query(query,function(err,r){
								if(err)
									return callback(err,null);
								if(r[0]['prev'] && r[0]['next']){
									r[0]['prev'].createRelationshipTo(r[0]['next'],Base.NEXT_REL,{},function(err,relation){
										if(err)
											return callback(err,null);
										_this._node.del(function(f){
											if(f)
												return callback(f,null)
											callback(null, true);
										},true)
									})
								}else{		
									_this._node.del(function(f){
										if(f)
											return callback(f,null)
										callback(null, true);
									},true)
								}
							})
						})
				else{
					var query = ['START n=node('+_id+')',
								'MATCH (prev)-[?:'+Base.NEXT_REL+']->(n)-[?:'+Base.NEXT_REL+']->(next)',
								'RETURN prev,next'].join('\n');
					db.query(query,function(err,r){
						if(err)
							return callback(err,null);
						if(r[0]['prev'] && r[0]['next']){
							r[0]['prev'].createRelationshipTo(r[0]['next'],Base.NEXT_REL,{},function(err,relation){
								if(err)
									return callback(err,null);
								_this._node.del(function(f){
									if(f)
										return callback(f,null)
									callback(null, true);
								},true)
							})
						}else{		
							_this._node.del(function(f){
								if(f)
									return callback(f,null)
								callback(null, true);
							},true)
						}
					})
				}
		})
	}
};

function deleteChildNodes(index,children,callback){
	var total = children.length;
	if(index == total)
		return callback(null, true);
	var delQuery = ['START n=node('+children[index]['child'].id+')',
						'MATCH (n)<-[:place]-(child)',
						'RETURN child'].join('\n');
	db.query(delQuery,function(err,ch){
		if(err)
			return callback(err,null);
		if(ch.length!=0){
			deleteChildNodes(0,ch,function(a,b){
				if(a)
					return callback(a,null);
				ch[index]['child'].del(function(delErr){
					if(delErr)
						return callback(delErr,null);
					deleteChildNodes(++index,children,callback);
				})
			});
		}else
			deleteChildNodes(++index,children,callback);
	},true)
}

Base.prototype.toPlainObject = function(){
	var obj = new Object();
	var _properties = this.properties;
	for(var i = 0; i<_properties.length; i++){
		var value;
		var temp = this[_properties[i]];
		if(Object.prototype.toString.call( temp ) == "[object Array]"){
			value = new Array();
			for(var j = 0; j<temp.length; j++)
				if(typeof temp[j].toPlainObject == 'function'){
					value.push(temp[j].toPlainObject());
				}
				else
					value.push(temp[j]);
				obj[_properties[i]] = value;
		}else{
				if(Object.prototype.toString.call( temp ) == "[object Object]"){
					if(typeof temp.toPlainObject == 'function'){
						value = temp.toPlainObject();
					}
					else
						value = temp;
					obj[_properties[i]] = value;
				}else{
					value = temp;
					obj[_properties[i]] = value;	
				}		
			}		
		}
		return obj;
}

Base.prototype.toJson = function(){
	console.log('toJson')
	return JSON.stringify(this.toPlainObject());
}

Base.create = function(model, data, creator, parent, callback){
		var newData = {};
		//check matching properties
		for (prop in model.PROPERTIES)
			if(model.PROPERTIES[prop] in data && prop!='id' && data[model.PROPERTIES[prop]]!=null)
				newData[model.PROPERTIES[prop]] = data[model.PROPERTIES[prop]];
			newData['t']= new Date().getTime();
			//newData.t = new Date();
			var node = db.createNode(newData);
			var obj = new model(node);		
			obj.indexesToSave = model.INDEX_PROPERTIES.map(function(prop){return prop});
			obj.toSave = true;
			var _creator, _parent;
			obj.save(function(err, result){
				if(err) return callback(err, null);
				//if parent and creator are not passed, return just the created object
				if(!creator && !parent){
					return callback(null, {parent: null, creator: null, object: obj});
				}
				//check if creator is passed as parameter
				if(creator){
					var cModel = ext.getModel(creator.type);
					cModel.getById(creator.id, function(err, result){
						if (err) return callback(err, null);
						obj.setCreator(creator.type, result, function(e, res){
							if(e) return callback(e, null);
							_creator = res.creator;
							//if parent is passed as parameter and the object is set return all objects
							if(parent){
								if(_parent)
									callback(null, {parent:_parent, creator:_creator, object:obj});
							}else{
								//if parent is not passed as parameter, don't wait and return object with parent = null
								callback(null, {parent: null, creator: _creator, object: obj});
							}
						})
					})
				}

				if(parent){
					var pModel = ext.getModel(parent.type);
					pModel.getById(parent.id, function(err, result){
						if (err) return callback(err, null);
						var parentRelData = {};
						if(parent.rel)
							parentRelData = parent.rel;
						obj.setParent(parent.type, result,parentRelData, function(e, res){
							if(e) return callback(e, null);
							_parent = res.parent;
							//if creator is passed as parameter and the object is set return all objects
							if(creator){
								if(_creator)
									callback(null, {parent:_parent, creator:_creator, object:obj});
							}else{
								//if creator is not passed as parameter, don't wait and return objcet with creator = null
								callback(null, {parent: _parent, creator: null, object: obj});
							}
						})
					})
				}

			});
}

Base.search = function (model, key, val, callback) {
	var query = ['START n=node:INDEX("PROP:VAL*")',
		'RETURN n'
		].join('\n')
		.replace('INDEX', model.INDEX_NAME)
		.replace('PROP', key)
		.replace('VAL', val);
	db.query(query, function(err,results){
		if(err)	return callback(err);
		var objs = results.map(function(node){return new model(node['n'])})
		callback(null, objs);
	});
};

Base.getById = function (model, id, callback) {
	db.getNodeById(id, function (err, node) {
		if (err) return callback(err);
		callback(null, new model(node));
	});
};