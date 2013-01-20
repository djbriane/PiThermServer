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

dbclient.auth('foobared');

dbclient.on('error', function (err) {
    console.error('Redis Error ' + err);
});

// define sensor serial number (will be different for each sensor)
// to list available sensors, enter 'ls /sys/bus/w1/devices/'
// TODO: lookup sensors automatically
//var TEMP_SENSOR_ID1 = '28-00000418941a'; // DS18B20 (bare)
//var TEMP_SENSOR_ID2 = '28-000002aa9557'; // DS18B20 (silver thermowell)

var TEMP_SENSOR_ID1 = 'dev-temp-sensor'; // test sensor


// Use node-static module to serve chart for client-side dynamic graph
var nodestatic = require('node-static'),
    port = process.env.PORT || 8000;

// start polling the temp sensor and save to DB
function pollSensor(sensorId) {
  var readingData, sensorValue;

  // Function to read thermal sensor and return JSON representation of first word (i.e. the data)
  // Note device location is sensor specific.
  fs.readFile('/sys/bus/w1/devices/' + sensorId + '/w1_slave', function(err, buffer) {

    var data;

    if (err) {
      console.error('Error reading sensor data: ', err);
      return;
    }

    // Read data from file (using fast node ASCII encoding).
    data = buffer.toString('ascii').split(" "); // Split by space

    if (data) {
      sensorValue = parseFloat(data[data.length - 1].split('=')[1]);
    }

  });

  timeNow = moment();
  readingData = { time: timeNow.valueOf(), value: sensorValue };

  // write sensor data to Redis DB
  dbclient.zadd(sensorId, timeNow.valueOf(), JSON.stringify(readingData), redis.print);

  //dbclient.quit();
}


// Setup static server for current directory
var staticServer = new nodestatic.Server("./web/");
var lastRequestTime = moment().subtract('hours', 1);

console.log('initial request time: ' + lastRequestTime);

// Setup node http server
var server = http.createServer(
  // Our main server function
  function(request, response)
  {
    // Grab the URL requested by the client
    var url = require('url').parse(request.url),
        pathfile = url.pathname,
        tempData;

    // Test to see if it's a request for temperature data
    if (pathfile === '/temperature.json') {

      // Print requested file to terminal
      util.puts('Request from '.blue + (request.connection.remoteAddress + '').magenta +
                ' for: '.blue + (pathfile + '').yellow);


      console.log('get recent entries: ' + lastRequestTime);
      //dbclient.zrangebyscore([TEMP_SENSOR_ID1, lastRequestTime.valueOf(), moment().valueOf()], function (err, res) {
        dbclient.zrangebyscore([TEMP_SENSOR_ID1, 'lastRequestTime.valueOf()', moment().valueOf()], function (err, res) {
        var i, temp, resParsed, resData = [];

        console.log('results: ', res);

        for (var reading in res) {
          if (res.hasOwnProperty(reading)) {
            resParsed = JSON.parse(reading);
            resParsed.value = Math.round(resParsed.value / 1000.0) / 10;
            resData.push(resParsed);
          }
        }


        response.writeHead(200, { "Content-type": "application/json" });
        if (!res) {
          res = [];
        }
        response.end(JSON.stringify(resData), "ascii");


        lastRequestTime = moment();
        console.log('new request time: ' + lastRequestTime);
        //dbclient.quit();
      });


      // Extract temperature from string and divide by 1000 to give celsius
      //var temp  = parseFloat(data[data.length-1].split("=")[1])/1000.0;

      // Round to one decimal place
      //temp = Math.round(temp * 10) / 10;

      // Convert temp to Fahrenheit
      //temp = (temp * 1.8000) + 32.00;


    } else {
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

// start polling the temp sensor
setTimeout(pollSensor(TEMP_SENSOR_ID1), 1000);

// Enable server
server.listen(port);

// resolve the device IP, then display server started message
networkIp.getNetworkIP(function (error, ip) {
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

