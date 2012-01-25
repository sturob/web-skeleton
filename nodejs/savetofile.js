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
      
      console.log( querystring.parse( body ) )
      return;
      var date = new Date(Date.now()).toISOString().replace(/:/g,'\.');
      var filename = file_id + '_' + date;
      
      var fs = require('fs');
      var stream = fs.createWriteStream( filename );
      stream.once('open', function(fd) {
        stream.write(body);
      });
      console.log('wrote ' + filename + '\n');
      // console.log( body );
    });
  }
}).listen(6969);