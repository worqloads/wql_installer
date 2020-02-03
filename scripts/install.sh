#!/bin/bash
# (C) Worqloads. 2018-2020
# All rights reserved
# Licensed under Simplified BSD License (see LICENSE)
# ####################################################
# Worqloads installation script for user's IT infrastructre
# ####################################################

# WQL_VERSION=v1.0.0 bash -c "$(curl -L https://raw.githubusercontent.com/worqloads/wql_installer/master/scripts/install.sh)"

# Initialize variables
app_folder="/app"
scaler_folder="${app_folder}/scaler"
secudir=${scaler_folder}/.keys
git_user="hnltcs"
wql_user=`whoami`
log_file='./wql_installer.log'
# ####################################################


# stop if there's an error
set -e

# check prereqs & update
# todo supported distrib (redhat), and archi (64bits)

# ####################################################
echo " + App version: $WQL_VERSION"

# update profile
[[ `cat ~/.bashrc | grep -c '^export SECUDIR='` -ne 0  ]] || echo export SECUDIR=${secudir} >> ~/.bashrc ; export SECUDIR=${secudir}
[[ `cat ~/.bashrc | grep -c '^export NODE_ENV='` -ne 0  ]] || echo export NODE_ENV='production' >> ~/.bashrc ; export NODE_ENV='production'
[[ -f ~/.profile ]] && [[ `cat ~/.profile | grep -c '^export SECUDIR='` -ne 0  ]] || echo export SECUDIR=${secudir} >> ~/.profile
[[ -f ~/.profile ]] && [[ `cat ~/.profile | grep -c "^export NODE_ENV="` -ne 0  ]] || echo export NODE_ENV='production' >> ~/.profile 

# install NodeJS, NPM, PM2, GIT
yes | sudo yum install curl git                                                                     &> ${log_file}
yes | sudo yum remove -y nodejs npm                                                                 &> ${log_file}
[[ -d ${app_folder} ]] || sudo mkdir -p ${app_folder}                                               &> ${log_file}
sudo chown -R $wql_user:$wql_user ${app_folder}                                                     &> ${log_file}
[[ -d ~/.ssh ]] || mkdir ~/.ssh && chmod 700  ~/.ssh                                                &> ${log_file}
curl -sL https://rpm.nodesource.com/setup_12.x | sudo -E bash -                                     &> ${log_file}
yes | sudo yum install -y nodejs                                                                    &> ${log_file}
yes | sudo npm install npm@latest -g                                                                &> ${log_file}
yes | sudo npm install pm2 -g                                                                       &> ${log_file}
[[ -d ~/.npm ]] && sudo chown -R $wql_user:$wql_user ~/.npm                                         &> ${log_file}
[[ -d ~/.config ]] && sudo chown -R $wql_user:$wql_user ~/.config                                   &> ${log_file}

# if $scaler_folder already exists, do a backup
[[ -d $scaler_folder ]] && sudo mv $scaler_folder "${scaler_folder}_$(date "+%Y.%m.%d-%H.%M.%S")"   &> ${log_file}
git clone https://github.com/worqloads/wql_installer.git $scaler_folder                             &> ${log_file}

[[ ! -z "$WQL_VERSION" ]] && cd ${scaler_folder} && git checkout ${WQL_VERSION}                     &> ${log_file}
cd ${scaler_folder} && sudo npm install                                                             &> ${log_file}
[[ -d ${secudir} ]] || mkdir -p ${secudir}                                                          &> ${log_file}
sudo chown -R $wql_user:$wql_user ${app_folder}                                                     &> ${log_file}

# create local configuration
clear
node register_min.js

# registration successful
if [[ $? -eq 0 && -f './conf.json' ]]; then
    pm2 start scale_doer_check_min.js scale_doer_collect_min.js scale_doer_scale_min.js             &> ${log_file}
    pm2 save
fi

# add cron housekeeping script of pm2 logs