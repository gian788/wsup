var ENV = 'DEV';

if(ENV == 'PROD'){
	exports.MYSQL = {
		host:'uniants.com',
		port:3306,
		user: 'php',
		password: 'x58l1030V59a6cW',
		database: 'general'
	};
	exports.APACHE = {
		host:'uniants.com',
		port:80
	};
	exports.DIRECT_QUERY = {
		host:'178.238.236.209',
		port:80
	};
	exports.NEO4J = {
		host:'127.0.0.1',
		port:7474
	};
	exports.NO_CLICK = {
		//host:'api.uniants.com',
		host: '80.241.210.243',
		port:80	}
	exports.CASSANDRA = {
		hosts: [
			'127.0.0.1:9160',
		],
		keyspace: 'uniants',
		user: 'test',
		password: ''
	},
	exports.LIB = {
		path: '/srv/node/lib/',
		modulePath: '/srv/node/lib/models/',
		controllersPath: '/srv/node/lib/controllers/' 
	}
}
if(ENV == 'DEV'){
	exports.MYSQL = {
		host:'127.0.0.1',
		port:3306,
		user: 'php',
		password: 'x58l1030V59a6cW',
		database: 'general'
	};
	exports.APACHE = {
		host:'127.0.0.1',
		port:80
	};
	exports.DIRECT_QUERY = {
		host:'192.168.122.101',
		port:3000
	};
	exports.NEO4J = {
		host:'127.0.0.1',
		port:7474
	};
	exports.NO_CLICK = {
		host:'192.168.122.101',
		port:3002	
	},
	exports.CASSANDRA = {
		hosts: [
			'127.0.0.1:9160',
		],
		keyspace: 'uniants',
		user: 'test',
		password: ''
	},
	exports.REDIS = {
		local: {
			ip: '127.0.0.1',
			port: 6379
		},
		shared: {
			ip: '192.168.122.101',
			port: 6479
		} 
	},
	exports.LIB = {
		path: '/srv/server/lib/',
		modulePath: '/srv/node/lib/models/',
		controllersPath: '/srv/server/lib/controllers/' 
	}
}
