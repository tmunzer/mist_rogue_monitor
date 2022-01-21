#!/bin/bash


cd mist-rogue-monitor
ng build --deploy-url /ng/ 
rm -rf ../src/public/ng/*
cp ./dist/mist-rogue-monitor/* ../src/public/ng
cp ./dist/mist-rogue-monitor/index.html ../src/views/index.html
