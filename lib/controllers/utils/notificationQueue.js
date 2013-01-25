var Notification = require('../../models/Notification');
var db = require('../../models/DB').db();
var ext = require('../../models/extends');

var queues = new Array(); // global key => value array of notification queues, key is on.id

//constructor of new notification queue
var NotificationQueue = function NotificationQueue(creator, parent, data, on, callback){
	this.onId = on.obj.id;

	//notification queue with the same 'on' object
	this.notQueue = new Array();
	//push the first element in the queue
	this.notQueue.push({creator: creator, parent:parent, data: data, on: on, callback: callback});
	//set the last notification to null (if the current object is the fist notification)
	this.previous = null;

	//find last notification for node
	var query = ['START a=node(ID)',
				'MATCH (a)<-[:ON_REL]-(b), (b)-[rel?:NEXT_REL]->()',
				'WHERE rel is null',
				'RETURN b']
				.join('\n')
				.replace('ID', on.obj.id)
				.replace('ON_REL', Notification.NOTIFICATION_REL)
				.replace('NEXT_REL', Notification.NEXT_REL);
	db.query(query, function(err, results){
		if(err) return callback(err, null);
		if(results.length)
			this.previous = new Notification(results[0]['b']);
	})

	//start processing queue
	this.process(0);
}

//push a new notification in the queue
NotificationQueue.prototype.pushNewNotification = function(creator, parent, data, on, callback){
	this.notQueue.push({creator: creator, parent:parent, data: data, on: on, callback: callback});
}

//process the queue
//TO-DO build a queue system instead of array
NotificationQueue.prototype.process = function(i){
	var _index = i;
	//if queue is ended set the object to null and return
	if(i == this.notQueue.length){
		queues[this.onId] = null;
		return;
	}
	var _this = this;
	var current = this.notQueue[i];
	//build notification result
	var _t = new Date().getTime();
	var _p = {
		t: current.parent.type,
		n: ext.getName(current.parent.type, current.parent.obj),
		i: current.parent.obj.id
	}
	var _u = {
		t: current.creator.type,
		n: ext.getName(current.creator.type, current.creator.obj),
		i: current.creator.obj.id
	}
	var _a = current.data.a;
	var _f = current.data.f;
	var _o = {
		t: current.on.type,
		n: ext.getName(current.on.type, current.on.obj),
		i: current.on.obj.id
	}
	var not = {
		p: _p,
		u: _u,
		o: _o,
		a: _a,
		f: _f,
		t: _t
	}
	//create and save the new notification
	Notification.create(current.creator.obj, current.on.obj, current.parent.obj, {t: _t, a:_a, f:_f}, function(err, result){
		if(err) {
			return current.callback(err, null);
		}
		var newLastNot = result.not;
		//if it's not the first notification of the object, create a new 'next' relationship from the previous one
		if(this.previous)
			previous._node.createRelationshipTo(newLastNot._node, Notification.NEXT_REL, {}, function(e, res){
				if(e){
					return current.callback(e, null);
				}
				this.previous = newLastNot;
				_this.process(++_index);
				current.callback(null, not);
			})
		else{
			this.previous = newLastNot;
			_this.process(++_index);
			current.callback(null, not);
		}
	});
}

//static method to create a new notification, it check if there is a queue for the 'on' object of the new notification,
//if not, allocates a new one
var createNotification = function(creator, parent, data, on, callback){
	if(queues[on.obj.id])
		return queues[on.obj.id].pushNewNotification(creator,parent,data,on,callback);

	var newQueue = new NotificationQueue(creator, parent, data, on, callback);
	queues[on.obj.id] = newQueue;
}

exports.createNotification = createNotification;

