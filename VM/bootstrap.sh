#!/bin/sh

apt-get update
apt-get install npm nodejs-legacy -y
#npm install -g mean-cli

cd /vagrant/server
npm install
