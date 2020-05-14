#!/bin/bash
# (C) Worqloads. 2018-2020
# All rights reserved
#
# Licensed under Simplified BSD License (see LICENSE)
# ####################################################
# Worqloads - SmartScaler agent update script 
# ####################################################

# Script parameters: version and agent_id
# Execution command example: ./update.sh -v=1.0.0

# Assume git is already installed

# stop if there's an error
set -e

# 0. Check & validate parameters
# ####################################################
function scripthelp {
    echo ''
    echo 'Usage: ./update.sh [options] '
    echo ''
    echo 'where [options] is composed of:' 
    echo ''
    echo '  -v|--version=<target_version>                  provide the newer version to update to'
    echo '  -a|--agent=<agent_id>                          provides the agent ID'
    echo ''
    # echo 'Execution command example: ./update.sh -v=1.5.0'
    echo 'Execution command example: ./update.sh -v=1.5.0 -a=5ebacdfe4dc3c546676a3ffe'
    echo ''
}

[[ $# -lt 2 ]] && echo "Error: illegal number of parameters" && scripthelp && exit 1
for i in "$@"; do
    case $i in
        -v=*|--version=*)
        WQL_VERSION="${i#*=}"
        shift # past argument=value
        ;;
        -a=*|--agent=*)
        WQL_AGENT="${i#*=}"
        shift # past argument=value
        ;;
        *)
        # unknown option
        ;;
    esac
done
echo "WQL_VERSION  = ${WQL_VERSION}"
echo "WQL_AGENT    = ${WQL_AGENT}"

[[ ${WQL_VERSION} =~ v[0-9]+\.[0-9]+\.[0-9]+ && ${WQL_AGENT} =~ [0-9A-Fa-f]{24} ]] || (echo "Error: incorrect parameters"  && exit 1)

# 1. Initialize variables
# ####################################################
app_folder="/app"
scaler_folder="${app_folder}/scaler"
installer_folder="${scaler_folder}/installer"
backup_folder="${scaler_folder}/.before_update_$(date "+%Y.%m.%d-%H.%M.%S")"
log_file="/tmp/wql_updater_$(date "+%Y.%m.%d-%H.%M.%S").log"
git_user="hnltcs"
wql_user=`whoami`

# 2. Check prereqs & update
# todo supported distrib (redhat), and archi (64bits)
# ####################################################

yum -q list installed git &>/dev/null || (echo "Error: Missing packages" && exit 2)
if [[ -f ${app_folder}/conf.json && \
   -f ${app_folder}/.aws_region && \
   -f ${app_folder}/.aws_instanceid && \
   -f ${app_folder}/.aws_vpc && \
   -f ${app_folder}/.aws_instancetype && \
   -f ${app_folder}/.aws_hostname && \
   -f ${app_folder}/.aws_ip ]]; then
   echo "Error: Missing configuration file"
   exit 3
fi

# 3. Update
# ####################################################

#clear
sudo rm -rf ${installer_folder}
mkdir -p ${backup_folder}
git clone https://github.com/worqloads/wql_installer.git $installer_folder                          &>> ${log_file}

cd ${installer_folder}
git checkout ${WQL_VERSION}                                                                         &>> ${log_file}
sudo npm install                                                                                    &>> ${log_file}
sudo chown -R $wql_user:$wql_user ${app_folder}                                                     &>> ${log_file}

cd ${scaler_folder}
mv ${scaler_folder}/scaler*min.js ${backup_folder}/                                                &>> ${log_file}
mv ${installer_folder}/scale*min.js ${scaler_folder}/                                              &>> ${log_file}
cp -r ${installer_folder}/node_modules/* ${scaler_folder}/node_modules/                            &>> ${log_file}
pm2 restart all  --update-env                                                                      &>> ${log_file}
pm2 list                                                                                           &>> ${log_file}
#pm2 save                                                                                           &>> ${log_file}
# update version in conf file
sed -i -E "s/\"version\":\s\"v[0-9]+\.[0-9]+\.[0-9]+\"/\"version\": \"${WQL_VERSION}\"/" ${app_folder}/conf.json &>> ${log_file}
cat ${app_folder}/conf.json                                                                        &>> ${log_file}

# report new version to web app
curl -d "{\"agent\": ${WQL_AGENT}, \"version\": ${WQL_VERSION} }" -H "Content-Type: application/json" -X POST https://scaling.worqloads.com/updates/done &>> ${log_file}
rm -rf ${installer_folder}                                                                         &>> ${log_file}

# curl -d "{\"agent\": \"ddd\", \"version\": \"111\" }" -H "Content-Type: application/json" -X POST https://scaling.worqloads.com/updates