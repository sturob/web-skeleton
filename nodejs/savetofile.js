#!/usr/bin/node

var querystring = require('querystring');

require("http").createServer(function(request, response) {
  if (request.method != "POST") {
    response.writeHead(200, {'Content-Type': 'text/html; charset=utf-8'});
    response.end(''); 
  } else {
    var body = "";
    var file_id = request.url.slice(1);
    request.setEncoding('utf8');
    
    request.on('data', function (data) {
      body = body + data;
    });

    request.on('end', function () {
      response.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
      response.end();
      var date = new Date(Date.now()).toISOString().replace(/:/g,'\.');
      var filename = '/tmp/' + file_id + '_' + date + '.json';
      var fs = require('fs');
      
      var stream = fs.createWriteStream( filename );
      var tmp = JSON.parse( body );
      
      var output = JSON.stringify(tmp, null, 2 );
      stream.once('open', function(fd) {
        stream.write( output );
      });
      console.log('wrote ' + filename);
      // console.log( output );
    });
  }
}).listen(6969);