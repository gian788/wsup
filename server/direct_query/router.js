function route(handle, pathname, response, request, args, user) {
  //console.log("About to route a request for " + pathname);
  paths = pathname.split('/');  
  var reqType = request.method;
  switch(reqType){
    case 'POST':
      funcName = 'add';
    break;
    case 'GET':
      funcName = 'get';
    break;
    case 'PUT':
      funcName = 'update';
    break;
    case 'DELETE': 
      funcName = 'remove';
    break;
    default:
      return false;
    break;
  }
 
  var id = false;
  if(paths[paths.length - 1] == ''){
    delete(paths[paths.length - 1]);
    paths.length = paths.length - 1;
  }  

  if(paths.length < 2){
    response.end();
  }
  
  if(paths[1]=='robots.txt'){
    response.write('User-agent: *\nDisallow: /');
    response.end();
    return;
  }else if(paths[1] == 'search'){
    modName = 'search';
    if(paths[2])
      funcName = paths[2];
    else
      funcName = 'index';
  }else{
    //console.dir(paths)  
    switch(paths.length){
    	case 2:
    		modName=paths[1];
        if(funcName == 'get')
    		  funcName = 'index';
    	break;
    	case 3:
    		modName = paths[1];
    		if(isNaN(paths[2]))
    			funcName += paths[2];
    		else{
    			id = parseInt(paths[2]);
    		}  			
    	break;
    	case 4:
    		modName = paths[1];
    		funcName += paths[3];
    		id = paths[2];
    	break;
    	default:
    		return false; 
      break; 		
    }
  }
  if(id)
    args['_id'] = id;
  console.log(modName+":"+funcName+":")
  console.dir(args);
  console.log()
  if(request.headers.origin == "docs.uniants.com")
    funcName = funcName + 'Server';
  handle(modName, funcName, args, request, response, user);	
}

exports.route = route;