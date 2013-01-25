exports.redis = {
	node: {
		id: 'config:node:id',
		ip: 'config:node:ip',
		hash: 'config:node:hash',
	},
	peers: 'config:peers',
	peer: 'config:peer:',
	services: 'config:services:',
	service: 'config:service:',
	func: 'fn',
	socket: 'socket',
};
exports.zookeeper = {
	node: {
		id: 'node/id',
		ip: 'node/ip',
	},
	peers: 'peer',
	services: 'services',
	func: 'fn',
	socket: 'socket',
};