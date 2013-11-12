// sensor.js - NodeJS server for the PiThermServer project.

// Parses data from DS18B20 temperature sensor and servers as a JSON object.
// Uses node-static module to server a plot of current temperautre (uses highcharts).
// Tom Holderness 03/01/2013
// Ref: www.cl.cam.ac.uk/freshers/raspberrypi/tutorials/temperature/

// Load node module dependencies
var fs = require('fs'),
  sys = require('sys'),
  util = require('util'),
  colors = require('colors'),
  moment = require('moment'),
  stathat = require('stathat'),
  gpio = require('gpio');

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
var TEMP_SENSOR_ID2 = '28-000002aa9557'; // DS18B20 (silver thermowell)
var TEMP_SENSOR_ID = '28-0000047505a4'; // DS18B20 (black plastic cap)

// setup GPIO pin for temperature relay
var gpioRelay = gpio.export(18, {
  direction: 'out',
  interval: 200,
  ready: function() {
    // logic here
  }
});

// start polling the temp sensor and save to DB
function pollSensor(sensorId) {
  var readingData, sensorValue;

  // Function to read thermal sensor and return JSON representation of first word (i.e. the data)
  // Note device location is sensor specific.
  fs.readFile('/sys/bus/w1/devices/' + sensorId + '/w1_slave', function(err, buffer) {

    var data, temp;

    if (err) {
      console.error('Error reading sensor data: ', err);
      return;
    }

    // Read data from file (using fast node ASCII encoding).
    data = buffer.toString('ascii').split(" "); // Split by space

    if (data) {
      sensorValue = parseFloat(data[data.length - 1].split('=')[1]);
    } else {
      console.error('Error parsing sensor data!');
      return;
    }

    timeNow = moment();
    readingData = {
      time: timeNow.valueOf(),
      value: sensorValue
    };

    // write sensor data to Redis DB
    dbclient.zadd(sensorId, timeNow.valueOf(), JSON.stringify(readingData));

    temp = parseFloat(sensorValue)/1000.00;
    temp = Math.round(temp * 10) / 10;
    temp = (temp * 1.8000) + 32.00;

    // Log message
    util.puts('[' + timeNow.format('MMMM Do YYYY, h:mm:ss a').blue + '] ' + sensorId + ' reading: ' + (temp.toFixed(2) + ' F').yellow);

    // send stats to StatHat
    stathat.trackEZValue("Un8Fhd3Grs5gHUa5", sensorId, temp, function(status, json) {});

    if (sensorId === TEMP_SENSOR_ID2) {
      if (temp < 68.0) {
        // turn heater on
        gpioRelay.set(function() {
          //console.log('[GPIO] Relay Set (HIGH): ' + gpioRelay.value);
	  stathat.trackEZValue("Un8Fhd3Grs5gHUa5", "Heater Relay", 1, function(status, json) {});
        });
      } else {
        // turn heater off
        gpioRelay.reset(function() {
          //console.log('[GPIO] Relay Set (LOW): ' + gpioRelay.value);
	  stathat.trackEZValue("Un8Fhd3Grs5gHUa5", "Heater Relay", 0, function(status, json) {});
        });
      }
    }

    // poll the temp sensor again after 1 minute
    setTimeout(function() {
      pollSensor(sensorId);
    }, (1000 * 60));

  });
}

// start polling the temp sensors
pollSensor(TEMP_SENSOR_ID);
pollSensor(TEMP_SENSOR_ID2);
