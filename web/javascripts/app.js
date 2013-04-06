;(function ($, window, undefined) {
  'use strict';

  var $doc = $(document),
      Modernizr = window.Modernizr;

  var graph, sensorData = [];

  // Get data from Pi NodeJS server
  function getSensorData() {
    var sensorData;
    console.log('get sensor data');
    $.getJSON('./temperature.json', function(data) {
      console.log(data);
      if (data && data.length > 0) {
        if (!graph) {
          graph = window.Morris.Line({
            element: 'line-example',
            data: data,
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
      }

    });

    // poll server again in 5 minutes
    setTimeout(getSensorData, ((1000 * 60) * 5));

  }

  $(document).ready(function() {
    // $.fn.foundationAlerts           ? $doc.foundationAlerts() : null;
    // $.fn.foundationButtons          ? $doc.foundationButtons() : null;
    // $.fn.foundationAccordion        ? $doc.foundationAccordion() : null;
    // $.fn.foundationNavigation       ? $doc.foundationNavigation() : null;
    // $.fn.foundationTopBar           ? $doc.foundationTopBar() : null;
    // $.fn.foundationCustomForms      ? $doc.foundationCustomForms() : null;
    // $.fn.foundationMediaQueryViewer ? $doc.foundationMediaQueryViewer() : null;
    // $.fn.foundationTabs             ? $doc.foundationTabs({callback : $.foundation.customForms.appendCustomMarkup}) : null;
    // $.fn.foundationTooltips         ? $doc.foundationTooltips() : null;
    // $.fn.foundationMagellan         ? $doc.foundationMagellan() : null;
    // $.fn.foundationClearing         ? $doc.foundationClearing() : null;

    // $.fn.placeholder                ? $('input, textarea').placeholder() : null;




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
