var http = require("http"),
	url = require("url"),
	querystring = require("querystring"),
	router = require("./router"),
	requestHandlers = require("./requestHandlers"),
	servers = require('../config/servers.js');

//const PORT = 3000;

function start(route, handle) {
	 function onRequest(request, response) {
	 	var origin = (request.headers.origin || "*");
	 	if (request.method.toUpperCase() === "OPTIONS"){
            // Echo back the Origin (calling domain) so that the
            // client is granted access to make subsequent requests
            // to the API.
            response.writeHead(200, {
	             'Content-Type': 'application/json',
	               'Cache-Control': 'no-cache',
	             'Connection': 'keep-alive',
	               'Access-Control-Allow-Origin': '*',
	               "Access-Control-Allow-Headers":"Content-Type, Accept",
	               "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS"
	             //'Access-Control-Allow-Credentials': 'true'
	      	});
            return(response.end());
        }
	  	var data = "";
	    //console.dir(request.headers);
	  	request.on('data', function(chunk){
	  		data += chunk;	    	
		});


		request.on('end', function() {
			var args;
			//console.dir(data)
			if(data != ""){
				var contType = (request.headers['content-type']).split(';',2);
				switch(contType[0]){
			    	case "application/json":
			    		args = JSON.parse(data);			    		
			    	break;
			    	case "application/x-www-form-urlencoded":
			    		args = querystring.parse(url.parse(request.url).query);
			    	break;
			    	default:
			    	break;
			    }
			}
			else
			{
				args = querystring.parse(url.parse(request.url).query);
			}
		    var pathname = url.parse(request.url).pathname;
		    

			var start = new Date().getTime();
		    //security
		    if(request.method != 'GET'){
		    	if(contType && contType.length && contType[0] && contType[0] != 'application/json' || !args.data || !args.s){		    		
		    		return(response.end());
		    	}
		    	var crypto = require('../crypto/crypto.js');		    	
		    	decryptFromPhpsessid(args.s, args.data, function(err,res){
		    		if(err && !res){
		    			console.log(err);
		    			console.log(JSON.parse(res.data))
		    			return;
		    		}		    		
					//console.log('reqest decrypted in: ' + (new Date().getTime() - start) + ' ms');
					args = JSON.parse(res.data);
					var user = res.user;
					for(var param in args){
				    	if(!isNaN(args[param]))
				    		args[param] = parseInt(args[param]);
				    	else
				    		if(typeof(args[param]) == 'string')
					    		switch (args[param].toLowerCase()){
					    			case 'true':
					    				args[param] = true;
					    			break;
					    			case 'false':
					    				args[param] = false;
					    			break;
					    		}
				    }
				    route(handle, pathname, response, request, args, user);
		    	});
		    }else{
		    	//require('../crypto/crypto.js').getuser(args.sessid, function(err, user){	
		    	
		    	//(function(){
		    		var user = { s_key: 1829337036,
					  req_id: 68143,
					  last_request: 1359473595,
					  type: '1',
					  nosqlid: '115313',
					  uid: '1' }
				    //console.log(args)
				    for(var param in args){
				    	if(!isNaN(args[param]))
				    		args[param] = parseInt(args[param]);
				    	else
				    		if(typeof(args[param]) == 'string')
					    		switch (args[param].toLowerCase()){
					    			case 'true':
					    				args[param] = true;
					    			break;
					    			case 'false':
					    				args[param] = false;
					    			break;
					    		}
				    }
				    route(handle, pathname, response, request, args, user);
				//})()//);
			}

		 });		
	}

	http.createServer(onRequest).listen(servers.DIRECT_QUERY.port, servers.DIRECT_QUERY.host);
	console.log("Server has started at " + servers.DIRECT_QUERY.host + ":" + servers.DIRECT_QUERY.port);
}



start(router.route, requestHandlers.handle);