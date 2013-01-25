var spawn = require('child_process').spawn,
    ls    = spawn('/srv/server/remoteB', ['001nlbB01001', 'ipc:///tmp/mnb_ctr'], {stdio: "inherit"});
//ls    = spawn('ls', ['-lh']);
/*ls.stderr.setEncoding('utf8');
ls.stderr.setEncoding('utf8');
ls.stdout.on('data', function (data) {
  console.log('stdout: ' + data);
  console.log(data[data.length - 1])
});

ls.stderr.on('data', function (data) {
  console.log('stderr: ' + data);
});*/