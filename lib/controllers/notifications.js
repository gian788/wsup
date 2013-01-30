var servers = require('/srv/server/config/servers.js');
var helenus = require('helenus');

var unreadNotifications_cf = 'UNotifications';
var notifications_cf = 'Notifications';
var defaultNumNotification = 10;
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



getNewNotifications = function(args, user, callback){
  var userId = args._id;
  pool.connect(function(err, keyspace){
    if(err){
      //TODO Log error
      console.log(err);
      return;
    }
    keyspace.get(unreadNotifications_cf, function(err, cf){
      if(err){
        //TODO Log error
        console.log(err);
        callback(err, null);
        return;
      }
      cf.get(userId, function(err, row){
        if(err){
          //TODO Log error
          console.log(err);
          return;
        }
        var nots = [];
        var i = 0;
        for(;i < row.count; i++){
          nots[i] = {
              o: row[i].value,
              t: row[i].name,
              r: false
          };
        }
        callback(err, nots);
      });
    });
  });
}

getNotifications = function(args, user, callback){
  var userId = args._id;
  var classId = args.class;
  if(!classId){
    callback('no class specified', null);
    return;
  }
  if(!args.startFrom)
    startFromNotifications = null;
  else
    startFromNotifications = args.startFrom;
  if(!args.num)
    num = defaultNumNotification;

  pool.connect(function(err, keyspace){
    if(err){
      //TODO Log error
      console.log(err);
      return;
    }
    keyspace.get(notifications_cf, function(err, cf){
      if(err){
        //TODO Log error
        console.log(err)
        return;
      }
      cf.get(userId + ':' + classId, {start: startFromNotifications, max: num}, function(err, row){
        if(err){
          //TODO Log error
          console.log(err)
          return;
        }
        var nots = [];
        var i = 0;
        for(;i < row.count; i++){
          nots[i] = {
              o: row[i].value,
              t: row[i].name,
              r: true
          };
        }
        callback(err, nots);
      });
    });
  });
}

getNotificationsCount = function(args, user, callback){
  console.log(user)
  userId = args._id;
  pool.connect(function(err, keyspace){
    if(err){
      //TODO Log error
      console.log(err);
      return;
    }
    keyspace.get(unreadNotifications_cf, function(err, cf){
      if(err){
        //TODO Log error
        console.log(err)
        return;
      }
      cf.get(userId, function(err, row){
        if(err){
          //TODO Log error
          console.log(err)
          return;
        }
        callback(err, row.count);
      });
    });
  });
}

setReadNotifications = function(args, user, callback){
  userId = args._id;
  notifications = args.nots;
  if(typeof(notifications) != 'Array'){
    notifications = [notifications];
  }
  pool.connect(function(err, keyspace){
    if(err){
      //TODO Log error
      console.log(err);
      callback(err, null);
      return;
    }
    keyspace.get(notifications_cf, function(err, cf){
      if(err){
        //TODO Log error
        callback(err, null);
        return;
      }
      for(var n in notifications){
        //console.log('DELETE ? FROM ? WHERE KEY = ?;', [notifications[n], unreadNotifications_cf, userId])
        pool.cql('DELETE ? FROM ? WHERE KEY = ?;', [notifications[n], unreadNotifications_cf, userId], function(err,res){
          if(err){
            //TODO Log error
            console.log(err)
            callback(err, null);
            return;
          }
        });
      }      
      callback(null,null);
    });
  });
}


exports.getnew = getNewNotifications;
//exports.getnotifications = getNotifications;
exports.get = getNotifications;
exports.updatereadnotifications = setReadNotifications;
exports.getcount = getNotificationsCount;
