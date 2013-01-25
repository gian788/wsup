var servers = require(process.cwd() + '/config/servers.js');
var helenus = require('helenus');
var userDb = require('../models/User.js');

var invitations_cf = 'Invitations';
var unreadInvitations_cf = 'UInvitations';
var pool = new helenus.ConnectionPool({
        hosts      : servers.CASSANDRA.hosts,
        keyspace   : servers.CASSANDRA.keyspace,
        user       : servers.CASSANDRA.user,
        password   : servers.CASSANDRA.password,
        timeout    : 3000
        //cqlVersion : '3.0.0' // specify this if you're using Cassandra 1.1 and want to use CQL 3
    });

//if you don't listen for error, it will bubble up to `process.uncaughtException`
//pools act just like connection objects, so you dont have to worry about api
//differences when using either the pool or the connection
/*pool.on('error', function(err){
  console.error(err.name, err.message);
});*/


//SPECIFIC ACTIONS


addFriend = function(args, user, callback){
  if(!args.from || !args.to){
    callback('Missing params', null);
    return;
  }
  if(args.from != user.nosqlid){
    callback(405, null);
    return;
  }
  if(('' + args.to).indexOf('@') != -1){
    callback('Not implemented yet', null);
    return;
  }

  userDb.getById(args.from, function(err, userFrom){
    if(err){
      callback(err, null);
      return;
    }
    var userTo = userDb.getById(args.to, function(err, userTo){
      if(err){
        callback(err, null);
        return;
      }
      var t = (new Date()).getTime();
      var inv = JSON.stringify({
        u: userFrom.toPlainObject(),
        a: 21,
        t: t,
        n: [userTo.toPlainObject()]
      });
      pool.connect(function(err, keyspace){
        if(err){
          callback(err, null);
          return;
        }

        keyspace.get(invitations_cf, function(err, cf){
          if(err){     
            callback(err, null);
            return;
          }
          cf.get(args.to, function(err, row){
            if(err){
              callback(err, null);
              return;
            }
            if(row.get(args.from)){
              callback(null, '');
              return;
            }
            pool.cql("INSERT INTO Invitations (KEY, ?) VALUES (?, ?);", [userFrom.id, userTo.id, inv], function(err, results){
              if(err){
                callback(err, null);
                return;
              }
              pool.cql("INSERT INTO UInvitations (KEY, ?) VALUES (?, ?);", [userFrom.id, userTo.id, inv], function(err, results){
                if(err){
                  callback(err, null);
                  return;
                }
                pool.cql("INSERT INTO PInvitations (KEY, ?) VALUES (?, ?);", [userTo.id, userFrom.id, inv], function(err, results){
                  if(err){
                    callback(err, null);
                    return;
                  }
                  require('../../notify/notify.js').sendRealTimeOnly(userTo.id, 'inv', JSON.stringify(inv));
                  callback(null, '')
                });
              });
            });
          });
        });        
      });
    });    
  });
}

addUserToGroup = function(args, user, callback){
  console.log('in')
  if(!args.to && !args.group){
    callback('Missing params', null);
    return;
  }
  var to = args.to;

  for(var i in to)
  if(('' + to[i]).indexOf('@') != -1){
    callback('Not implemented yet', null);
    return;
  }

  
}


//GENERAL ACTION
getInvitations = function(args, user, callback){
  if(args._id != user.nosqlid){
    callback(401, null);
    return;
  }
  pool.connect(function(err, keyspace){
    if(err){
      callback(err, null);
      return;
    }
    keyspace.get(invitations_cf, function(err, cf){
      if(err){     
        callback(err, null);
        return;
      }
      cf.get(args._id, function(err, row){
        if(err){
          callback(err, null);
          return;
        }
        var invs = [];
        var i = 0;
        for(;i < row.count; i++){
          invs[i] = {
              o: row[i].value,
              id: row[i].name,
              r: true
          };
        }
        callback(err, invs);
      });
    });
  });
}

