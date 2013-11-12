;(function ($, window, undefined) {
  'use strict';

  var $doc = $(document),
      Modernizr = window.Modernizr;

  var graph, sensorData = [],
      sparkFormat = {
          width: '100%',
          height: '80px',
          lineColor: '#0b62a4',
          highlightLineColor: false,
          fillColor: false,
          spotRadius: 3,
          normalRangeMax: 72.0,
          normalRangeMin: 60.0,
          lineWidth: 2,
          tooltipSuffix: '°',
          numberFormatter: function(val) {return Math.round(val); }
        };

  var MAX_RANGE = 90.0, MIN_RANGE = 50.0;

  function getTrendWithSensorData(data) {
    var trendItems = 20, currentReading, recentAvg;

    currentReading = _.first(data).value;
    recentAvg = _.reduce(_.first(data, trendItems), function(sum, item) {
      return sum + item.value;
    }, 0);

    recentAvg = recentAvg / trendItems;
    console.log('Trend Data - Avg: ' + recentAvg + ' Latest: ' + currentReading);

    if (recentAvg < currentReading) {
      // Trend is RISING
      return 1;
    }
    if (recentAvg > currentReading) {
      // Trend is FALLING
      return -1;
    }
    // No Change / Error
    return 0;
  }

  function updateCurrentWithResponse(response) {
    var colorUp = '#2DB200';
    var colorDown = '#B20000';
    // remove any outlier data (bad sensor readings)
    var dataSensor1 = _.filter(response[0], function(val) { return (val.value > MIN_RANGE && val.value < MAX_RANGE); });
    var dataSensor2 = _.filter(response[1], function(val) { return (val.value > MIN_RANGE && val.value < MAX_RANGE); });

    var currentSensor1 = _.first(dataSensor1);
    var currentSensor2 = _.first(dataSensor2);
    $('.current-temp.sensor1').text(Math.round(currentSensor1.value) + '°');
    $('.current-temp.sensor2').text(Math.round(currentSensor2.value) + '°');
    $('.current-temp-date span').text(window.moment(currentSensor1.time).format('MMM Do, h:mm:ss a'));

    var trendSensor1 = getTrendWithSensorData(dataSensor1);
    console.log('Sensor1 Trend: ' + trendSensor1);
    if (trendSensor1 > 0) {
      $('.current-temp.sensor1').css({color: colorUp});
    } else if (trendSensor1 < 0) {
      $('.current-temp.sensor1').css({color: colorDown});
    }

    var trendSensor2 = getTrendWithSensorData(dataSensor2);
    console.log('Sensor2 Trend: ' + trendSensor2);
    if (trendSensor2 > 0) {
      $('.current-temp.sensor2').css({color: colorUp});
    } else if (trendSensor2 < 0) {
      $('.current-temp.sensor2').css({color: colorDown});
    }
  }

  // Get data from Pi NodeJS server
  function getSensorData() {
    var sensorData12 = [], sensorData24, sensorData48, time12hrsago, time24hrsago, time48hrsago;

    time12hrsago = new window.moment().subtract('hours', 12);
    time24hrsago = new window.moment().subtract('hours', 24);
    time48hrsago = new window.moment().subtract('hours', 48);

    $.getJSON('./temperature.json', function(response) {
      //var response = window.testChartData;
      var data = [];
      if (response && response.length > 0) {
        if (response[0] && response[0].length > 0) {
          sensorData12 = _.filter(response[0], function(val) { return (val.value > MIN_RANGE && val.value < MAX_RANGE); });
        }
        if (response[1] && response[1].length > 0) {
          data = _.filter(response[1], function(val) { return (val.value > MIN_RANGE && val.value < MAX_RANGE); });

          data = _.map(data, function(item) {
            var tempData = {};
            tempData.time = item.time;
            tempData.value2 = item.value;
            return tempData;
          });

          sensorData12 = _.merge(sensorData12, data);
          sensorData12 = _.filter(sensorData12, function(val, index) {
            return (time12hrsago.isBefore(val.time) && index % 6 === 0);
          });
        }

        if (!graph) {
          graph = window.Morris.Line({
            element: 'line-example',
            data: sensorData12,
            xkey: 'time',
            ykeys: ['value', 'value2'],
            labels: ['Sensor 1', 'Sensor 2'],
            xLabels: '5min',
            ymin: 'auto 60.0',
            ymax: 'auto 72.0',
            hideHover: 'auto',
            postUnits: '°',
            pointSize: 0,
            goals: [60.0, 72.0],
            goalLineColors: ['#00ff00'],
            yLabelFormat: function (y) { if (y) { return y.toFixed(0) + '°'; } return y; },
            dateFormat: function (x) { return new window.moment(x).format('MMM Do, h:mm:ss a'); }
          });
        } else {
          graph.setData(sensorData12);
        }

        // setup data for 24hr graph
        sensorData24 = _.filter(response[0], function(val) { return (val.value > MIN_RANGE && val.value < MAX_RANGE); });
        sensorData24 = _.filter(sensorData24, function(val, index) {
          return (time24hrsago.isBefore(val.time) && index % 12 === 0);
        });
        sensorData24 = _.pluck(sensorData24, 'value').reverse();
        $('.graph-24hr').sparkline(sensorData24, sparkFormat);

        // setup data for 48hr graph
        sensorData48 = _.filter(response[0], function(val) { return (val.value > MIN_RANGE && val.value < MAX_RANGE); });
        sensorData48 = _.filter(sensorData48, function(val, index) {
          return (time48hrsago.isBefore(val.time) && index % 24 === 0);
        });
        sensorData48 = _.pluck(sensorData48, 'value').reverse();
        $('.graph-48hr').sparkline(sensorData48, sparkFormat);

        updateCurrentWithResponse(response);
      }

    });

    // poll server again in 5 minutes
    setTimeout(getSensorData, ((1000 * 60) * 5));

  }

  // Get 7d/14d data from Pi NodeJS server
  function getWeekSensorData() {
    var sensorData7d, sensorData14d,
      time7dago = new window.moment().subtract('days', 7),
      time14dago = new window.moment().subtract('days', 14);

    console.log('get weekly sensor data');
    $.getJSON('./temperature_long.json', function(data) {
      if (data && data.length > 0) {
        // remove data outside min/max range
        data = _.filter(data, function(val) { return (val.value > MIN_RANGE && val.value < MAX_RANGE); });

        // setup data for 7d graph
        sensorData7d = _.filter(data, function(val, index) {
          return (time7dago.isBefore(val.time));
        });
        sensorData7d = _.pluck(sensorData7d, 'value').reverse();
        $('.graph-7d').sparkline(sensorData7d, sparkFormat);

        // setup data for 14d graph
        sensorData14d = _.filter(data, function(val, index) {
          return (time14dago.isBefore(val.time) && index % 2 === 0);
        });
        sensorData14d = _.pluck(sensorData14d, 'value').reverse();
        $('.graph-14d').sparkline(sensorData14d, sparkFormat);

      }

    });

  }

  $(document).ready(function() {
    getSensorData();

    // show 7d/14d graph
    getWeekSensorData();
  });

  // Hide address bar on mobile devices (except if #hash present, so we don't mess up deep linking).
  if (Modernizr.touch && !window.location.hash) {
    $(window).load(function () {
      setTimeout(function () {
        window.scrollTo(0, 1);
      }, 0);
    });
  }

})(jQuery, this);
