#!/bin/bash
# (C) Worqloads. 2018-2020
# All rights reserved
# Licensed under Simplified BSD License (see LICENSE)
# ####################################################
# Worqloads installation script for user's IT infrastructre
# ####################################################

# WQL_VERSION=VALUE WQL_API_KEY=XXX bash -c "$(curl -L https://raw.githubusercontent.com/worqloads/wql_installer/master/scripts/install.sh)"

# Initialize variables
app_folder="/app"
shared_lxc_folder="/shared"
bin_folder="${shared_lxc_folder}/binaries"
conf_folder="${shared_lxc_folder}/pub/conf/"
scaler_folder="${app_folder}/scaler"
secudir=${scaler_folder}/.keys
lxccontainer="worker"
git_user="hnltcs"
nb_systems="10"
lic_request="req_worker.json"
wql_user=`whoami`
# stop if there's an error
set -e

# check prereqs & update
# todo supported distrib (redhat), and archi (64bits)

# ####################################################
echo "app version: $WQL_VERSION"

# update profile
[[ `cat ~/.bashrc | grep -c '^export SECUDIR='` -ne 0  ]] || echo export SECUDIR=${secudir} >> ~/.bashrc ; export SECUDIR=${secudir}
[[ `cat ~/.bashrc | grep -c '^export NODE_ENV='` -ne 0  ]] || echo export NODE_ENV='production' >> ~/.bashrc ; export NODE_ENV='production'
[[ -f ~/.profile ]] && [[ `cat ~/.profile | grep -c '^export SECUDIR='` -ne 0  ]] || echo export SECUDIR=${secudir} >> ~/.profile
[[ -f ~/.profile ]] && [[ `cat ~/.profile | grep -c "^export NODE_ENV="` -ne 0  ]] || echo export NODE_ENV='production' >> ~/.profile 

# install NodeJS, NPM, PM2, GIT
yes | sudo yum install curl git 
[[ -d ${app_folder} ]] || sudo mkdir -p ${app_folder}
sudo chown -R $wql_user:$wql_user ${app_folder} 
[[ -d ~/.ssh ]] || mkdir ~/.ssh && chmod 700  ~/.ssh
curl -sL https://rpm.nodesource.com/setup_12.x | sudo -E bash - 
yes | sudo yum install -y nodejs 
yes | sudo npm install npm@latest -g 
yes | sudo npm install pm2 -g
[[ -d ~/.npm ]] && sudo chown -R $wql_user:$wql_user ~/.npm 
[[ -d ~/.config ]] && sudo chown -R $wql_user:$wql_user ~/.config

git clone https://github.com/worqloads/wql_installer.git $scaler_folder 

# [[ ! -z "$WQL_VERSION" ]] && cd ${scaler_folder} && git checkout ${WQL_VERSION}
cd ${scaler_folder} && sudo npm install
# [[ -d ${secudir} ]] || mkdir -p ${secudir}
# cp ${shared_lxc_folder}/pub/keys/worqloads_client.pse ${secudir}/
sudo chown -R $wql_user:$wql_user ${app_folder} /home/$wql_user/.npm 

history -c
