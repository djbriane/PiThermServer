#!/usr/bin/python

from Adafruit_CharLCD import Adafruit_CharLCD
from subprocess import *
from time import sleep, strftime
from datetime import datetime

lcd = Adafruit_CharLCD()

cmd = "ip addr show wlan0 | grep inet | awk '{print $2}' | cut -d/ -f1"

#sensorId = "28-00000418941a"  # bare
sensorA = "28-0000047505a4"  # black plastic
sensorB = "28-000002aa9557"  # silver thermowell

lcd.begin(16, 1)

def run_cmd(cmd):
	p = Popen(cmd, shell=True, stdout=PIPE)
	output = p.communicate()[0]
	return output

def get_sensor_data(sensorId):
	tfile = open("/sys/bus/w1/devices/%s/w1_slave" % (sensorId))
        text = tfile.read()
        sensorData = text.split("\n")[1].split(" ")[9]
        sensorReading = float(sensorData[2:])
        sensorReading = sensorReading / 1000

        sensorReadingF = 9.0 / 5.0 * sensorReading + 32
	return sensorReadingF

while 1:
        lcd.clear()
        #ipaddr = run_cmd(cmd)
	#lcd.message('IP %s' % ( ipaddr ) )
        lcd.message(datetime.now().strftime('%b %d  %H:%M:%S\n'))
        
	sensorReadingA = get_sensor_data(sensorA)
	sensorReadingB = get_sensor_data(sensorB)
	lcd.message("%0.1f / %0.1f" % (sensorReadingA, sensorReadingB))
        
        sleep(60)
