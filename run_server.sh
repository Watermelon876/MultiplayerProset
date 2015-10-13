#!/bin/bash
DATE=`date +%Y-%m-%d-%H-%M-%S`
sudo nohup nodejs index.js > /var/log/multiplayerproset-$DATE.log 2>&1 &

