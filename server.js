// server.js - NodeJS server for the PiThermServer project.

// Parses data from DS18B20 temperature sensor and servers as a JSON object.
// Uses node-static module to server a plot of current temperautre (uses highcharts).
// Tom Holderness 03/01/2013
// Ref: www.cl.cam.ac.uk/freshers/raspberrypi/tutorials/temperature/

// Load node modules
var fs = require('fs'),
    sys = require('sys'),
    http = require('http'),
    util = require('util'),
    colors = require('colors');

// define sensor serial number (will be different for each sensor)
// to list available sensors, enter 'ls /sys/bus/w1/devices/'
// TODO: lookup sensors automatically
var sensorId = '28-00000418941a'; // DS18B20 (bare)

// Use node-static module to serve chart for client-side dynamic graph
var nodestatic = require('node-static'),
    port = process.env.PORT || 8000;

// Obtains the device IP on the network
// TODO: Move this into external file / npm package
// Source: http://stackoverflow.com/questions/3653065/get-local-ip-address-in-node-js
var getNetworkIP = (function () {
  var ignoreRE = /^(127\.0\.0\.1|::1|fe80(:1)?::1(%.*)?)$/i;

  var exec = require('child_process').exec,
      cached,
      command = 'ifconfig',
      filterRE = /\binet\b[^:]+:\s*([^\s]+)/g;
      // filterRE = /\binet6[^:]+:\s*([^\s]+)/g; // IPv6

  if (process.platform === 'darwin') {
    command = 'ifconfig';
    filterRE = /\binet\s+([^\s]+)/g;
    // filterRE = /\binet6\s+([^\s]+)/g; // IPv6
  }

  return function (callback, bypassCache) {
     // get cached value
    if (cached && !bypassCache) {
      callback(null, cached);
      return;
    }

    // system call
    exec(command, function (error, stdout, sterr) {
      var i, matches, ips = [];

      // extract IPs
      matches = stdout.match(filterRE);

      // JS has no lookbehind REs, so we need a trick
      for (i = 0; i < matches.length; i=i+1) {
        ips.push(matches[i].replace(filterRE, '$1'));
      }

      // filter BS
      for (i = 0, l = ips.length; i < l; i=i+1) {
        if (!ignoreRE.test(ips[i])) {
          //if (!error) {
            cached = ips[i];
          //}
          callback(error, ips[i]);
          return;
        }
      }

      // nothing found
      callback(error, null);
    });
  };
})();

// Setup static server for current directory
var staticServer = new nodestatic.Server(".");

// Setup node http server
var server = http.createServer(
  // Our main server function
  function(request, response)
  {
    // Grab the URL requested by the client
    var url = require('url').parse(request.url);
    var pathfile = url.pathname;

    // Test to see if it's a request for temperature data
    if (pathfile === '/temperature.json')
    {
      // Function to read thermal sensor and return JSON representation of first word (i.e. the data)
      // Note device location is sensor specific.
      fs.readFile('/sys/bus/w1/devices/' + sensorId + '/w1_slave', function(err, buffer)
      {
        if (err)
        {
          response.writeHead(500, { "Content-type": "text/html" });
          response.end(err + "\n");
          return;
        }
      // Read data from file (using fast node ASCII encoding).
      var data = buffer.toString('ascii').split(" "); // Split by space

      // Extract temperature from string and divide by 1000 to give celsius
      var temp  = parseFloat(data[data.length-1].split("=")[1])/1000.0;

      // Round to one decimal place
      temp = Math.round(temp * 10) / 10;

      // Add date/time to temperature
      var jsonData = [Date.now(), temp];

      // Return JSON data
      response.writeHead(200, { "Content-type": "application/json" });
      response.end(JSON.stringify(jsonData), "ascii");
      // Log to console (debugging)
      // console.log('returned JSON data: ' + jsonData);

      });
    }
    else {
      // Print requested file to terminal
      util.puts('Request from '.blue + (request.connection.remoteAddress + '').magenta +
                ' for: '.blue + (pathfile + '').yellow);

      // Serve file using node-static
      staticServer.serve(request, response, function (err, result) {
        if (err){
          // Log the error
          sys.error("Error serving " + request.url + " - " + err.message);

          // Respond to the client
          response.writeHead(err.status, err.headers);
          response.end('Error 404 - file not found');
        }
      });
    }
});

// Enable server
server.listen(port);

// resolve the device IP, then display server started message
getNetworkIP(function (error, ip) {
  var ipAddress = ip;

  // if IP address can't be found, just show 'localhost'
  if (error) {
    ipAddress = 'localhost';
    sys.error('Error obtaining network IP: '.red + error);
  }

  // Log message
  util.puts('HTTP server '.blue + 'started'.green + ' at '.blue +
            ('http://' + ipAddress + ':' + port).yellow);

}, false);

