var Base = require('./Base');
var ext = require('./extends');

var DB = require('./DB');
var db = DB.db();

var Career = require('./Career');
var Professor = require('./Professor');

//common functions
var User = module.exports = function User(node){
	if(!User.INDEX_NAME)
		setModelSpecs();
	Base.prototype.constructor.call(this, User, node);
	this._node.data['objType'] = 1;
};

function setModelSpecs(){
	User.INDEX_NAME = 'users';
	User.INDEX_PROPERTIES = new Array('fullName');
	User.PROPERTIES = new Array('id','name','surname','type','sqlid','objType','t');
	User.FRIEND_REL = "friend";
	User.CAREER_REL = "has_career";
    User.PROFESSOR_REL = "is_professor";
	User.ACTIVE_CAREER_REL = "active_career";
}

if(!User.INDEX_NAME)
	setModelSpecs();
ext.inherits(Base, User);


Object.defineProperty(User.prototype, 'name', {
        enumerable: true,
        get: function () {
                return this._node.data['name'];
        },
        set: function (value) {
                if(this._node.data['name'] == value)
                    return;
                this.toSave = true;
                this._node.data['name'] = value;
                this.indexesToSave.push('fullName');
        }
});

Object.defineProperty(User.prototype, 'fullName', {
        enumerable: true,
        get: function () {
                return this._node.data['name']+' '+this._node.data['surname'];
        }
});

Object.defineProperty(User.prototype, 'surname', {
        enumerable: true,
        get: function () {
                return this._node.data['surname'];
        },
        set: function (value) {
                if(this._node.data['surname'] == value)
                    return;
                this.toSave = true;
                this._node.data['surname'] = value;
                this.indexesToSave.push('fullName');
        }
});

ext.proxyProperty(User, 'id');
ext.proxyProperty(User, 'email', true);
ext.proxyProperty(User, 'gender', true);
ext.proxyProperty(User, 'type', true);
ext.proxyProperty(User, 'sqlid',true);


//friends functions
User.prototype._getFriendsRel = function (otherId, callback) {
	var query = [
	'START user=node(USER_ID), other=node(OTHER_ID)',
	'MATCH (user) -[rel?:FRIENDS_REL]- (other)',
	'RETURN rel'
	].join('\n')
	.replace('USER_ID', this.id)
	.replace('OTHER_ID', otherId)
	.replace('FRIENDS_REL', User.FRIEND_REL);

	db.query(query, function (err, results) {
		if (err) return callback(err);
		var rel = results[0] && results[0]['rel'];
		callback(null, rel);
	});
};

User.prototype.addFriend = function (other, data,  callback) {
	var user = this;
    this._getFriendsRel(other.id,function(err,rel){
        if(err)
            return callback(err,null);
        if(!rel){
            user._node.createRelationshipTo(other._node, User.FRIEND_REL, data, function(err, result){
                if(err)
                    callback(err, null);
                else
                    callback(null, user);
            });
        }else{
            callback(null, user);
        }
    })
};

User.prototype.addFriendById = function (otherId, data, callback){
	var user = this;
	User.getById(otherId, function(err, result){
		if(err)
			callback(err, null);
		else
			user.addFriend(result, data, callback);
	});
}

User.prototype.removeFriend = function (other, data,  callback) {
	this.removeFriendById(other.id, callback);
};

User.prototype.removeFriendById = function (otherId, data,  callback){
	var user = this;
	this._getFriendsRel(otherId, function (err, rel) {
		if (err) return callback(err,null);
		if (!rel) return callback(null,true);
        // XXX neo4j lib doesn't alias delete to del; TODO file bug!
        //console.log(rel);
        rel.del(function(err){
        	if(err)
        		callback(err, null);
        	else
        		callback(null,true);
        });
    });
}

User.prototype.getFriends = function (callback) {
	var query = [
	'START user=node(USER_ID)',
	'MATCH (user) -[rel:FRIEND_REL]-> (other)',
        'RETURN other, COUNT(other)'  // COUNT(rel) is a hack for 1 or 0
        ].join('\n')
        .replace('USER_ID', this.id)
        .replace('FRIEND_REL', User.FRIEND_REL);

        var user = this;
        db.query(query,function (err, results) {
        	if (err) return callback(err);
        	var friends = [];
        	for (var i = 0; i < results.length; i++) {
        		var other = new User(results[i]['other']);
        		friends.push(other);
        	}
        	user.addExtraProperty("friends", friends);
        	callback(null, user);
        });
    };

