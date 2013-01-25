var Utils = require('./utils/utils.js');
//var Notification = require('./notification');
var ext = require('../models/extends');

/*
require

type 	type of object to insert
data: {
	o:{
			properties of the added object
	}
	u:{		OPTIONAL who is adding object
		t ,
		i
	}
	p:{		OPTIONAL object parent
		t ,
		i
	}
}
*/

add = function(type, data, sqlCallback, notCallback){
	var mod = ext.getModel(type);
	var _creator = null
	if(data.u)
		_creator = {
			type: data.u.t,
			id: data.u.i
		}
	var _parent = null;
	if(data.p)
		_parent = {
			type: data.p.t,
			id: data.p.i
		}
	mod.create(data.o, function(err, user){
		if(err) return sqlCallback(err, null);
		if(notCallback){
			//Notification.getNotification(user.id);
		}			
		sqlCallback(null, {sqlid:user.object.sqlid, nosqlid:user.object.id, obj:user.object});
	}, _creator, _parent); //create the new object passing the object data (data.o), the creator id (data.u.i) and the parent id (data.p.i)
}

/*
require
type 	type of object to edit
data:{
	o:{			object to update
		id ,
				object data to update
	}
}	
*/

update = function(type, data, callback, notCallback){
	var savedProperties = new Array();
	var mod = ext.getModel(type);
	mod.getById(data.o.id, function(err, obj){ //return the object to update passing the id (data.o.i)
		var toSave = false;
		if(err) return callback(err)
			for(i in data.o)
				if(Utils.contains(obj.properties,i) && i != 'id'){
					toSave = true;
					obj[i] = data.o[i];
					savedProperties.push(i);
				}
		if(toSave) //save and notificate only if a property match
			obj.save(function(err, result){
				if(err){
					return callback(err,null);
				}
				callback(null, null);				
			})
else
	callback('Wrong properties');
})
}

del = function(type, data, callback){
	var mod = ext.getModel(type);
	if(!data.id)
		return callback('No id', null);
	mod.getById(data.id, function(err, user){
		if(err) return callback(err, null);
		user.del(callback);
	})
}

/*require 
data:{
	f: {	origine
		i: ,
		t: 
	}
	t:{		destinazione
		i: ,
		t
	}
	u: {    opzionale, se manca corrisponde a f
		i: ,
		t
	}
	o: {  	dati opzionali da aggiungere alla relazione
	
	}
	a: 		azione
}
*/

relationship = function(type, data, callback, notCallback){
	var from, to, who;
	if(!data.o)
		data.o = {};
	if(!data.u)
		data.u = data.f;
	var modTo = ext.getModel(data.t.t);
	modTo.getById(data.t.i, function(err, result){
		if(err) return callback(err, null)
			to = result;
		if(from && to && who)
			callRelationshipAction(data.a, from, to, who, data.o, callback, notCallback);
	})
	var modFrom = ext.getModel(data.f.t);
	modFrom.getById(data.f.i, function(err, result){
		if(err) return callback(err, null);
		
		from = result;
		if(data.u.i == data.f.i)
			who = from;
		if(from && to && who)
			callRelationshipAction(data.a, from, to, who, data.o, callback, notCallback);
	})

	if(data.u.i != data.f.i){
		var modWho = ext.getModel(data.u.t);
		modWho.getById(data.u.i, function(err, result){
			if(err)return callback(err, null);
			who = result;
			if(from && to && who)
				callRelationshipAction(data.a, from, to, who, data.o, callback, notCallback);
		})
	}
}


function callRelationshipAction(action, _this, to, who, data,  callback, notCallback){
	var method = ext.getRelationshipAction(_this.objType, to.objType, action);
	method.call(_this, to, data,  function(err, result){
		if(err) return callback(err, null);
	})
}




exports.insert = add;
exports.update = update;
exports.remove = del;
exports.relationship = relationship;