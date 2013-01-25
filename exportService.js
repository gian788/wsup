var redis = require('redis').createClient(6479,'192.168.16.128'),
	prefix = require('./utils/prefix.js').redis,
	utils = require('./utils/common.js');

const TYPE_JS = 0,
      TYPE_GENERIC = 1,
      TYPE_JAVA = 2,      
      TYPE_WRAPPED_JS = 10;

if(process.argv.length < 4){
	console.log('Missing service file to export!');
	console.log('Usage: node exportService.js serviceFile.js');
	process.exit(1);
}

if(process.argv[2] == '-c'){
	var services = utils.getConfigFromFileSync(process.argv[3]),
		errCount = 0,
		sucCount = 0,
		notExp = 0;
	var end = function(){
		if(errCount + sucCount + notExp == utils.length(services)){
			console.log('\n' + sucCount + ' services successfully exported');
			console.log(errCount + ' services unsuccessfully exported');
			console.log(notExp + ' services not exported');
			console.log('  on total of ' + utils.length(services) + ' services');			
			process.exit(0);
		}
	}

	console.log('\nTotal services: ' + utils.length(services));
	for(var i in services){
		console.log('\tService ' + i + ' type: ' + services[i].worker.config.procType);
		switch(services[i].worker.config.procType){
			case TYPE_WRAPPED_JS:
				saveService_wrappedJs(services[i].worker.config.file, i, function(err, res){
					if(err){
						errCount++;
						console.log(err);
					}else{
						sucCount++;
					}
					end();
				});
			break;
			default:
				notExp++;
				end();
			break;
		}
	}
}else{
	saveService(process.argv[2], process.argv[3]);
}

function saveService_wrappedJs(name, id, callback){
	var service = require(name),
		fn = [];
	for(var i in service)
		if(typeof(service[i]) == 'function')
			fn.push(i);
	console.log(prefix.service + id + ':' + prefix.func)
	redis.sadd(prefix.service + id + ':' + prefix.func, fn, function(err, res){
		if(err){
			callback(err, null);
		}
		if(res == 0){
			console.log('Service "' + id + '" already up to date!');	
		}else{
			console.log('Service "' + id + '" successfully exported!');
			console.log(res + ' functions');
			console.log('  ', fn);	
		}
		callback();
	});	
}