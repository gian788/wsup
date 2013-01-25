var servers = require('/srv/server/config/servers.js');
var helenus = require('helenus');

var classPubHistory_cf = 'ClassHistoryPub';
var classStuHistory_cf = 'ClassHistoryStu';
var classProHistory_cf = 'ClassHistoryPro';
var groupHistory_cf = 'GroupHistory';
var userHistory_cf = 'UNotifications';

var defaultNumNotification = 30;
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

getGeneric = function(cfName, id, callback){  
  pool.connect(function(err, keyspace){
    if(err){
      //TODO Log error
      console.log(err);
      return;
    }
    keyspace.get(cfName, function(err, cf){
      if(err){
        //TODO Log error
        console.log(err)
        return;
      }
      cf.get(id, function(err, row){
        if(err){
          //TODO Log error
          console.log(err)
          return;
        }       
        var hi = [];
        for(var i = 0; i < row.count; i++){
          hi[i] = row[i].value;
        }
        callback(err, hi);        
      });
    });
  });
}

/*getClassPublicHistory = function(classId, callback){
  getGeneric(classPubHistory_cf, classId, callback);
}*/

getClassPublicHistory = function(args, user, callback){
  getGeneric(classPubHistory_cf, args._id, callback);
}

getClassStudentHistory = function(classId, callback){
  getGeneric(classStuHistory_cf, classId, callback);
}

getClassProfessorHistory = function(classId, callback){
  getGeneric(classProHistory_cf, classId, callback);
}

getGroupHistory = function(classId, callback){
  getGeneric(groupHistory_cf, classId, callback);
}

getUserHistory = function(classId, callback){
  getGeneric(userHistory_cf, classId, callback);
}


exports.getClassPublicHistory = getClassPublicHistory;
exports.getClassStudentHistory = getClassStudentHistory;
exports.getClassProfessorHistory = getClassProfessorHistory;
exports.getGroupHistory = getGroupHistory;
exports.getUserHistory = getUserHistory;

exports.getclasspublichistory = getClassPublicHistory;