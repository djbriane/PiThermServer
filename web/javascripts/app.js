;(function ($, window, undefined) {
  'use strict';

  var $doc = $(document),
      Modernizr = window.Modernizr;

  var graph, sensorData = [];

  // Get data from Pi NodeJS server
  function getSensorData() {
    var sensorData, sensorData24, sensorData48, time12hrsago, time24hrsago, time48hrsago;

    time12hrsago = new window.moment().subtract('hours', 12);
    time24hrsago = new window.moment().subtract('hours', 24);
    time48hrsago = new window.moment().subtract('hours', 48);

    console.log('get sensor data');
    $.getJSON('./temperature.json', function(data) {
      sensorData = data;

      if (data && data.length > 0) {
        data = _.filter(data, function(val, index) {
          return (time12hrsago.isBefore(val.time) && index % 2 === 0);
        });

        if (!graph) {
          graph = window.Morris.Line({
            element: 'line-example',
            data: _.filter(data, function(val) { return (val.value > 50.0 && val.value < 90.0); }),
            xkey: 'time',
            ykeys: ['value'],
            labels: ['Temp Sensor'],
            xLabels: '5min',
            ymin: 'auto',
            ymax: 'auto',
            hideHover: 'auto',
            postUnits: '°',
            pointSize: 0,
            goals: [60.0, 72.0],
            goalLineColors: ['#00ff00'],
            dateFormat: function (x) { return new window.moment(x).format('MMM Do, h:mm:ss a'); }
          });
        } else {
          graph.setData(data);
        }

        sensorData24 = _.filter(sensorData, function(val, index) {
          return (time24hrsago.isBefore(val.time) && index % 12 === 0);
        });
        sensorData24 = _.pluck(sensorData24, 'value').reverse();
        sensorData24 = _.filter(sensorData24, function(num) { return (num > 50.0 && num < 90.0); });

        sensorData48 = _.filter(sensorData, function(val, index) {
          return (time48hrsago.isBefore(val.time) && index % 24 === 0);
        });
        sensorData48 = _.pluck(sensorData48, 'value').reverse();
        sensorData48 = _.filter(sensorData48, function(num) { return (num > 50.0 && num < 90.0); });


        $('.graph-24hr').sparkline(sensorData24, {
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
          numberFormatter: function(val) {return Math.round(val);}
        });

        $('.graph-48hr').sparkline(sensorData48, {
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
          numberFormatter: function(val) {return Math.round(val);}
        });
      }

    });

    // poll server again in 5 minutes
    setTimeout(getSensorData, ((1000 * 60) * 5));

  }

  $(document).ready(function() {
    getSensorData();
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
