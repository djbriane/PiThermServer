var redis = require("redis"),
    client = redis.createClient(),
    moment = require('moment');

var TEMP_SENSOR_ID1 = 'dev-temp-sensor'; // DS18B20 (bare)

//redis.debug_mode = true;

// if you'd like to select database 3, instead of 0 (default), call
//client.select(3, function() { /* ... */ });


client.auth('foobared');


client.on("error", function (err) {
    console.log("Error " + err);
});

var timeNow = moment();
//var momentThen = moment().subtract('seconds', 10);

function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// add 10 rows (for testing)
for (var i = 0; i < 10; i = i + 1) {
  timeNow.subtract('minutes', i);

  var readingData = { time: timeNow.valueOf(), value: 20000.00 + getRandomInt(0, 5000) };

  client.zadd(TEMP_SENSOR_ID1, timeNow.valueOf(), JSON.stringify(readingData), redis.print);

}

//client.zcard('tempSensor2', redis.print);
//client.zrangebyscore('tempSensor2', momentThen.valueOf(), momentNow.valueOf(), redis.print);

client.quit();