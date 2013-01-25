#!/usr/bin/python

from Adafruit_CharLCD import Adafruit_CharLCD
#from subprocess import *
from time import sleep
from datetime import datetime

lcd = Adafruit_CharLCD()

#cmd = "ip addr show wlan0 | grep inet | awk '{print $2}' | cut -d/ -f1"

#sensorId = "28-00000418941a"  # bare
#sensorId = "28-0000047505a4"  # black plastic
sensorId = "28-000002aa9557"  # silver thermowell

lcd.begin(16, 1)

# def run_cmd(cmd):
#         p = Popen(cmd, shell=True, stdout=PIPE)
#         output = p.communicate()[0]
#         return output

while 1:
        tfile = open("/sys/bus/w1/devices/%s/w1_slave" % (sensorId))
        text = tfile.read()
        sensorData = text.split("\n")[1].split(" ")[9]
        sensorReading = float(sensorData[2:])
        sensorReading = sensorReading / 1000

        sensorReadingF = 9.0 / 5.0 * sensorReading + 32

        print "Sensor Reading:", sensorReadingF

        lcd.clear()
        #ipaddr = run_cmd(cmd)
        lcd.message(datetime.now().strftime('%b %d  %H:%M:%S\n'))
        lcd.message("Temp: %0.1f° F" % sensorReadingF)
        #lcd.message('IP %s' % ( ipaddr ) )
        sleep(60)