//career functions
User.prototype.addCareer = function(_career, data, callback){
	var _user = this;
	this._node.createRelationshipTo(_career._node, User.CAREER_REL, data, function(err, rel){
			if(err) callback(err, null);
			else callback(null, {user: _user, career: _career});
	});
}

User.prototype.addProfessor = function(_professor, data, callback){
    var _user = this;
    this._node.createRelationshipTo(_professor._node, User.PROFESSOR_REL, data, function(err, rel){
            if(err) callback(err, null);
            else callback(null, {user: _user, professor: _professor});
    });
}

User.prototype.getCareers = function(callback){
	var query = [
	'START user=node(USER_ID)',
	'MATCH (user) -[rel:CAREER_REL]-> (career)',
        'RETURN career, COUNT(career)'  // COUNT(rel) is a hack for 1 or 0
        ].join('\n')
        .replace('USER_ID', this.id)
        .replace('CAREER_REL', User.CAREER_REL);

        var user = this;
        db.query(query,function (err, results) {
        	if (err) return callback(err);
        	var careers = result.map(function(rel){
        		return new Pro(rel['career']);
        	})

        	callback(null, careers);
        });
    };

    User.prototype.getProfessor = function(callback){
        var query = [
        'START user=node(USER_ID)',
        'MATCH (user) -[rel:PROFESSOR_REL]-> (prof)',
        'RETURN prof, COUNT(prof)'  // COUNT(rel) is a hack for 1 or 0
        ].join('\n')
        .replace('USER_ID', this.id)
        .replace('PROFESSOR_REL', User.PROFESSOR_REL);

        var user = this;
        db.query(query,function (err, results) {
            if (err) return callback(err);
            var prof = new Professor(results[0]['prof']);
            callback(null, prof);
        });
    }


    User.prototype.getActiveCareer = function(callback){
    	var query = [
    	'START user=node(USER_ID)',
    	'MATCH (user) -[rel:ACTIVE_CAREER_REL]-> (career)',
        'RETURN career, COUNT(career)'  // COUNT(rel) is a hack for 1 or 0
        ].join('\n')
        .replace('USER_ID', this.id)
        .replace('ACTIVE_CAREER_REL', User.ACTIVE_CAREER_REL);

        var user = this;
        db.query(query,function (err, results) {
        	if (err) return callback(err);
        	var career = new Career(results[0]['career']);

        	callback(null, career);
        });
    }
    //career must exist and be connected to the user
    User.prototype.setActiveCareer = function(_career, data, callback){
    	var _user = this;
    	var query = ['START user=node(USER_ID)',
    	'MATCH (user)-[rel?:ACTIVE_CAREER_REL]-> (b)',
    	'RETURN rel']
    	.join('\n')
    	.replace('USER_ID', this.id)
    	.replace('ACTIVE_CAREER_ID', User.ACTIVE_CAREER_ID);
    	db.query(query, function(err, results){
    		if(err) return callback(err, null);
    		else{
    			if(results[0]['rel']){
    				var rel = results[0] && results[0]['rel'];
    				rel['delete'](function(err, result){
    					if(err)
    						return callback(err, null);
    					else
    						_user._node.createRelationshipTo(_career._node, User.ACTIVE_CAREER_REL, data, function(err, rel){
    							if(err) callback(err, null);
    							else callback(null, {user: _user, career: _career});
    						});
    				});
    			}else{
    				_user._node.createRelationshipTo(_career._node, User.ACTIVE_CAREER_REL, data, function(err, rel){
    							if(err) callback(err, null);
    							else callback(null, {user: _user, career: _career});
    						});
    			}
    		}		
    	})
    }

//static functions
User.getById = function (id, callback) {
	Base.getById(User, id, callback);
};

User.search = function (key, val, callback) {
	Base.search(User, key, val, callback);
};

// creates the user and persists (saves) it to the db, incl. indexing it:
User.create = function(data, callback, creator, parent){
	creator = null;
	parent = null;
	Base.create(User, data, creator, parent, callback);
};