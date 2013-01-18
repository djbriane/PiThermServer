// Obtains the device IP on the network
// TODO: Move this into external file / npm package
// Source: http://stackoverflow.com/questions/3653065/get-local-ip-address-in-node-js

exports.getNetworkIP = (function () {

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