var m = require(process.cwd()+'/global/models');
var db = require('../models/DB').db();
var ext = require('../models/extends');
var Utils = require('./utils/utils');


var generic = require('./generic');

var servers = require(process.cwd() + '/config/servers')
var
  sys = require('util'),
  mysql = require('mysql-libmysqlclient');

completeStudent = function(args, user, callback){
	var vcode = args.vcode;
	if(!vcode){
		callback('Missing parameter: vcode',null);
		return;
	};
	var email = args.email;
	if(!email){
		callback('Missing parameter: email', null);
		return;
	};

	var conn = mysql.createConnectionSync();
	conn.connectSync(servers.MYSQL.host, servers.MYSQL.user, servers.MYSQL.password, servers.MYSQL.database);
	conn.setCharsetSync('utf8');
	if (!conn.connectedSync()) {
		  console.log("Connection error " + conn.connectErrno + ": " + conn.connectError);
		  process.exit(1);
	}

	conn.query('SELECT * FROM temp_user WHERE email="' + email +'" AND vcode="' + vcode +'";', function(err, res){
		if(err){
			callback('error: ' + err, null);
			return;	
		}
		if(res.affectedRows <= 0){
			callback('invalid registration request', null);
			return;
		}	

		var password;
		var salt;
		res.fetchAll(function (err, rows) {
			if (err) {
		      callback(err, null);
		      return;
		    }
			password = rows[0].password;
			salt = rows[0].salt;	

			//neo4j insert
			var type = m.USER;
			var now = new Date().getTime();
			var data = {
				o: {
					email:  email,				
					type: 1,
					name: args.name,
					surname: args.surname,
					gender: args.gender
				}			
			};
			generic.insert(type, data, function(err, result){
				if(err) 
					return callback(err, null);
				//mysql insert
				var date = new Date();"Y-m-d H:i:s"
				date = '' + date.getFullYear() + '-' + date.getMonth() + '-' + date.getDate() + ' ' + date.getHours() + ':' + date.getMinutes() + ':' + date.getSeconds();
				data = {
					nosqlid: result.object.id,
					email:  email,
					password: password,
					salt: salt,
					user_state: 1,
					type: 1,
					name: args.name,
					surname: args.surname,
					birthday: args.birthday,
					gender: args.gender,
					phone: args.phone,
					country: args.country,
					city: args.city,
					state: args.state,
					registration_date: date,
					last_login: date
				}
				var params = '';
				var value = '';
				for(var i in data){
					if(data[i] != null && data[i] != undefined && data[i] != 'NaN'){
						params += i + ',';
						value += "'" + data[i] + "',";
					}
				}
				params = params.substring(0, params.length - 1); 
				value = value.substring(0, value.length - 1);
				conn.query('INSERT INTO user (' + params + ') VALUES (' + value + ');', function(err, res2){
					if(err){
						return callback(err,'');
					}
					if(res2.affectedRows == 0){
						return callback('error: mysql not insert user','');
					}
					result.object.sqlid = res2.insertId;
					result.object.save(function(err,resS){
						//insert career neo4j
						if(!args.career_id)
							args.career_id = null;
						var dataC = {
							o: {
								career_id: args.career_id,
								reg_year: args.reg_year 
							},
							u: {
								t: result.object.objType,
								i: result.object.id
							},
							p: {
								t: m.DEGREE_PROGRAM,
								i: args.degree_program
							}
						}
						generic.insert(m.CAREER, dataC, function(err, res3){
							if(err){
								return callback(err,'');
							}
							result.object.setActiveCareer(res3.object, {}, function(err, res4){
								var dataC = {
									nosqlid: res3.object.id,
									reg_year: args.reg_year,
									career_id: args.career_id,
									user: result.object.sqlid,
									degree_program: res3.degree_program.sqlid,
									default: 1,
									state: 1										
								}
								params = '';
								value = '';
								for(var i in dataC){
									if(dataC[i] != null && dataC[i] != undefined && dataC[i] != 'NaN'){
										params += '`' + i + '`,';
										value += "'" + dataC[i] + "',";
									}
								}
								params = params.substring(0, params.length - 1); 
								value = value.substring(0, value.length - 1);
								conn.query('INSERT INTO `career` (' + params + ') VALUES (' + value + ');', function(err, res5){										
									if(err){
										return callback(err,'');
									}
									if(res5.affectedRows == 0){
										return callback('error: mysql not insert career','');
									}										
									conn.query('UPDATE user SET active_career=' + res5.insertId + ' WHERE id=' + result.object.sqlid + ';', function(err, res6){											
										if(err){
											return callback(err,'');
										}
										if(res5.affectedRows == 0){
											return callback('error: mysql not update user-active_career','');
										}
										res3.object.sqlid = res5.insertId;
										res3.object.save(function(err,res7){												
											if(err){
												return callback(err,'');
											}
											conn.query('DELETE FROM temp_user WHERE email="' + email + '";', function(err, res8){	
												if(err){
													return callback(err,'');
												}
												var retObj = {
													id: result.object.id,
													sqlId: result.object.sqlid,
													careerId: res3.object.id,
													careerSqlId: res5.insertId,
													careerRegYear: args.registration_year,
													type: 1
												}
												return callback(null, retObj);
											});			
										});										
									});
								});
							});
						})
					});	
				});	
			});	    
		});	
	});
}




