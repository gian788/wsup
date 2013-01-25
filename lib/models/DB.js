var neo4j = require('neo4j');
var servers = require('../../config/servers.js');
var db;

var Base = module.exports = function(){}

Base.db = function(){
	if(!db)
		db = new neo4j.GraphDatabase('http://'+servers.NEO4J.host+":"+servers.NEO4J.port);
	return db;
}