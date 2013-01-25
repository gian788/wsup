if(!process.argv[2]){
	console.log('\nMissing argument [execFile]\n\n');
	process.exit(-1);
}

var path = process.argv[2];
var args = [];
if(process.argv.length){
	args = process.argv.slice(3);	
}

/*var child = require('child_process').execFile(path, args, {stdio: ['ignore', process.stdout, process.stderr]}, function(err,res){
	console.log('cb',err,res)

});//['ignore', process.stdout, process.stderr]});*/

var child = require('child_process').spawn(path, args, {stdio: "inherit"});

child.on('exit', function(){
	process.exit();
})