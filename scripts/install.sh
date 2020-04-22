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
installer_folder="${scaler_folder}/installer"
secudir=${scaler_folder}/.keys
log_file="/tmp/wql_installer_$(date "+%Y.%m.%d-%H.%M.%S").log"
git_user="hnltcs"
wql_user=`whoami`
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

# ####################################################
# todo check for existing package before trying to install: https://unix.stackexchange.com/questions/122681/how-can-i-tell-whether-a-package-is-installed-via-yum-in-a-bash-script
# ####################################################

# install NodeJS, NPM, PM2, GIT
yes | sudo yum update                                                                               &> ${log_file}
yes | sudo yum install curl git                                                                     &>> ${log_file}
[[ -d ${app_folder} ]] || sudo mkdir -p ${app_folder}                                               &>> ${log_file}
sudo chown -R $wql_user:$wql_user ${app_folder}                                                     &>> ${log_file}
[[ -d ~/.ssh ]] || mkdir ~/.ssh && chmod 700  ~/.ssh                                                &>> ${log_file}
#yes | sudo yum remove -y nodejs npm                                                                 &>> ${log_file}
curl -sL https://rpm.nodesource.com/setup_12.x | sudo -E bash -                                     &>> ${log_file}
yes | sudo yum install -y nodejs                                                                    &>> ${log_file}
yes | sudo npm install npm@latest -g                                                                &>> ${log_file}
yes | sudo npm install pm2 -g                                                                       &>> ${log_file}
[[ -d ~/.npm ]] && sudo chown -R $wql_user:$wql_user ~/.npm                                         &>> ${log_file}
[[ -d ~/.config ]] && sudo chown -R $wql_user:$wql_user ~/.config                                   &>> ${log_file}

# add cron housekeeping script of pm2 logs
pm2 install pm2-logrotate                              &>> ${log_file}
pm2 set pm2-logrotate:max_size 100M                    &>> ${log_file}
#pm2 set pm2-logrotate:compress true                    &>> ${log_file}
pm2 set pm2-logrotate:rotateInterval '0 * * * *'              &>> ${log_file}

# if $scaler_folder already exists, do a backup
[[ -d $scaler_folder ]] && sudo mv $scaler_folder "${scaler_folder}_$(date "+%Y.%m.%d-%H.%M.%S")"   &>> ${log_file}
sudo rm -rf ${installer_folder}
git clone https://github.com/worqloads/wql_installer.git $installer_folder                          &>> ${log_file}

cd ${installer_folder}
[[ ! -z "$WQL_VERSION" ]] && git checkout ${WQL_VERSION}                                            &>> ${log_file}
sudo npm install                                                                                    &>> ${log_file}
[[ -d ${secudir} ]] || mkdir -p ${secudir}                                                          &>> ${log_file}
sudo chown -R $wql_user:$wql_user ${app_folder}                                                     &>> ${log_file}

# get aws instance region
TOKEN=`curl -X PUT "http://169.254.169.254/latest/api/token" -H "X-aws-ec2-metadata-token-ttl-seconds: 21600"` &>> ${log_file}
[[ -z $TOKEN ]] || awsregion=$(curl -H "X-aws-ec2-metadata-token: $TOKEN" -s http://169.254.169.254/latest/meta-data/placement/availability-zone) && echo -n ${awsregion::-1} > ${installer_folder}/.aws_region
[[ -z $TOKEN ]] || curl -H "X-aws-ec2-metadata-token: $TOKEN" -s http://169.254.169.254/latest/meta-data/instance-id > ${installer_folder}/.aws_instanceid
[[ -z $TOKEN ]] || curl -H "X-aws-ec2-metadata-token: $TOKEN" -s http://169.254.169.254/latest/meta-data/instance-type > ${installer_folder}/.aws_instancetype
[[ -z $TOKEN ]] || curl -H "X-aws-ec2-metadata-token: $TOKEN" -s http://169.254.169.254/latest/meta-data/hostname > ${installer_folder}/.aws_hostname
[[ -z $TOKEN ]] || curl -H "X-aws-ec2-metadata-token: $TOKEN" -s http://169.254.169.254/latest/meta-data/local-ipv4 > ${installer_folder}/.aws_ip

[[  -f ${installer_folder}/.aws_region && \
    -f ${installer_folder}/.aws_instanceid && \
    -f ${installer_folder}/.aws_instancetype && \
    -f ${installer_folder}/.aws_hostname && \
    -f ${installer_folder}/.aws_ip ]] || exit 1
# create local configuration
clear
node register_min.js ${WQL_VERSION} 'production'

# registration successful
if [[ $? -eq 0 && -f './conf.json' ]]; then
    cd ${scaler_folder}
    mv ${installer_folder}/scale*min.js ${installer_folder}/node_modules ${installer_folder}/.aws_* ${installer_folder}/conf.json .    &>> ${log_file}
    pm2 stop scale_doer_check_min || echo "no existing doer check"      &>> ${log_file}
    pm2 stop scale_doer_collect_min || echo "no existing doer collect"    &>> ${log_file}
    pm2 stop scale_doer_scale_min || echo "no existing doer scale"      &>> ${log_file}
    pm2 flush all &>> ${log_file}
    pm2 start scale_doer_check_min.js scale_doer_collect_min.js scale_doer_scale_min.js             &>> ${log_file}
    pm2 save                                                                                        &>> ${log_file}
fi

rm -rf ${installer_folder}/