getNewInvitations = function(args, user, callback){
  if(args._id != user.nosqlid){
    callback(401, null);
    return;
  }
  pool.connect(function(err, keyspace){
    if(err){
      callback(err, null);
      return;
    }
    keyspace.get(unreadInvitations_cf, function(err, cf){
      if(err){     
        callback(err, null);
        return;
      }
      cf.get(args._id, function(err, row){
        if(err){
          callback(err, null);
          return;
        }
        var invs = [];
        var i = 0;
        for(;i < row.count; i++){
          invs[i] = {
              o: row[i].value,
              id: row[i].name,
              r: false
          };
        }
        callback(err, invs);
      });
    });
  });
}



getInvitationsCount = function(args, user, callback){
  if(args._id != user.nosqlid){
    callback(403, null);
    return;
  }
  pool.connect(function(err, keyspace){
    if(err){
          callback(err, null);
      return;
    }
    keyspace.get(unreadInvitations_cf, function(err, cf){
      if(err){
          callback(err, null);
        return;
      }
      cf.get(args._id, function(err, row){
        if(err){
          callback(err, null);
          return;
        }
        callback(err, row.count);
      });
    });
  });
}

setReadInvitations = function(args, user, callback){
  if(args._id != user.nosqlid){
    callback(403, null);
    return;
  }
  if(!args.invs){
    callback(400, null);
    return;
  }
  pool.connect(function(err, keyspace){
    if(err){
      callback(err, null);
      return;
    }
    keyspace.get(invitations_cf, function(err, cf){
      if(err){
        callback(err, null);
        return;
      }
      //console.log(args.invs)
      if(typeof(args.invs) == 'number'){
        args.invs = [args.invs];
      }
      for(var i in args.invs){
        //console.log('delete '+args.invs[i])
        pool.cql('DELETE ? FROM UInvitations WHERE KEY = ?;', [args.invs[i], user.nosqlid], function(err,res){
          if(err){
            callback(err, null);
            return;
          }
        });
      }      
      callback(null,null);
    });
  });
}

acceptFriendship = function(args, user, callback){
  if(args.user != user.nosqlid){
    callback(403, null);
    return;
  }
  if(!args.inv){
    callback(400, null);
    return;
  }  
  pool.connect(function(err, keyspace){
    if(err){
      callback(err, null);
      return;
    }
    keyspace.get(invitations_cf, function(err, cf){
      if(err){
        callback(err, null);
        return;
      }
      cf.get(user.nosqlid, function(err, row){
        if(err){
          callback(err, null);
          return;
        }
        if(row.count <= 0 || !row.get(args.inv)){
          callback(404, null);
          return;
        }                  
        var inv = JSON.parse(row.get(args.inv).value);
        var userDb = require('../models/User.js');
        userDb.getById(inv.u.id, function(err, res){
          if(err){
            callback(err, null);
            return;
          }  
          userDb = res;
          userDb.addFriendById(user.nosqlid,{t: new Date().getTime()}, function(err, res){
            if(err){
              callback(err, null);
              return;
            }          
            //delete userTo invitation
            pool.cql('DELETE ? FROM Invitations WHERE KEY = ?;', [args.inv, user.nosqlid], function(err,res){
              if(err){
                callback(err, null);
                return;
              }
              //delete userFrom pendingInvitations
              pool.cql('DELETE ? FROM PInvitations WHERE KEY = ?;', [args.inv, inv.u.id], function(err,res){
                if(err){
                  callback(err, null);
                  return;
                }
                //add UserHistory
                var not = {
                  a: 21,
                  u: inv.u,
                  n: inv.n,
                  t: new Date().getTime()
                };   
                //console.log("INSERT INTO UserHistory (KEY, "+user.nosqlid+") VALUES ("+ not.t+","+ JSON.stringify(not)+")");
                pool.cql("INSERT INTO UserHistory (KEY, ?) VALUES (?, ?);", [user.nosqlid, not.t, JSON.stringify(not)], function(err, results){
                  if(err){
                    callback(err, null);
                    return;
                  }
                  //create userFrom notification
                  //console.log('beforeNotify')
                  require('../../notify/notify.js').send(not,inv.u.id);
                  callback(null,'');              
                });
              });
            });
          }); 
        });             
      });      
    });
  });
}



exports.updatereadinvitations = setReadInvitations;
exports.getcount = getInvitationsCount;
exports.index = getInvitations;
exports.get = getInvitations;
exports.getnew = getNewInvitations;
exports.addfriend = addFriend;
exports.addusertogroup = addUserToGroup;
exports.addacceptfriendship = acceptFriendship;
