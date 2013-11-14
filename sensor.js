// sensor.js - NodeJS server for the PiThermServer project.

// Parses data from DS18B20 temperature sensor and servers as a JSON object.
// Uses node-static module to server a plot of current temperautre.
// Tom Holderness 03/01/2013
// Ref: www.cl.cam.ac.uk/freshers/raspberrypi/tutorials/temperature/

// Load node module dependencies
var fs = require('fs'),
  sys = require('sys'),
  util = require('util'),
  colors = require('colors'),
  moment = require('moment'),
  stathat = require('stathat'),
  gpio = require('gpio'),
  _ = require('lodash');

// define sensor serial number (will be different for each sensor)
// to list available sensors, enter 'ls /sys/bus/w1/devices/'
// TODO: lookup sensors automatically
//var TEMP_SENSOR_ID = 'dev-temp-sensor'; // test sensor
//var TEMP_SENSOR_ID = '28-00000418941a'; // DS18B20 (bare)
var TEMP_SENSOR_ID2 = '28-000002aa9557'; // DS18B20 (silver thermowell)
var TEMP_SENSOR_ID = '28-0000047505a4'; // DS18B20 (black plastic cap)

var CONFIG_SENSOR_FREQ_MINS = 1,
    CONFIG_LOG_FREQ_MINS = 1,
    CONFIG_DATA_DIR = '/home/pi/PiThermServer/data',
    CONFIG_HEATER_GPIO_PIN = 18,
    CONFIG_TEMP_LIMIT_LOW = 62.0;

// maximum number of datapoints for logging
var CONFIG_LOG_SHORT_HISTORY = 2880, // ~48h
    CONFIG_LOG_LONG_HISTORY = 20160; // ~14d

var CONFIG_STATHAT_KEY = process.env.PI_THERM_STATHAT_KEY || '';

// redis DB setup
var redis = require('redis'),
  dbclient = redis.createClient();

dbclient.on('error', function(err) {
  console.error('Redis Error ' + err);
});

// setup GPIO pin for heater control relay
var gpioRelay = gpio.export(CONFIG_HEATER_GPIO_PIN, {
  direction: 'out',
  interval: 200,
  ready: function() {
    // logic here
  }
});

// get sensor data from Redis db
function readSensorData(sensorId, history, cb) {

  dbclient.zrevrangebyscore([sensorId, '+inf', '-inf', 'LIMIT', 0, history], function(err, res) {

    var temp, resParsed, resData = [];

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

function logSensorData() {
  var fullData = [];

  readSensorData(TEMP_SENSOR_ID, CONFIG_LOG_SHORT_HISTORY, function(err, resData) {
    fullData.push(resData);

    readSensorData(TEMP_SENSOR_ID2, CONFIG_LOG_SHORT_HISTORY, function(err, resData) {
      fullData.push(resData);

      //response.end(JSON.stringify(fullData), "ascii");
      fs.writeFile(CONFIG_DATA_DIR + "/temperature.json", JSON.stringify(fullData), function(err) {
        if(err) {
          util.puts('[FILE] File Write Error: ', err);
        }
      });
    });

  });

  readSensorData(TEMP_SENSOR_ID, CONFIG_LOG_LONG_HISTORY, function(err, resData) {

    // only return data in 30m intervals
    // TODO: should average across the interval instead of just plucking the value
    resData = _.filter(resData, function(val, index) {
      return (index % 30 === 0);
    });

    fs.writeFile(CONFIG_DATA_DIR + "/temperature_long.json", JSON.stringify(resData), function(err) {
      if(err) {
        util.puts('[FILE] File Write Error: ', err);
      }
    });
  });

  setTimeout(function() {
    logSensorData();
  }, (1000 * 60 * CONFIG_LOG_FREQ_MINS));

}

function syncSensorData() {

  if (!CONFIG_REMOTE_USER || !CONFIG_REMOTE_HOST) {
    util.puts('[SYNC] No User / Host Defined for Sensor Data Sync!!');
    return;
  }

  // Execute the sync command
  dataSync.execute(function(error, code, cmd) {
      // we're done
      if (error) {
        util.puts('[SYNC] Remote Sync Error! ', error);
        return;
      }
      util.puts('[SYNC] Remote Sync Success!');
  });
}

// start polling the temp sensor and save to DB
function pollSensor(sensorId) {
  var readingData, sensorValue;

  // Function to read thermal sensor and return JSON representation of first word (i.e. the data)
  // Note device location is sensor specific.
  fs.readFile('/sys/bus/w1/devices/' + sensorId + '/w1_slave', function(err, buffer) {

    var data, temp;

    if (err) {
      util.puts('[SENSOR] Error reading sensor data: ', err);
      return;
    }

    // Read data from file (using fast node ASCII encoding).
    data = buffer.toString('ascii').split(" "); // Split by space

    if (data) {
      sensorValue = parseFloat(data[data.length - 1].split('=')[1]);
    } else {
      util.puts('[SENSOR] Error parsing sensor data!');
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
    stathat.trackEZValue(CONFIG_STATHAT_KEY, sensorId, temp, function(status, json) {});

    if (sensorId === TEMP_SENSOR_ID2) {
      if (temp < CONFIG_TEMP_LIMIT_LOW) {
        // turn heater on
        gpioRelay.set(function() {
          util.puts('[GPIO] Relay Set (HIGH): ' + gpioRelay.value);
        });
      } else {
        // turn heater off
        gpioRelay.reset(function() {
          util.puts('[GPIO] Relay Set (LOW): ' + gpioRelay.value);
        });
      }
    }

  });

  setTimeout(function() {
    pollSensor(sensorId);
  }, (1000 * 60 * CONFIG_SENSOR_FREQ_MINS));
}

// start polling the temp sensors
pollSensor(TEMP_SENSOR_ID);
pollSensor(TEMP_SENSOR_ID2);

// start logging the sensor data
logSensorData();