completeProfessor = function(args, user, callback){
	var vcode = args.vcode;
	if(!vcode){
		callback('Missing parameter: vcode',null);
		return;
	};
	var email = args.email;
	if(!email){
		callback('Missing parameter: email', null);
		return;
	};
	var conn = mysql.createConnectionSync();
	conn.connectSync(servers.MYSQL.host, servers.MYSQL.user, servers.MYSQL.password, servers.MYSQL.database);
	conn.setCharsetSync('utf8');
	if (!conn.connectedSync()) {
		  console.log("Connection error " + conn.connectErrno + ": " + conn.connectError);
		  process.exit(1);
	}
	conn.query('SELECT * FROM temp_user WHERE email="' + email + '" AND vcode="' + vcode +'";', function(err, res){
		if(err){
			callback('error: ' + err, null);
			return;	
		}

		if(res.affectedRows <= 0){
			callback('invalid registration request', null);
			return;
		}	
		
		res.fetchAll(function (err, rows) {
			if (err) {
		    	callback(err, null);
		    	return;
		    }
			var password = rows[0].password;
			var salt = rows[0].salt;
			//neo4j insert
			var type = m.USER;
			var now = new Date().getTime();
			args.name = lowerString(args.name);
			args.surname = lowerString(args.surname);
			var data = {
				o: {
					email:  email,				
					type: 2,
					name: args.name,
					surname: args.surname,
					gender: args.gender
				}			
			};
			generic.insert(type, data, function(err, result){
				if(err)
					return callback(err, null);
				//mysql insert
				var date = new Date();//"Y-m-d H:i:s"
				date = '' + date.getFullYear() + '-' + date.getMonth() + '-' + date.getDate() + ' ' + date.getHours() + ':' + date.getMinutes() + ':' + date.getSeconds();
				data = {
						nosqlid: result.object.id,
						email:  email,
						password: password,
						salt: salt,
						user_state: 1,
						type: 2,
						name: args.name,
						surname: args.surname,
						birthday: args.birthday,
						gender: args.gender,
						phone: args.phone,
						country: args.country,
						city: args.city,
						state: args.state,
						registration_date: date,
						last_login: date
				}
				var params = '';
				var value = '';
				for(var i in data){
					if(data[i] != null && data[i] != undefined && data[i] != 'NaN'){
						params += i + ',';
						value += "'" + data[i] + "',";
					}
				}
				params = params.substring(0, params.length - 1); 
				value = value.substring(0, value.length - 1);
				conn.query('INSERT INTO user (' + params + ') VALUES (' + value + ');', function(err, res2){
					if(err){
						return callback(err,'');
					}
					if(res2.affectedRows == 0){
						return callback('error: mysql not insert user','');
					}
					result.object.sqlid = res2.insertId;
					result.object.save(function(err,res3){							
						//rel to prof
						//update sql
						conn.query('SELECT * FROM professor WHERE email="' + email +'";', function(err, res4){
							if(err){
								callback(err, null);
								return;	
							}

							if(res4.affectedRows <= 0){
								callback('professor not found', null);
								return;
							}	

							var profNosqlid;
							var profSqlid;
							res4.fetchAll(function (err, rows) {
								if (err) {
								    callback(err, null)
								    return;
								}
								profNosqlid = rows[0].nosqlid;
								profSqlid = rows[0].id;

								ext.getModel(m.PROFESSOR).getById(profNosqlid, function(err, prof){
									if(err){
										callback(err, null);
										return;	
									}
									if(!prof){
										callback('professor not found on graph db', null);
										return;		
									}
									result.object.addProfessor(prof, {}, function(err, res5){
										if(err){
											callback(err, null);
											return;	
										}
										conn.query('UPDATE professor SET user=' + res2.insertId + ' WHERE id=' + profSqlid + ';', function(err, res6){
											if(err){
												return callback(err,'');
											}
											if(res2.affectedRows == 0){
												return callback('error: mysql not update professor:user','');
											}
												
											conn.query('DELETE FROM temp_user WHERE email="' + email + '";', function(err, res3){													
												if(err){
													return callback(err,'');
												}
												var retObj = {
													id: result.object.id,
													sqlId: result.object.sqlid,
													prof_nosqlId: prof.id,
													prof_sqlId: prof.sqlid,
													type: 2
												}
												callback(null, retObj);
											});											
										});
									});	
								});
							});							
						});					
					});	
				});			
			});		    
		});			
	});
}


lowerString = function(str){
	if(!str || str=='')
  		return str;
	var strs =  str.split(" ");
	var newname = "";
	for(var s in strs){
		if(strs[s][0] == "(")
	   newname += strs[s].substring(0,2) + strs[s].toLowerCase().substring(2) + " ";
	  else
	   newname += strs[s][0] + strs[s].toLowerCase().substring(1) + " ";
	 }
	    newname = newname.substring(0,newname.length-1);
	    if(newname.indexOf("-")){
	     var strs2 = newname.split("-");
	     for(var t in strs2){
	      strs2[t] = strs2[t][0].toUpperCase() + strs2[t].substring(1);
	     }
	     newname = strs2.join("-");
	    }
	 return newname;
}

function university(args, user, callback){
	var conn = mysql.createConnectionSync();
	conn.connectSync(servers.MYSQL.host, servers.MYSQL.user, servers.MYSQL.password, servers.MYSQL.database);
	conn.setCharsetSync('utf8');
	if (!conn.connectedSync()) {
		  console.log("Connection error " + conn.connectErrno + ": " + conn.connectError);
		  process.exit(1);
	}
	conn.query('INSERT INTO email_to_notify (email, university) VALUES ("' + args.email + '", ' + args.university + ');', function(err, res){
		if(err){
			callback('error: ' + err, null);
			return;	
		}
		if(res.affectedRows <= 0){
			callback('invalid registration request', null);
			return;
		}	
		callback(null, '');
	});
}

exports.addcompletestudent = completeStudent;
exports.addcompleteprofessor = completeProfessor;
exports.getuniversity = university;

