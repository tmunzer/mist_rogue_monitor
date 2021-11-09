#!/bin/bash


cd angular-security
ng build --deploy-url /ng/ 
rm -rf ../src/public/ng/*
cp ./dist/angular-security/* ../src/public/ng
cp ./dist/angular-security/index.html ../src/views/index.html
