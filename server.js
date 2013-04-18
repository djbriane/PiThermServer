// server.js - NodeJS server for the PiThermServer project.

// Parses data from DS18B20 temperature sensor and servers as a JSON object.
// Uses node-static module to server a plot of current temperautre (uses highcharts).
// Tom Holderness 03/01/2013
// Ref: www.cl.cam.ac.uk/freshers/raspberrypi/tutorials/temperature/

// Load node module dependencies
var fs = require('fs'),
  sys = require('sys'),
  http = require('http'),
  util = require('util'),
  colors = require('colors'),
  moment = require('moment');

// Load local modules
var networkIp = require('./networkip.js');

// redis DB setup
var redis = require('redis'),
  dbclient = redis.createClient();

dbclient.on('error', function(err) {
  console.error('Redis Error ' + err);
});

// define sensor serial number (will be different for each sensor)
// to list available sensors, enter 'ls /sys/bus/w1/devices/'
// TODO: lookup sensors automatically
//var TEMP_SENSOR_ID = 'dev-temp-sensor'; // test sensor
//var TEMP_SENSOR_ID = '28-00000418941a'; // DS18B20 (bare)
//var TEMP_SENSOR_ID = '28-000002aa9557'; // DS18B20 (silver thermowell)
var TEMP_SENSOR_ID = '28-0000047505a4'; // DS18B20 (black plastic cap)


// maximum number of datapoints to return
var SHORT_HISTORY = 2880, // 48h
    LONG_HISTORY = 20160; // 14d


// Use node-static module to serve chart for client-side dynamic graph
var nodestatic = require('node-static'),
  port = process.env.PORT || 8000;

// Setup static server for current directory
var staticServer = new nodestatic.Server("/home/pi/PiThermServer/web/");

// get sensor data from Redis db
function getSensorData(history, cb) {

  dbclient.zrevrangebyscore([TEMP_SENSOR_ID, '+inf', '-inf', 'LIMIT', 0, history], function(err, res) {

    var temp, resParsed, resData = [];

    //console.log('results: ', res);

    for (var i = 0, l = res.length; i < l; i = i + 1) {
      resParsed = JSON.parse(res[i]);

      temp = parseFloat(resParsed.value) / 1000.00;

      // Round to one decimal place
      temp = Math.round(temp * 10) / 10;

      // Convert temp to Fahrenheit
      temp = (temp * 1.8000) + 32.00;

      resParsed.value = temp;

      resData.push(resParsed);

    }

    if (!err) {
      cb(null, resData);
    } else {
      cb(err, []);
    }

  });

}

// Setup node http server
var server = http.createServer(

// Our main server function
function(request, response) {
  // Grab the URL requested by the client
  var url = require('url').parse(request.url),
    pathfile = url.pathname,
    tempData;

  // Test to see if it's a request for temperature data
  if (pathfile === '/temperature.json') {

    // Print requested file to terminal
    util.puts('[' + moment().format('MMMM Do YYYY, h:mm:ss a').blue +
      '] Request from ' + (request.connection.remoteAddress + '').magenta +
      ' for: ' + (pathfile + '').yellow);

    getSensorData(SHORT_HISTORY, function(err, resData) {

      response.writeHead(200, {
        "Content-type": "application/json"
      });

      response.end(JSON.stringify(resData), "ascii");

    });

  } else if (pathfile === '/temperature_long.json') {

    // Print requested file to terminal
    util.puts('[' + moment().format('MMMM Do YYYY, h:mm:ss a').blue +
      '] Request from ' + (request.connection.remoteAddress + '').magenta +
      ' for: ' + (pathfile + '').yellow);

    getSensorData(LONG_HISTORY, function(err, resData) {
      var time14dago = new moment().subtract('days', 14);

      // only return data in 30m intervals
      // TODO: should average across the interval instead of just plucking the value
      resData = _.filter(resData, function(val, index) {
        return (time14dago.isBefore(val.time) && index % 30 === 0);
      });

      response.writeHead(200, {
        "Content-type": "application/json"
      });

      response.end(JSON.stringify(resData), "ascii");

    });

  } else {
    // Print requested file to terminal
    util.puts('[' + moment().format('MMMM Do YYYY, h:mm:ss a').blue +
      '] Request from ' + (request.connection.remoteAddress + '').magenta +
      ' for: ' + (pathfile + '').yellow);

    // Serve file using node-static
    staticServer.serve(request, response, function(err, result) {
      if (err) {
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
networkIp.getNetworkIP(function(error, ip) {
  var ipAddress = ip;

  // if IP address can't be found, just show 'localhost'
  if (error) {
    ipAddress = 'localhost';
    sys.error('Error obtaining network IP: '.red + error);
  }

  // Log message
  util.puts('[' + moment().format('MMMM Do YYYY, h:mm:ss a').blue +
    '] HTTP server ' + 'started'.green + ' at ' + ('http://' + ipAddress + ':' + port).yellow);

}, false);
