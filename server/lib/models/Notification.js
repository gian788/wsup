var ext = require('./extends');

var DB = require('./DB');
var db = DB.db();

getNotification = function(nodeId){
	var query = ['START n=node('+nodeId')',
				'MATCH p=(n)-[?:place*]->(p)',
				'WHERE p.objType=3',
				'RETURN nodes(p)'].join('\n')
}
