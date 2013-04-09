PiThermServer
=============

Simple NodeJS server for the DS18B20 digital temperature sensor on the Raspberry Pi.

Description
-----------
A few lines of code to show my implementation of a NodeJS server for the DS18B20 GPIO temperature sensor on the Raspberry Pi. The sensor is accessed using the w1-gpio and w1-therm kernel modules in the Raspbian distro. The server parses data from the sensor and returns the temperature and a Unix time-stamp in JSON format. A simple front-end is included and served usig node-static, which performs ajax calls to the server and plots temperature in real time using the Morris.js and jQuery Sparkline JavaScript libraries.

Files
-----
* load_gpio.sh - bash commands to load kernel modules
* server.js - NodeJS server, returns temperature as JSON and serves other static files
* sensor.js - NodeJS script for polling the sensor and storing data in a Redis DB
* web/ - client files for displaying temperature dashboard

Usage
-----
* With sensor attached load kernel modules: sudo load_gpio.sh
* Start sensor polling: node sensor.js
* Start server: node server.js

References
----------
http://www.cl.cam.ac.uk/freshers/raspberrypi/tutorials/temperature/

Screenshots/Images
------------------
![Temp Sensor Dashboard](dashboard_screen.png "Temp Sensor Dashboard")
