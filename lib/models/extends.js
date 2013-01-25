var m = require('../../global/models');

function surrogateCtor() {}

inherits = function(base, sub) {
  // Copy the prototype from the base to setup inheritance
  surrogateCtor.prototype = base.prototype;
  // Tricky huh?
  sub.prototype = new surrogateCtor();
  // Remember the constructor property was set wrong, let's fix it
  sub.prototype.constructor = sub;
}

proxyProperty = function(model, prop, isData) {
		Object.defineProperty(model.prototype, prop, {
			enumerable: true,
			get: function () {
				if (isData) {
					return this._node.data[prop];
				} else {
					return this._node[prop];
				}
			},
			set: function (value) {
				if (isData) {
					if(this._node.data[prop] == value)
						return;
					this.toSave = true;
					if(model.INDEX_PROPERTIES && arrayContains(model.INDEX_PROPERTIES, prop))
						this.indexesToSave.push(prop);
					this._node.data[prop] = value;
				} else {
					this._node[prop] = value;
				}
			}
		});
	}


var functionMatrix;
//function to return function from the matrix
getRelationshipAction = function(fromType, toType, type){
	//matrix to map functions
	if(!functionMatrix)
		functionMatrix = instantiateFunctionMatrix();
	return functionMatrix[fromType][toType][type];
}

function instantiateFunctionMatrix(){
	var matrix = new Array();
	//user
	matrix[m.USER] = new Array();
	//[user][user]
	matrix[m.USER][m.USER] = new Array();
	matrix[m.USER][m.USER][4] = getModel(1).prototype.addFriend; //User.addFriend
	matrix[m.USER][m.USER][5] = getModel(1).prototype.removeFriend;
	//[user][career]
	matrix[m.USER][m.CAREER] = new Array();
	matrix[m.USER][m.CAREER][4] = getModel(1).prototype.addCareer; //User.addCareer
	matrix[m.USER][m.CAREER][41] = getModel(1).prototype.setActiveCareer; //User.setActiveCareer
	//[user][professor]
	matrix[m.USER][m.PROFESSOR] = new Array();
	matrix[m.USER][m.PROFESSOR][4] = getModel(1).prototype.addProfessor;

	//[career]
	matrix[m.CAREER] = new Array();
	//[career][class]
	matrix[m.CAREER][m.CLASS] = new Array();
	matrix[m.CAREER][m.CLASS][4] = getModel(2).prototype.subscribeToClass;
	matrix[m.CAREER][m.CLASS][5] = getModel(2).prototype.unsubscribeFromClass;

	//[career][group]
	matrix[m.CAREER][m.GROUP] = new Array();
	matrix[m.CAREER][m.GROUP][4] = getModel(2).prototype.subscribeToGroup;
	matrix[m.CAREER][m.GROUP][5] = getModel(2).prototype.unsubscribeFromGroup;

	//[professor]
	matrix[m.PROFESSOR]= new Array();
	//[professor][class]
	matrix[m.PROFESSOR][m.CLASS] = new Array();
	matrix[m.PROFESSOR][m.CLASS][41] = getModel(3).prototype.subscribeToClass;
	return matrix;
}

function arrayContains(arr, val){
		var i = arr.length;
		while (i--) {
			if (arr[i] === val) {
				return true;
			}
		}
		return false;
}

function getModel(type){
	type = parseInt(type);
	switch (type){
		case m.USER:
			return require('./User');
			break;
		case m.CAREER:
			return require('./Career');
			break;
		case m.PROFESSOR:
			return require('./Professor');
			break;
		case m.UNIVERSITY:
			return require('./University');
			break;
		case m.GROUP_DEGREE_PROGRAM:
			return require('./GroupDegreeProgram');
			break;
		case m.DEGREE_PROGRAM:
			return require('./DegreeProgram');
			break;
		case m.CLASS:
			return require('./Class');
			break;
		case m.GROUP: return require('./Group');
			break;
		case m.TOPIC:
			return require('./Topic');
			break;
		case m.POST:
			return require('./Post');
			break;
		case m.DOCUMENT:
			return require('./Document');
			break;
		case m.AREA:
			return require('./Area');
			break;
		default:
			break;
	}
}

getName = function(type, obj){
	type = parseInt(type);
	switch (type){
		case m.USER:
		return obj.name + ' ' + obj.surname;
		break;
		case m.CAREER:
		return obj.career_id;
		break;
		case m.PROFESSOR:
		return obj.name;
		break;
		case m.UNIVERSITY:
		return obj.name;
		break;
		case m.GROUP_DEGREE_PROGRAM:
		return obj.name;
		break;
		case m.DEGREE_PROGRAM:
		return obj.name;
		break;
		case m.CLASS:
		return obj.name;
		break;
		case m.GROUP:
		return obj.name;
		break;
		case m.TOPIC:
		return obj.name;
		break;
		case m.POST:
		return obj.content;
		break;
		case m.DOCUMENT:
		return obj.name;
		break;
		default:
		return '';
		break;
	}
}


exports.getModel = getModel;
exports.inherits = inherits;
exports.proxyProperty = proxyProperty;
exports.getRelationshipAction = getRelationshipAction;
exports.getName = getName;