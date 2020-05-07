'use strict';

function _interopDefault (ex) { return (ex && (typeof ex === 'object') && 'default' in ex) ? ex['default'] : ex; }

var kue = _interopDefault(require('kue'));
var redis = _interopDefault(require('redis'));
var fs$1 = _interopDefault(require('fs'));
var cron = _interopDefault(require('cron'));
var async = _interopDefault(require('async'));
var crypto = _interopDefault(require('crypto'));
var soap = _interopDefault(require('soap'));
var http = _interopDefault(require('http'));
var axios = _interopDefault(require('axios'));
var moment = _interopDefault(require('moment'));
var awsSdk = _interopDefault(require('aws-sdk'));

/**
 * PushCli class
 * ==================
 * Hanalytics own implementation of Prometheus Pushgateway CLIENT API
 */
// External librairies
// ----------------------------------------------------------------------------
 // Class definition
// ----------------------------------------------------------------------------
// Constructor


function PushCli(endpoint, version, staging) {
  // console.log('D PushCli ! Constructor begins');
  this.version = version;
  this.staging = staging;
  this.gtw_url = endpoint; // 'http://'+prometheusGtw[env].pushgateway_host+':'+prometheusGtw[env].pushgateway_port

  this.metrics_caches = {}; // {instance : [ array of labels, kpi_value, kpi]}
  // buffer to limit actual push to pushgtw, push only on changes.

  this.up_timeseries = {}; // { instance : { kpi: [labels array ]}}
} // Class definition


PushCli.prototype = {
  Constructor: PushCli,
  // Private methods
  assign_hierarchy: function assign_hierarchy(obj, keyPath, value) {
    var lastKeyIndex = keyPath.length - 1;

    for (var i = 0; i < lastKeyIndex; ++i) {
      var key = keyPath[i];

      if (!(key in obj)) {
        obj[key] = {};
      }

      obj = obj[key];
    }

    obj[keyPath[lastKeyIndex]] = value;
  },
  generateGroupings: function generateGroupings(groupings) {
    var that = this;

    if (!groupings) {
      return '/version/' + that.version + '/staging/' + that.staging;
    }

    var all_groupings = Object.assign(groupings, {
      version: that.version,
      staging: that.staging
    });
    return Object.keys(all_groupings).map(function (key) {
      return "/".concat(encodeURIComponent(key), "/").concat(encodeURIComponent(all_groupings[key]));
    }).join('');
  },
  // Init an instance (SAP system)
  addInstance: function addInstance(syst_id) {
    // console.log('==== pshgtw addInstance '+syst_id)
    if (!this.metrics_caches[syst_id]) this.metrics_caches[syst_id] = {};
  },
  // Remove an Instance (SAP system)
  // deleteInstance: function(job,suid,region,sap_id) {
  //   var self = this
  //   const syst_id = suid
  //   delete this.metrics_caches[syst_id]
  //   //Delete all metrics for jobName & instance
  //   self.delSerie(job, {instance: suid})
  //   // Update SAP Up status
  //   self.pushUpInstance('up', suid, region, sap_id, 0)
  // },
  // Push SAP instance Up state!
  pushCounter: function pushCounter() {
    var jobname = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 'counter';
    var operation = arguments.length > 1 ? arguments[1] : undefined;
    var entity_id = arguments.length > 2 ? arguments[2] : undefined;
    var syst_id = arguments.length > 3 ? arguments[3] : undefined;
    var instancenr = arguments.length > 4 ? arguments[4] : undefined;
    var policy_name = arguments.length > 5 ? arguments[5] : undefined;
    var value = arguments.length > 6 ? arguments[6] : undefined;
    var self = this; // console.log(' pushCounter:', operation, entity_id, syst_id, instancenr, policy_name, value)
    // dedicated groupings for counters with system & instances
    // it prevents erasing previous values from other instances when new counter increment for specific counter

    var groupings = {
      instance: entity_id,
      system_id: syst_id,
      instancenr: instancenr
    };
    var req = '# TYPE counter_' + operation + ' gauge\n';
    async.series([function (serie_cb) {
      if (value == 1) {
        var init_req = req + 'counter_' + operation + ' {policy_name="' + policy_name + '"} 0\n';
        axios.post(self.gtw_url + '/metrics/job/' + encodeURIComponent(jobname) + self.generateGroupings(groupings), init_req)["catch"](function (error) {
          if (error) {
            console.error('pushCounter error:', error);
          }
        })["finally"](function () {
          setTimeout(function () {
            serie_cb();
          }, 25000);
        }); // req += 'counter_' + operation + ' {system_id="' + syst_id + '",policy_name="init",instancenr="' + instancenr + '"} ' + 0 + '\n'
      } else serie_cb();
    }, function (serie_cb) {
      var upd_req = req + 'counter_' + operation + ' {policy_name="' + policy_name + '"} ' + value + '\n';
      axios.post(self.gtw_url + '/metrics/job/' + encodeURIComponent(jobname) + self.generateGroupings(groupings), upd_req)["catch"](function (error) {
        if (error) {
          console.error('pushCounter error:', error);
        }
      })["finally"](function () {
        serie_cb();
      });
    }]);
  },
  // Push SAP system Up state for a specified instance (SAP system)!
  pushUpInstance: function pushUpInstance() {
    var jobname = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 'up';
    var entity_id = arguments.length > 1 ? arguments[1] : undefined;
    var systId = arguments.length > 2 ? arguments[2] : undefined;
    var region = arguments.length > 3 ? arguments[3] : undefined;
    var sid = arguments.length > 4 ? arguments[4] : undefined;
    var status = arguments.length > 5 ? arguments[5] : undefined;
    var self = this;
    var current_status = self.up_timeseries[systId] && self.up_timeseries[systId]['status_up'] && self.up_timeseries[systId]['status_up'][entity_id + '+' + region + '+' + sid]; // create dynamic object hierarchy

    if (current_status == null) {
      self.assign_hierarchy(self.up_timeseries, [systId, 'status_up', entity_id + '+' + region + '+' + sid], status);
    }

    if (current_status !== status) {
      var req = '# TYPE status_up gauge\n' + 'status_up {instance="' + systId + '",entity_id="' + entity_id + '",sid="' + sid + '",cp_region="' + region + '" } ' + status + '\n';
      axios.post(self.gtw_url + '/metrics/job/' + encodeURIComponent(jobname) + self.generateGroupings({
        instance: systId
      }), req)["catch"](function (error) {
        console.error('pushUpInstance error:', error);
      });
    }
  },
  // Push scaling status for SAP system for a specified instance (SAP system)!
  pushUpScaling: function pushUpScaling() {
    var jobname = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 'up';
    var entity_id = arguments.length > 1 ? arguments[1] : undefined;
    var systId = arguments.length > 2 ? arguments[2] : undefined;
    var status = arguments.length > 3 ? arguments[3] : undefined;
    var self = this;
    var current_status = self.up_timeseries[systId] && self.up_timeseries[systId]['scaling_up'] && self.up_timeseries[systId]['scaling_up'][entity_id]; // create dynamic object hierarchy

    if (current_status == null) {
      self.assign_hierarchy(self.up_timeseries, [systId, 'scaling_up', entity_id], status);
    }

    if (current_status !== status) {
      var req = '# TYPE scaling_up gauge\n' + 'scaling_up {instance="' + systId + '",entity_id="' + entity_id + '" } ' + status + '\n';
      axios.post(self.gtw_url + '/metrics/job/' + encodeURIComponent(jobname) + self.generateGroupings({
        instance: systId
      }), req)["catch"](function (error) {
        console.error('pushUpScaling error:', error);
      });
    }
  },
  // Push SAP instance Up state!
  pushUpSAPInstance: function pushUpSAPInstance() {
    var jobname = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 'up';
    var entity_id = arguments.length > 1 ? arguments[1] : undefined;
    var systId = arguments.length > 2 ? arguments[2] : undefined;
    var region = arguments.length > 3 ? arguments[3] : undefined;
    var sid = arguments.length > 4 ? arguments[4] : undefined;
    var instances = arguments.length > 5 ? arguments[5] : undefined;
    var self = this;
    var req = '';
    instances.forEach(function (i) {
      if (self.up_timeseries[systId] && self.up_timeseries[systId]['status_instance_up'] && self.up_timeseries[systId]['status_instance_up'][entity_id + '+' + region + '+' + sid + '+' + i.instancenr] == null) {
        self.assign_hierarchy(self.up_timeseries, [systId, 'status_instance_up', entity_id + '+' + region + '+' + sid + '+' + i.instancenr], i.status);
      }

      req += 'status_instance_up {instance="' + systId + '",entity_id="' + entity_id + '",sid="' + sid + '",cp_region="' + region + '",sn="' + i.instancenr + '"} ' + i.status + '\n';
    });

    if (req != '') {
      axios.post(self.gtw_url + '/metrics/job/' + encodeURIComponent(jobname) + self.generateGroupings({
        instance: systId
      }), '# TYPE status_instance_up gauge\n' + req)["catch"](function (error) {
        console.error('pushUpSAPInstance error:', error);
      });
    }
  },
  // Push KPIs values to the gateway for a specified instance!
  pushInstance: function pushInstance(jobname, systId, cb) {
    var self = this; // console.log('==== pshgtw pushInstance '+systId)

    if (self.metrics_caches[systId]) {
      var arr_filter_keys = Object.keys(self.metrics_caches[systId]).filter(function (x) {
        return self.metrics_caches[systId][x].length > 0;
      });
      async.each(arr_filter_keys, function (kpi_id, callback) {
        var req = '# TYPE ' + kpi_id + ' gauge\n' + self.metrics_caches[systId][kpi_id].map(function (x) {
          return kpi_id + ' ' + x;
        }).join('\n') + '\n'; // console.log("push:",req)

        axios.post(self.gtw_url + '/metrics/job/' + encodeURIComponent(jobname) + self.generateGroupings({
          instance: systId
        }), req).then(function (response) {
          self.metrics_caches[systId][kpi_id] = [];
          callback();
        })["catch"](function (error) {
          self.metrics_caches[systId][kpi_id] = [];
          callback(error);
        });
      }, function (err) {
        if (err) {
          console.error('pushInstance error:', err);
        }

        self.metrics_caches[systId] = {};

        if (cb) {
          cb();
        }
      });
    } else if (cb) {
      cb();
    }
  },
  // Set kpi and lables into caches for futur push
  set: function set(labelsnames, kpiname, value, system_id) {
    var self = this;
    var kpi = kpiname.replace(/-|\(|\)|\[|\]|\%|\+|\.|\s/g, '_'); // console.log('==== pshgtw set : '+system_id+' '+kpi+' >> self.metrics_caches[system_id]',self.metrics_caches[system_id])

    var kpi_value = value == null ? 0 : isNaN(value) ? Math.round(parseInt(moment(value, 'YYYY/MM/DD hh:mm:ss').format('X'))) : Math.round(parseInt(value));
    if (!self.metrics_caches[system_id][kpi]) self.metrics_caches[system_id][kpi] = []; // Check if KPI with same labels has already been submitting since the last pushInstance

    var kpi_is_set_idx = self.metrics_caches[system_id][kpi].map(function (x) {
      return x.split(' ')[0];
    }).indexOf(labelsnames
    /*+' '+kpi_value*/
    );

    if (kpi_is_set_idx >= 0) {
      // If so, update the value with the most recent one by deleting first, then inserting
      self.metrics_caches[system_id][kpi].splice(kpi_is_set_idx, 1);
    }

    self.metrics_caches[system_id][kpi].push(labelsnames + ' ' + kpi_value);
  },
  // Delete last pushed metrics in Prometheus if connection to system (suid) is lost for (conn_retries_max) tentatives
  del: function del(jobname, sap_id) {
    var self = this; // curl -X DELETE http://pushgateway.example.org:9091/metrics/job/some_job/instance/some_instance

    axios["delete"](self.gtw_url + '/metrics/job/' + encodeURIComponent(jobname) + self.generateGroupings({
      instance: sap_id
    })).then(function (response) {}) // .then(function(response){
    //   console.log('del:',response)
    // })
    ["catch"](function (error) {
      console.error('pshgtw::del::error :', error);
    });
  },
  delSerie: function delSerie(jobname, matching_condition) {
    var self = this; // curl -X DELETE http://pushgateway.example.org:9091/metrics/job/some_job/instance/some_instance

    axios["delete"](self.gtw_url + '/metrics/job/' + encodeURIComponent(jobname) + self.generateGroupings(matching_condition)).then(function (response) {}) // .then(function(response){
    //   console.log('del:',response)
    // })
    ["catch"](function (error) {
      console.error('pshgtw::delSerie::error :', error);
    });
  },
  delInstance: function delInstance(jobname, instance_id) {
    var self = this; // curl -X DELETE http://pushgateway.example.org:9091/metrics/job/some_job/instance/some_instance

    axios["delete"](self.gtw_url + '/metrics/job/' + encodeURIComponent(jobname) + self.generateGroupings({
      instance: instance_id
    })).then(function (response) {}) // .then(function(response){
    //   console.log('del:',response)
    // })
    ["catch"](function (error) {
      console.error('pshgtw::delInstance::error :', error);
    });
  }
}; // Export the class

var pushcli = PushCli;

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

var sapcontrol_operations = {
  "ABAPGetComponentList": function ABAPGetComponentList(arg1, cb) {
    this.ABAPGetComponentList(arg1, cb);
  },
  "GetProcessList": function GetProcessList(arg1, cb) {
    this.GetProcessList(arg1, cb);
  },
  "GetAlerts": function GetAlerts(arg1, cb) {
    this.GetAlerts(arg1, cb);
  },
  "GetAlertTree": function GetAlertTree(arg1, cb) {
    this.GetAlertTree(arg1, cb);
  },
  "GetEnvironment": function GetEnvironment(arg1, cb) {
    this.GetEnvironment(arg1, cb);
  },
  "GetVersionInfo": function GetVersionInfo(arg1, cb) {
    this.GetVersionInfo(arg1, cb);
  },
  "GetQueueStatistic": function GetQueueStatistic(arg1, cb) {
    this.GetQueueStatistic(arg1, cb);
  },
  "GetInstanceProperties": function GetInstanceProperties(arg1, cb) {
    this.GetInstanceProperties(arg1, cb);
  },
  "ABAPGetWPTable": function ABAPGetWPTable(arg1, cb) {
    this.ABAPGetWPTable(arg1, cb);
  },
  "Start": function Start(arg1, cb) {
    this.Start(arg1, cb);
  },
  "Stop": function Stop(arg1, cb) {
    this.Stop(arg1, cb);
  },
  "RestartInstance": function RestartInstance(arg1, cb) {
    this.RestartInstance(arg1, cb);
  },
  // "StartSystem": function ( arg1, cb) { this.StartSystem(arg1, cb ) },
  // "StopSystem": function ( arg1, cb) { this.StopSystem(arg1, cb ) },
  // "RestartSystem": function ( arg1, cb) { this.RestartSystem(arg1, cb ) },
  "GetSystemInstanceList": function GetSystemInstanceList(arg1, cb) {
    this.GetSystemInstanceList(arg1, cb);
  },
  "ABAPGetSystemWPTable": function ABAPGetSystemWPTable(arg1, cb) {
    this.ABAPGetSystemWPTable(arg1, cb);
  },
  "GetCallstack": function GetCallstack(arg1, cb) {
    this.GetCallstack(arg1, cb);
  },
  "J2EEGetProcessList2": function J2EEGetProcessList2(arg1, cb) {
    this.J2EEGetProcessList2(arg1, cb);
  },
  "J2EEGetThreadList2": function J2EEGetThreadList2(arg1, cb) {
    this.J2EEGetThreadList2(arg1, cb);
  },
  "J2EEGetWebSessionList": function J2EEGetWebSessionList(arg1, cb) {
    this.J2EEGetWebSessionList(arg1, cb);
  },
  "J2EEGetCacheStatistic2": function J2EEGetCacheStatistic2(arg1, cb) {
    this.J2EEGetCacheStatistic2(arg1, cb);
  },
  "J2EEGetVMHeapInfo": function J2EEGetVMHeapInfo(arg1, cb) {
    this.J2EEGetVMHeapInfo(arg1, cb);
  },
  "J2EEGetEJBSessionList": function J2EEGetEJBSessionList(arg1, cb) {
    this.J2EEGetEJBSessionList(arg1, cb);
  },
  "J2EEGetRemoteObjectList": function J2EEGetRemoteObjectList(arg1, cb) {
    this.J2EEGetRemoteObjectList(arg1, cb);
  },
  "J2EEGetClusterMsgList": function J2EEGetClusterMsgList(arg1, cb) {
    this.J2EEGetClusterMsgList(arg1, cb);
  },
  "J2EEGetSharedTableInfo": function J2EEGetSharedTableInfo(arg1, cb) {
    this.J2EEGetSharedTableInfo(arg1, cb);
  },
  "J2EEGetThreadCallStack": function J2EEGetThreadCallStack(arg1, cb) {
    this.J2EEGetThreadCallStack(arg1, cb);
  },
  "J2EEGetThreadTaskStack": function J2EEGetThreadTaskStack(arg1, cb) {
    this.J2EEGetThreadTaskStack(arg1, cb);
  },
  "J2EEGetComponentList": function J2EEGetComponentList(arg1, cb) {
    this.J2EEGetComponentList(arg1, cb);
  },
  "ICMGetThreadList": function ICMGetThreadList(arg1, cb) {
    this.ICMGetThreadList(arg1, cb);
  },
  "ICMGetConnectionList": function ICMGetConnectionList(arg1, cb) {
    this.ICMGetConnectionList(arg1, cb);
  },
  "ICMGetCacheEntries": function ICMGetCacheEntries(arg1, cb) {
    this.ICMGetCacheEntries(arg1, cb);
  },
  "ICMGetProxyConnectionList": function ICMGetProxyConnectionList(arg1, cb) {
    this.ICMGetProxyConnectionList(arg1, cb);
  },
  "WebDispGetServerList": function WebDispGetServerList(arg1, cb) {
    this.WebDispGetServerList(arg1, cb);
  },
  "EnqGetLockTable": function EnqGetLockTable(arg1, cb) {
    this.EnqGetLockTable(arg1, cb);
  },
  "EnqGetStatistic": function EnqGetStatistic(arg1, cb) {
    this.EnqGetStatistic(arg1, cb);
  }
}; // f = function name
// syst = _id, sid
// instance = nr, hostname, features
// t = type
// e = entity id
// c = customer (id + name)
// restricted_kpis = array with for NAK only => to save only these KPIs in prometheus

var sapctrl_process_func = function (err, result, f, syst, instance, t, entity_id
/*, company_id /*,customer*/
, restricted_kpis, rule_id, callback) {
  var that = this;

  if (err) {
    console.error('execution error of (' + f + '@' + syst.sid + ') :' + err && err.body); // delete prmths

    callback();
  } else {
    switch (f) {
      case 'GetAlerts':
      case 'GetAlertTree':
        // console.log('Result of (' + f + '@' + syst.sid + ')= ', result.tree.item);
        var parent = -1;
        var parents_name = [];
        var end_nodes = [];
        var tmp_nodes = [];
        var mte_separator = that.kpiname_separator; // '_'
        // const inactive_state = 'SAPControl-GRAY'

        if (result.tree && result.tree.item) {
          result.tree.item.forEach(function (element) {
            if (element.parent > parent) {
              parents_name.push({
                idx: element.parent,
                name: result.tree.item[element.parent].name,
                status: result.tree.item[element.parent].ActualValue
              });
              var v = element.description.split(' '); // support values with 2 kpis: ex "Size:11280 in 	Used:11232"

              if (v[0].indexOf(':') > 0) {
                v.forEach(function (pair) {
                  var vv = pair.split(':');

                  if (vv.length == 2 && vv[1].match(/[0-9]+(\.[0-9]+)?/g)
                  /* && element.ActualValue != inactive_state */
                  ) {
                      // console.log('1 valid :', vv)
                      tmp_nodes = tmp_nodes.concat([create_node(parents_name, mte_separator, Object.assign(element, {
                        name: element.name + mte_separator + vv[0]
                      }), [vv[1]], t)]);
                    }
                });
              } else {
                // create only valid nodes (that only contains numbers)
                if (v[0].match(/[0-9]+(\.[0-9]+)?/g)
                /* && element.ActualValue != inactive_state */
                ) {
                    tmp_nodes = tmp_nodes.concat([create_node(parents_name, mte_separator, element, [v.reduce(function (acc, cur) {
                      return cur.match(/[0-9]+(\.[0-9]+)?/g) ? acc + cur : acc;
                    }, ''), v[v.length - 1].replace(/\s|[0-9]/g, '', t)] // to support both "12121 23132" => "1212123132" and "1221 MB"
                    )]);
                  } // tmp_nodes = ( v[0].match(/\s+[0-9]+(\.[0-9]+)?/g ) /* && element.ActualValue != inactive_state */ ) ? 
                //     [ create_node(parents_name, mte_separator, element, v) ] : []

              }

              parent = element.parent;
            } else if (element.parent == parent) {
              var _v = element.description.split(' ');

              if (_v[0].indexOf(':') > 0) {
                // console.log( "2. MULTIPLE VALUES :", v)
                // support values with 2 kpis: ex "Size:11280 in 	Used:11232"
                _v.forEach(function (pair) {
                  var vv = pair.split(':');

                  if (vv.length == 2 && vv[1].match(/[0-9]+(\.[0-9]+)?/g)
                  /* && element.ActualValue != inactive_state */
                  ) {
                      tmp_nodes = tmp_nodes.concat([create_node(parents_name, mte_separator, Object.assign(element, {
                        name: element.name + mte_separator + vv[0]
                      }), [vv[1]], t)]);
                    }
                });
              } else {
                // create only valid nodes (that only contains numbers)
                if (_v[0].match(/[0-9]+(\.[0-9]+)?/g)
                /* && element.ActualValue != inactive_state */
                ) {
                    tmp_nodes = tmp_nodes.concat([create_node(parents_name, mte_separator, element, [_v.reduce(function (acc, cur) {
                      return cur.match(/[0-9]+(\.[0-9]+)?/g) ? acc + cur : acc;
                    }, ''), _v[_v.length - 1].replace(/\s|[0-9]/g, '', t)] // to support both "12121 23132" => "1212123132" and "1221 MB"
                    )]);
                  }
              }
            } else {
              // element.parent < parent
              end_nodes = end_nodes.concat(tmp_nodes);
              var i = parents_name.length - 1;

              while (i >= 0 && parents_name[i].idx > element.parent) {
                parents_name.pop();
                i--;
              }

              tmp_nodes = [];
              parent = element.parent;
            }
          }); // console.log('Result of (' + f + '@' + syst.sid + ')= ');
          // end_nodes/*.filter(x=>x.is_valid)*/.forEach(e => console.log(e))

          if (!restricted_kpis || restricted_kpis.length == 0) {
            end_nodes.forEach(function (e) {
              if (e) {
                // original worqloads version
                // var labels = 'instance="'+syst._id+'",sid="'+ syst.sid+'",category="'+ e.category+'",type="'+ e.type+'",entity_id="'+ entity_id+'"'//,hostname="'+ instance.hostname+'"'
                // Scaler with limited labels
                var labels = 'instance="' + syst._id + '",sid="' + syst.sid + '",entity_id="' + entity_id + '",features="' + instance.features + '"'; //,hostname="'+ instance.hostname+'"'

                if (instance.sn != undefined) labels += ',sn="' + instance.sn + '"';
                if (rule_id != undefined) labels += ',rule_id="' + rule_id + '"';
                if (instance.hostname != undefined) labels += ',hostname="' + instance.hostname + '"';
                if (instance.ip_internal != undefined) labels += ',ip_internal="' + instance.ip_internal + '"';
                if (e.filesystem != undefined) labels += ',filesystem="' + e.filesystem + '"';
                if (e.network_int != undefined) labels += ',network_int="' + e.network_int + '"';
                if (e.database != undefined) labels += ',database="' + e.database + '"';
                if (e.db_datafile != undefined) labels += ',db_datafile="' + e.db_datafile + '"';
                that.pushgtw_cli.set('{' + labels + '}', def_kpi_name(that.kpi_prefix_sap, mte_separator, e), e.value, syst._id);
              }
            });
          } else {
            end_nodes.forEach(function (e) {
              if (e) {
                var kpi_name = def_kpi_name(that.kpi_prefix_sap, mte_separator, e);

                if (restricted_kpis.indexOf(kpi_name) >= 0) {
                  // original worqloads version
                  // var labels = 'instance="'+syst._id+'",sid="'+ syst.sid+'",category="'+ e.category+'",type="'+ e.type+'",entity_id="'+ entity_id+'"'//,hostname="'+ instance.hostname+'"'
                  // Scaler with limited labels
                  var labels = 'instance="' + syst._id + '",sid="' + syst.sid + '",entity_id="' + entity_id + '",features="' + instance.features + '"'; //,hostname="'+ instance.hostname+'"'
                  // if (instance.features != undefined) labels += ',features="'+ instance.features +'"'

                  if (instance.sn != undefined) labels += ',sn="' + instance.sn + '"';
                  if (rule_id != undefined) labels += ',rule_id="' + rule_id + '"'; // if (customer != undefined) labels += ',customer="'+ customer.id+'__'+customer.name+'"'

                  if (instance.hostname != undefined) labels += ',hostname="' + instance.hostname + '"';
                  if (instance.ip_internal != undefined) labels += ',ip_internal="' + instance.ip_internal + '"';
                  if (e.filesystem != undefined) labels += ',filesystem="' + e.filesystem + '"';
                  if (e.network_int != undefined) labels += ',network_int="' + e.network_int + '"';
                  if (e.database != undefined) labels += ',database="' + e.database + '"';
                  if (e.db_datafile != undefined) labels += ',db_datafile="' + e.db_datafile + '"';
                  that.pushgtw_cli.set('{' + labels + '}', kpi_name, e.value, syst._id);
                }
              }
            });
          } // console.log('Result of (' + f + '@' + syst.sid + ')= ', end_nodes);

        } // else console.log('non result.tree.item')


        callback();
        break;

      case 'ABAPGetWPTable':
        // ~= SM50 = current instance
        // console.log('Result of (' + f + '@' + syst.sid + ')= ', result.workprocess.item);
        var types = ['dia', 'upd', 'up2', 'enq', 'btc', 'spo'];
        var statuses = ['wait', 'hold', 'run', 'stop', 'ended', 'new', 'down'];
        var res = {};

        var def_kpi_name_ABAPGetWPTable = function def_kpi_name_ABAPGetWPTable(t, elt_Status) {
          if (t.toUpperCase() != 'ALL') {
            return that.kpi_prefix_sap + t.toLowerCase() + '_workprocess_' + elt_Status + '__nb';
          } else {
            return that.kpi_prefix_sap + '_workprocess_' + elt_Status + '__nb';
          }
        }; // init kpi values


        types.forEach(function (ty) {
          statuses.forEach(function (s) {
            res[def_kpi_name_ABAPGetWPTable(t, s)] = res[def_kpi_name_ABAPGetWPTable(t, s)] ? Object.assign({}, res[def_kpi_name_ABAPGetWPTable(t, s)], _defineProperty({}, ty, 0)) : _defineProperty({}, ty, 0);
          });
        });

        if (result.workprocess && result.workprocess.item) {
          result.workprocess.item.forEach(function (i) {
            if (res[def_kpi_name_ABAPGetWPTable(t, i.Status.toLowerCase())] && res[def_kpi_name_ABAPGetWPTable(t, i.Status.toLowerCase())][i.Typ.toLowerCase()] != undefined) {
              res[def_kpi_name_ABAPGetWPTable(t, i.Status.toLowerCase())][i.Typ.toLowerCase()]++;
            } else {
              console.error('not definition for ', def_kpi_name_ABAPGetWPTable(t, i.Status.toLowerCase()));
            }
          });
        }

        var labels = 'instance="' + syst._id + '",sid="' + syst.sid + '",type="' + t + '",entity_id="' + entity_id + '"'; //,hostname="'+ instance.hostname+'"'

        if (instance.hostname != undefined) labels += ',hostname="' + instance.hostname + '"';
        if (instance.ip_internal != undefined) labels += ',ip_internal="' + instance.ip_internal + '"';
        if (instance.sn != undefined) labels += ',sn="' + instance.sn + '"';
        if (rule_id != undefined) labels += ',rule_id="' + rule_id + '"';
        Object.keys(res).forEach(function (k) {
          if (!restricted_kpis || restricted_kpis.length == 0) {
            types.forEach(function (ty) {
              that.pushgtw_cli.set('{' + labels + ',workproces="' + ty + '"}', k, // kpi name
              res[k][ty], // value
              syst._id);
            });
          } else {
            if (restricted_kpis.indexOf(k) >= 0) {
              types.forEach(function (ty) {
                that.pushgtw_cli.set('{' + labels + ',workproces="' + ty + '"}', k, // kpi name
                res[k][ty], // value
                syst._id);
              });
            }
          }
        });
        callback();
        break;

      case 'ABAPGetSystemWPTable':
        // ~= SM66 - all instances
        console.log('Result of (' + f + '@' + syst.sid + ')= ', result.workprocess.item);
        callback();
        break;

      case 'EnqGetStatistic':
        // console.log('Result of (' + f + '@' + syst.sid + ')= ', result);
        var def_kpi_name_EnqGetStatistic = function def_kpi_name_EnqGetStatistic(t) {
          if (t.toLowerCase().match(/.*time$/)) {
            return that.kpi_prefix_sap + 'enqueue_' + t.toLowerCase().replace(/[^a-zA-Z0-9]/g, '_') + '__sec';
          } else {
            return that.kpi_prefix_sap + 'enqueue_' + t.toLowerCase().replace(/[^a-zA-Z0-9]/g, '_') + '__nb';
          }
        };

        var labels = 'instance="' + syst._id + '",sid="' + syst.sid + '",type="' + t + '",company_id="' + company_id + '",entity_id="' + entity_id + '"'; //,hostname="'+ instance.hostname+'"'

        if (instance.features != undefined) labels += ',features="' + instance.features + '"';
        if (instance.hostname != undefined) labels += ',hostname="' + instance.hostname + '"';
        if (instance.ip_internal != undefined) labels += ',ip_internal="' + instance.ip_internal + '"';
        if (instance.sn != undefined) labels += ',sn="' + instance.sn + '"';
        if (rule_id != undefined) labels += ',rule_id="' + rule_id + '"';
        Object.keys(result).forEach(function (key) {
          // console.log(' >>> ' + def_kpi_name_EnqGetStatistic(key) + ' : '+result[key])
          that.pushgtw_cli.set('{' + labels + '}', def_kpi_name_EnqGetStatistic(key), // kpi name
          result[key], // value
          syst._id);
        }); // console.log('Result of (' + f + '@' + s.sid + ')= ', result);

        callback();
        break;

      case 'J2EEGetProcessList2':
      case 'GetProcessList':
        console.log('Result of (' + f + '@' + syst.sid + ')= ', result.process.item);
        callback();
        break;

      case 'J2EEGetComponentList':
      case 'ABAPGetComponentList':
        console.log('Result of (' + f + '@' + syst.sid + ')= ', result.component.item);
        callback();
        break;

      case 'GetQueueStatistic':
        console.log('Result of (' + f + '@' + syst.sid + ')= ', result.queue.item);
        callback();
        break;

      case 'GetVersionInfo':
        console.log('Result of (' + f + '@' + syst.sid + ')= ', result.version.item);
        callback();
        break;

      case 'GetSystemInstanceList':
        console.log('Result of (' + f + '@' + syst.sid + ')= ', result.instance.item);
        callback();
        break;

      case 'J2EEGetClusterMsgList':
        console.log('Result of (' + f + '@' + syst.sid + ')= ', result.msg);
        callback();
        break;

      case 'GetCallstack':
        console.log('Result of (' + f + '@' + syst.sid + ')= ', result.lines.item);
        callback();
        break;

      case 'GetEnvironment':
        console.log('Result of (' + f + '@' + syst.sid + ')= ', result.env.item);
        callback();
        break;

      case 'ICMGetConnectionList':
      case 'ICMGetProxyConnectionList':
        console.log('Result of (' + f + '@' + syst.sid + ')= ', result.connection);
        callback();
        break;

      case 'ICMGetCacheEntries':
        console.log('Result of (' + f + '@' + syst.sid + ')= ', result.entry.item);
        callback();
        break;

      case 'ICMGetThreadList':
        console.log('Result of (' + f + '@' + syst.sid + ')= ', result.thread.item);
        callback();
        break;

      case 'EnqGetLockTable':
        console.log('Result of (' + f + '@' + syst.sid + ')= ', result.lock);
        callback();
        break;

      case 'GetInstanceProperties':
        console.log('Result of (' + f + '@' + syst.sid + ')= ', result.properties.item);
        callback();
        break;

      case 'J2EEGetCacheStatistic2':
        console.log('Result of (' + f + '@' + syst.sid + ')= ', result.cache.item);
        callback();
        break;

      case 'J2EEGetThreadList2':
        console.log('Result of (' + f + '@' + syst.sid + ')= ', result.thread.item);
        callback();
        break;

      case 'J2EEGetSharedTableInfo':
        console.log('Result of (' + f + '@' + syst.sid + ')= ', result.jsf.item);
        callback();
        break;

      case 'J2EEGetVMHeapInfo':
        console.log('Result of (' + f + '@' + syst.sid + ')= ', result.heap.item);
        callback();
        break;

      case 'J2EEGetThreadCallStack':
      case 'J2EEGetThreadTaskStack':
        console.log('Result of (' + f + '@' + syst.sid + ')= ', result.name, ' ', result.lines.items);
        callback();
        break;

      default:
        console.log('Result of (' + f + '@' + syst.sid + ')= ', result);
        callback();
    }
  }
};

var def_kpi_name = function def_kpi_name(kpi_prefix_sap, mte_separator, elt) {
  var new_unit = elt.unit.replace(/\%/g, 'percent').replace(/\//g, '_per_').replace(/\W+/g, '').toLowerCase();
  if (new_unit == '') new_unit = 'nb'; // if (t.toUpperCase() != 'ALL') {
  //   // undefinedabap_CPUundefinedCPU_Utilization__percent
  //   return that.kpi_prefix_sap + t.toLowerCase() +'_' + elt.kpi.replace(/\W+/g, '')+'__'+new_unit
  // } else {

  return kpi_prefix_sap + elt.kpi.replace(/\W+/g, mte_separator) + '__' + new_unit; // }
}; // Function to create the node


var create_node = function create_node(p, sep, e, v, t) {
  var res = {
    value: isNaN(v[0].replace(/\s/g, '')) ? 0 : Math.round(parseInt(v[0].replace(/\s/g, ''))),
    type: t,
    unit: v.length > 1 && v[1] || ''
  };

  if (e.parent > 1 // && result.tree.item[e.parent].ActualValue != inactive_state
  ) {
      // console.log('parents:',p)
      if (p.length >= 2) {
        switch (p[1].name) {
          case 'OperatingSystem':
            if (p.length >= 4) {
              switch (p[2].name) {
                case 'Filesystems':
                  return Object.assign(res, {
                    filesystem: p[3].name,
                    category: 'OperatingSystem',
                    kpi: 'Disk_' + e.name
                  });

                case 'Lan':
                  return Object.assign(res, {
                    network_int: p[3].name,
                    category: 'OperatingSystem',
                    kpi: 'Network_' + e.name
                  });

                default:
                  return Object.assign(res, {
                    category: p[Math.max(p.length - 2, 1)].name,
                    kpi: p.slice(Math.max(p.length - 1, 0), p.length).map(function (x) {
                      return x.name;
                    }).join(sep) + sep + e.name
                  });
              }
            } else {
              return Object.assign(res, {
                category: p[Math.max(p.length - 2, 1)].name,
                kpi: p.slice(Math.max(p.length - 1, 0), p.length).map(function (x) {
                  return x.name;
                }).join(sep) + sep + e.name
              });
            }

          case 'Microsoft SQL Server':
            if (p.length >= 4) {
              switch (p[2].name) {
                case 'Space management':
                  var dbf = p[4].name.split('/').pop();
                  return Object.assign(res, {
                    database: p[3].name.split(':')[1],
                    db_datafile: dbf,
                    category: p[2].name,
                    kpi: e.name.replace(new RegExp(dbf.replace(/(\.[a-z]{3})$/gi, '') + ' ', "gi"), '')
                  });

                case 'Performance':
                  if (p[3].name == 'I/O') {
                    return Object.assign(res, {
                      db_datafile: e.name.substring(21, e.name.length),
                      category: p[2].name,
                      kpi: p[3].name
                    });
                  } else {
                    return Object.assign(res, {
                      category: p[2].name,
                      kpi: p[3].name + sep + e.name //p.slice( Math.max(p.length - 1, 0), p.length ).map(x=>x.name).join(sep) + sep + e.name,

                    });
                  }

                default:
                  return Object.assign(res, {
                    category: p[Math.max(p.length - 2, 1)].name,
                    kpi: p.slice(Math.max(p.length - 1, 0), p.length).map(function (x) {
                      return x.name;
                    }).join(sep) + sep + e.name
                  });
              }
            } else {
              return Object.assign(res, {
                category: p[Math.max(p.length - 2, 1)].name,
                kpi: p.slice(Math.max(p.length - 1, 0), p.length).map(function (x) {
                  return x.name;
                }).join(sep) + sep + e.name
              });
            }

          case 'InstanceAsTask':
          case 'Server Configuration':
            // we only save in promtheus numerical values
            if (v[0].match(/^([0-9]|\s)+(\.[0-9]+)?$/g)) {
              return Object.assign(res, {
                category: p[1].name,
                kpi: p.slice(Math.max(p.length - 1, 0), p.length).map(function (x) {
                  return x.name;
                }).join(sep) + sep + e.name
              });
            }

            break;

          case 'R3Services':
            if (p.length >= 3 && p[2].name == 'ICM') {
              return Object.assign(res, {
                category: 'R3Services',
                kpi: p.slice(Math.max(p.length - 2, 0), p.length).map(function (x) {
                  return x.name;
                }).join(sep) + sep + e.name
              });
            } else {
              return Object.assign(res, {
                category: 'R3Services',
                kpi: p.slice(Math.max(p.length - 1, 0), p.length).map(function (x) {
                  return x.name;
                }).join(sep) + sep + e.name
              });
            }

          default:
            return Object.assign(res, {
              category: p[Math.max(p.length - 2, 1)].name,
              kpi: p.slice(Math.max(p.length - 1, 0), p.length).map(function (x) {
                return x.name;
              }).join(sep) + sep + e.name
            });
        }
      }
      /*else {
          console.log('cas non gere:',e)
      }*/

    } else {
    return null;
  }
};

var sapctrl_helpers = {
	sapcontrol_operations: sapcontrol_operations,
	sapctrl_process_func: sapctrl_process_func
};

/**
 * AWSMng class
 * ==================
 */
// External librairies
// ----------------------------------------------------------------------------   
 // , axios = require('axios')
// , fs = require('fs')
// , moment = require('moment')
// Internal librairies
// -----------------------------------------------------------------------------
// Class definition
// ----------------------------------------------------------------------------
// Constructor


function AWSMng() {
  // console.log('D AWSMng! Constructor begins ')
  var self = this;
  this.ec2 = new awsSdk.EC2({
    apiVersion: '2016-11-15',
    region: 'eu-west-3'
  });
  this.mappings_ip_id = {};
  this._errors = {
    'ec2_not_found': 'No EC2 instance found',
    'credentials_not_loaded': 'AWS credentials keys not loadded',
    'ec2_not_started': 'Error starting EC2 instance',
    'ec2_not_stopped': 'Error stopping EC2 instance'
  };
  awsSdk.config.getCredentials(function (err) {
    if (err) console.error(self._errors.credentials_not_loaded + ':', err.stack); // credentials not loaded
    // else {
    //   console.log("Access key:", AWS.config.credentials.accessKeyId);
    //   console.log("Secret access key:", AWS.config.credentials.secretAccessKey);
    // }
  });
} // Class definition


AWSMng.prototype = {
  Constructor: AWSMng,
  // {
  //     'ip_internal': inst_with_ip && inst_with_ip.ip_internal,
  //     'hostname': x.hostname,
  //     'instancenr': nr,
  //     'features': x.features.split('|'),
  //     'status': x.dispstatus == that._sap_statuses.green ? 1 :
  //       x.dispstatus == that._sap_statuses.yellow ? -1 : 0
  //   }
  // list EC2 instances in same VPC
  // get list of EC2 instances private IP, instance-type, instance-id from subnet & instancetype
  discoverEC2Instances: function discoverEC2Instances(vpc_id, callback) {
    var that = this;
    async.waterfall([function (waterfall_cb) {
      console.log("discoverEC2Instances filter:", vpc_id);
      that.ec2.describeInstances({
        Filters: [{
          Name: "vpc-id",
          Values: [vpc_id]
        }]
      }, waterfall_cb);
    }, function (ec2s, waterfall_cb) {
      if (ec2s && ec2s.Reservations) {
        var list_private_props = ec2s.Reservations.reduce(function (r_acc, r_curr) {
          return r_acc.concat(r_curr.Instances.reduce(function (i_acc, i_curr) {
            i_acc.push({
              "vpc_id": vpc_id,
              "ip_internal": i_curr.PrivateIpAddress,
              "cloud_instance_id": i_curr.InstanceId,
              "cloud_instance_type": i_curr.InstanceType,
              "is_sap": false
            });
            return i_acc;
          }, []));
        }, []);
        waterfall_cb(null, list_private_props);
      } else {
        waterfall_cb('nothing found');
      }
    }, function (list_props, waterfall_cb) {
      async.eachOf(list_props, function (prop, idx, each_cb) {
        var request = http.get('http://' + prop.ip_internal + ':1128/SAPHostControl/?wsdl', {
          timeout: 1000
        }, function (response) {
          if (response && response.statusCode == 200) {
            list_props[idx].is_sap = true;
            each_cb();
          }
        });
        request.on('timeout', request.abort);
        request.on("error", function (e) {
          // console.error('error:', e)
          each_cb();
        });
      }, function (err) {
        waterfall_cb(null, list_props);
      });
    }], function (err, list_private_props) {
      if (err) {
        console.error('E discoverSAPInstances error:', err, list_private_props);
        callback();
      } else {
        console.log('list_private_props:', list_private_props);
        callback(null, list_private_props);
      }
    });
  },
  // get list of EC2 instances private IP, instance-type, instance-id from subnet & instancetype
  getEC2PrivateProps: function getEC2PrivateProps(filters, callback) {
    var self = this;
    async.waterfall([function (waterfall_cb) {
      self.ec2.describeInstances({
        Filters: [{
          Name: "vpc-id",
          Values: [filters.vpc_id]
        } // ,
        // {
        //     Name: "instance-type",
        //     Values: [filters.instance_type]
        // },
        ]
      }, waterfall_cb);
    }, function (ec2s, waterfall_cb) {
      // if (ec2s && ec2s.Reservations && ec2.Reservations[0] && ec2.Reservations[0].Instances && ec2.Reservations[0].Instances[0]) {
      //     waterfall_cb(null, ec2.Reservations[0].Instances[0].InstanceId)
      if (ec2s && ec2s.Reservations) {
        var list_private_props = ec2s.Reservations.reduce(function (r_acc, r_curr) {
          return r_acc.concat(r_curr.Instances.reduce(function (i_acc, i_curr) {
            i_acc.push({
              "ip_internal": i_curr.PrivateIpAddress,
              "cloud_instance_id": i_curr.InstanceId,
              "cloud_instance_type": i_curr.InstanceType
            });
            return i_acc;
          }, []));
        }, []);
        waterfall_cb(null, list_private_props);
      } else {
        waterfall_cb(self._errors.ec2_not_found);
      }
    }], function (err, list_private_props) {
      if (err) {
        console.error('E getEC2ID error:', err, list_private_props);
        callback();
      } else {
        callback(list_private_props);
      }
    });
  },
  isEC2sRunning: function isEC2sRunning(ips, callback) {
    var self = this;
    async.waterfall([function (waterfall_cb) {
      // https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/EC2.html#describeInstanceStatus-property
      self.ec2.describeInstanceStatus({
        // InstanceIds: ids
        InstanceIds: Object.keys(self.mappings_ip_id).filter(function (key_ip) {
          return ips.indexOf(key_ip) >= 0;
        }).map(function (key) {
          return self.mappings_ip_id[key];
        }),
        IncludeAllInstances: true
      }, waterfall_cb);
    }, function (inst_statuses, waterfall_cb) {
      var res_statuses = {};
      inst_statuses.InstanceStatuses.forEach(function (status) {
        res_statuses[status.InstanceId] = status.InstanceState.Code == 16 // 0 : pending, 16 : running, 32 : shutting-down, 48 : terminated, 64 : stopping, 80 : stopped
        && status.InstanceStatus.Status == "ok" && status.SystemStatus.Status == "ok";
      });
      waterfall_cb(null, res_statuses);
    }], function (err, list_instance_status) {
      if (err) {
        console.error('E isEC2sRunning error:', err);
      }

      callback(list_instance_status);
    });
  },
  isEC2Running: function isEC2Running(ip, callback) {
    var self = this;
    self.getEC2ID(ip, function (ec2id) {
      if (ec2id) {
        self.isEC2RunningFromID(ec2id, callback);
      } else {
        console.error(self._errors.ec2_not_found);
        callback();
      }
    });
  },
  isEC2RunningFromID: function isEC2RunningFromID(ec2id, callback) {
    var self = this;
    async.waterfall([function (waterfall_cb) {
      // https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/EC2.html#describeInstanceStatus-property
      self.ec2.describeInstanceStatus({
        // InstanceIds: ids
        InstanceIds: [ec2id],
        IncludeAllInstances: true
      }, waterfall_cb);
    }, function (inst_status, waterfall_cb) {
      if (inst_status.InstanceStatuses && inst_status.InstanceStatuses[0]) {
        // 0 : pending, 16 : running, 32 : shutting-down, 48 : terminated, 64 : stopping, 80 : stopped
        waterfall_cb(null, inst_status.InstanceStatuses[0].InstanceState.Code == 16 && inst_status.InstanceStatuses[0].InstanceStatus.Status == "ok" && inst_status.InstanceStatuses[0].SystemStatus.Status == "ok");
      } else {
        waterfall_cb(self._errors.ec2_not_found);
      }
    }], function (err, instance_status) {
      if (err) {
        console.error('E isEC2RunningFromID error:', err);
      }

      callback(instance_status);
    });
  },
  isEC2Stopped: function isEC2Stopped(ip, callback) {
    var self = this;
    self.getEC2ID(ip, function (ec2id) {
      if (ec2id) {
        self.isEC2StoppedFromID(ec2id, callback);
      } else {
        console.error(self._errors.ec2_not_found);
        callback();
      }
    });
  },
  isEC2StoppedFromID: function isEC2StoppedFromID(ec2id, callback) {
    var self = this;
    async.waterfall([function (waterfall_cb) {
      // https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/EC2.html#describeInstanceStatus-property
      self.ec2.describeInstanceStatus({
        // InstanceIds: ids
        InstanceIds: [ec2id],
        IncludeAllInstances: true
      }, waterfall_cb);
    }, function (inst_status, waterfall_cb) {
      if (inst_status.InstanceStatuses && inst_status.InstanceStatuses[0]) {
        waterfall_cb(null, inst_status.InstanceStatuses[0].InstanceState.Code == 80);
      } else {
        waterfall_cb(self._errors.ec2_not_found);
      }
    }], function (err, instance_status) {
      if (err) {
        console.error('E isEC2StoppedFromID error:', err);
      }

      callback(instance_status);
    });
  },
  // get single ec2 instance from IP
  getEC2ID: function getEC2ID(new_ip, callback) {
    var self = this;

    if (Object.keys(self.mappings_ip_id).indexOf(new_ip) < 0) {
      async.waterfall([function (waterfall_cb) {
        self.ec2.describeInstances({
          Filters: [{
            Name: "private-ip-address",
            Values: [new_ip]
          }]
        }, waterfall_cb);
      }, function (ec2, waterfall_cb) {
        if (ec2 && ec2.Reservations && ec2.Reservations[0] && ec2.Reservations[0].Instances && ec2.Reservations[0].Instances[0]) {
          waterfall_cb(null, ec2.Reservations[0].Instances[0].InstanceId);
        } else {
          waterfall_cb(self._errors.ec2_not_found);
        }
      }], function (err, instance_id) {
        if (err || !instance_id) {
          console.error('E getEC2ID error:', err, instance_id);
          callback();
        } else {
          self.mappings_ip_id[new_ip] = instance_id;
          callback(instance_id);
        }
      });
    } else {
      callback(self.mappings_ip_id[new_ip]);
    }
  },
  // get ec2 instance id & instance type
  // save them in buffer for future quickier accesses
  getEC2ID_Type: function getEC2ID_Type(new_ip, callback) {
    var self = this;
    async.waterfall([function (waterfall_cb) {
      self.ec2.describeInstances({
        Filters: [{
          Name: "private-ip-address",
          Values: [new_ip]
        }]
      }, waterfall_cb);
    }, function (ec2, waterfall_cb) {
      if (ec2 && ec2.Reservations && ec2.Reservations[0] && ec2.Reservations[0].Instances && ec2.Reservations[0].Instances[0]) {
        waterfall_cb(null, ec2.Reservations[0].Instances[0]);
      } else {
        waterfall_cb(self._errors.ec2_not_found);
      }
    }], function (err, instance_details) {
      if (err) {
        console.error('E getEC2ID_Type error', err);
        callback();
      } else {
        self.mappings_ip_id[new_ip] = instance_details.InstanceId;
        callback({
          instance_id: instance_details.InstanceId,
          instance_type: instance_details.InstanceType
        });
      }
    });
  },
  stopEC2: function stopEC2(ip, callback) {
    var self = this; // check first if ec2 instance is already stopped => nothing to do

    self.getEC2ID(ip, function (ec2id) {
      if (ec2id) {
        self.isEC2StoppedFromID(ec2id, function (is_stopped) {
          if (is_stopped) {
            callback();
          } else {
            self.ec2.stopInstances({
              InstanceIds: [ec2id]
            }, function (err) {
              if (err) {
                console.error(self._errors.ec2_not_stopped, err); // if ec2 is already stopped, do not consider it as error

                callback(self._errors.ec2_not_stopped);
              } else callback();
            });
          }
        });
      } else callback(self._errors.ec2_not_stopped);
    });
  },
  startEC2: function startEC2(ip, callback) {
    var self = this;
    self.getEC2ID(ip, function (ec2id) {
      if (ec2id) {
        self.isEC2RunningFromID(ec2id, function (is_running) {
          if (is_running) {
            callback();
          } else {
            self.ec2.startInstances({
              InstanceIds: [ec2id]
            }, function (err) {
              if (err) {
                console.error(self._errors.ec2_not_started, err);
                callback(self._errors.ec2_not_started);
              } else callback();
            });
          }
        });
      } else callback(self._errors.ec2_not_started);
    });
  } // stopEC2s: function (ips, callback) {
  //     var self = this
  //     self.ec2.stopInstances({
  //         InstanceIds: Object.keys(self.mappings_ip_id).filter( (key_ip) => ips.indexOf(key_ip) >= 0 ).map( key => self.mappings_ip_id[key])
  //     }, callback)
  // },
  // startEC2s: function (ips, callback) {
  //     var self = this
  //     self.ec2.startInstances({
  //         InstanceIds: Object.keys(self.mappings_ip_id).filter( (key_ip) => ips.indexOf(key_ip) >= 0 ).map( key => self.mappings_ip_id[key])
  //     }, callback)
  // },
  // getEC2IDs: function (new_ips, callback) {
  //     var self = this
  //     if (new_ips && new_ips.length > 0) {
  //         const dedup_ips = new_ips.filter( i => Object.keys(self.mappings_ip_id).indexOf(i) < 0)
  //         if (dedup_ips.length > 0) {
  //             async.waterfall([
  //                 function(waterfall_cb) {
  //                     self.ec2.describeInstances({
  //                         Filters: [
  //                             {
  //                                 Name: "private-ip-address",
  //                                 Values: dedup_ips
  //                             }
  //                         ]
  //                     }, waterfall_cb)
  //                 },
  //                 function (ec2s, waterfall_cb) {
  //                     const instanceIds = {};
  //                     for (const reservation of ec2s.Reservations) {
  //                         for (const instance of reservation.Instances) {
  //                             instanceIds[ instance.PrivateIpAddress ] = instance.InstanceId 
  //                         }
  //                     }
  //                     waterfall_cb(null, instanceIds)
  //                 }
  //             ], function(err, list_instance_ids) {
  //                 if (err) {
  //                     console.error(' getEC2s error:', err)
  //                 }
  //                 self.mappings_ip_id = Object.assign(self.mappings_ip_id, list_instance_ids)
  //                 callback(list_instance_ids)
  //             })
  //         } else {
  //             callback([])
  //         }
  //     } else {
  //         callback([])
  //     }
  // },
  // Get instance ids by region, state name, private ips v4
  // getEc2InstanceIds: async function (ec2Obj, stateName, ips) {
  //     try {
  //         const filters = [
  //             {
  //                 Name: "instance-state-name",
  //                 Values: [ stateName ]
  //             },
  //             {
  //                 Name: "private-ip-address",
  //                 Values: [ ips ]
  //             }
  //         ];
  //         const ec2Instances = await ec2Obj.describeInstances({
  //             Filters: filters
  //         }).promise();
  //         const instanceIds = [];
  //         for (const reservation of ec2Instances.Reservations) {
  //             for (const instance of reservation.Instances) {
  //                 instanceIds.push(
  //                     instance.InstanceId
  //                     // {
  //                     // id: instance.InstanceId,
  //                     // region: instance.AvailabilityZone
  //                     // }
  //                 )
  //             }
  //         }
  //         return instanceIds;
  //     } catch (e) {
  //         throw e;
  //     }
  // },
  // stopRunningEC2Instances: function (ec2Obj, instanceIds) {
  //     return ec2Obj.stopInstances({
  //         InstanceIds: instanceIds
  //     }).promise();
  // },
  // startStoppedEc2Instances: function (ec2Obj, instanceIds) {
  //     return ec2Obj.startInstances({
  //         InstanceIds: instanceIds
  //     }).promise();
  // },
  // handleStoppingEc2Instances: async function (ips) {
  //     try {
  //         console.log('Stopping instances task started..')
  //         const ec2Obj = new AWS.EC2({apiVersion: '2016-11-15'})
  //         const ec2InstanceIds = await getEc2InstanceIds(ec2Obj, 'running', ips);
  //         console.log(region, ': ', ec2InstanceIds);
  //         if (!ec2InstanceIds || ec2InstanceIds.length === 0) {
  //             console.log('No instance for region ', region);
  //             continue;
  //         }
  //         await stopRunningEC2Instances(ec2Obj, ec2InstanceIds);
  //         console.log('Stopping task completed. Instances: ', ec2InstanceIds, '& Region: ', region);
  //     } catch (e) {
  //         throw e;
  //     }
  // },
  // handleStartingEc2Instances: async function () {
  //     try {
  //         console.log('Starting instances task started..')
  //         for (const region of EC2_REGIONS) {
  //             const ec2Obj = new AWS.EC2({
  //                 region
  //             })
  //             const ec2InstanceIds = await getEc2InstanceIds(ec2Obj, 'stopped', TAGS);
  //             console.log(region, ': ', ec2InstanceIds);
  //             if (!ec2InstanceIds || ec2InstanceIds.length === 0) {
  //                 console.log('No instance for region ', region);
  //                 continue;
  //             }
  //             await startStoppedEc2Instances(ec2Obj, ec2InstanceIds);
  //             console.log('Starting task completed. Instances: ', ec2InstanceIds, ' & Region ', region);
  //         }
  //     } catch (e) {
  //         throw e;
  //     }
  // },
  // exports.handler = async (event) => {
  //     try {
  //         console.log("Received event: ", JSON.stringify(event, null, 2));
  //         if (event.action === 'start') {
  //             await handleStartingEc2Instances();
  //         }
  //         if (event.action === 'stop') {
  //             await handleStoppingEc2Instances();
  //         }
  //         return;
  //     } catch (e) {
  //         throw e;
  //     }
  // }
  // Collect AWS cloud KPI
  // _collect_aws : function (vm, metric) { // AWS collect
  //     var params = {
  //         MetricDataQueries: [ /* required */
  //             {
  //             // Id: 'aiyzeorezlbkAz', /* required */
  //             Id: (vm+metric).replace('-','_'), /* required */
  //             MetricStat: {
  //                 Metric: { /* required */
  //                 Dimensions: [
  //                     {
  //                     Name: 'InstanceId',
  //                     Value: vm
  //                     },
  //                     /* more items */
  //                 ],
  //                 MetricName: metric,
  //                 Namespace: 'AWS/EC2',
  //                 },
  //                 Period: 10, /* required */
  //                 Stat: 'Average', /* required */
  //                 Unit: 'Percent'
  //             },
  //             ReturnData: true 
  //             },
  //             /* more items */
  //         ],
  //         StartTime: moment().add(-10,'m').unix(),
  //         EndTime:  moment().add(-5,'m').unix(),
  //         // StartTime: new Date((new Date).getTime() - 15*60000),
  //         // EndTime:  new Date(),
  //         MaxDatapoints: 10000,
  //         // NextToken: 'STRING_VALUE',
  //         ScanBy: 'TimestampAscending'
  //     };
  //     self.aws.cloudwatch.getMetricData(params, function(err, data) {
  //         if (err) console.log('cloudwatch error: ', err, err.stack); // an error occurred
  //         else {
  //             self.pushgtw_cli.set(
  //                 '{hostname="'+ vm+'"}',
  //                 self._cleanKpiName(metric),
  //                 data.MetricDataResults[0].Values[0],
  //                 vm)
  //         }
  //     });
  //     self.pushgtw_cli.pushInstance(self.cloud_job[self.cloud_type], vm)
  // },

}; // Export the class

var awsmng = AWSMng;

/**
 * Logger class
 * all methods called with .call to get access to __DEBUG__ properties of caller 
 * ===============================================================================
 * that.logger.call(that, that.logger.LOG_LEVEL_ERROR, '' )
 */
// Class definition
// ----------------------------------------------------------------------------
// Constructor
function Logger() {
  var global_log_level = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 1;
  this.global_log_level = global_log_level;
  this.__DEBUG__ = false;
  this.LOG_LEVEL_ERROR = 0;
  this.LOG_LEVEL_MIN = 1; // value by defaut

  this.LOG_LEVEL_INFO = 2;
  this.LOG_LEVEL_DEBUG = 3;
  this.level_letter = ['E', 'M', 'I', 'D'];
  this.separator = ' :';
} // Class definition


Logger.prototype = {
  Constructor: Logger,
  // msg_lvl: number 0,1,2
  // msg: string, object,...
  log: function log(msg_lvl) {
    var self = this;

    function _prefix(lvl) {
      switch (lvl) {
        case self.LOG_LEVEL_ERROR:
          return 'E' + self.separator + new Date().toJSON() + self.separator;

        case self.LOG_LEVEL_MIN:
          return 'M' + self.separator + new Date().toJSON() + self.separator;

        case self.LOG_LEVEL_INFO:
          return 'I' + self.separator + new Date().toJSON() + self.separator;

        case self.LOG_LEVEL_DEBUG:
          return 'D' + self.separator + new Date().toJSON() + // self.separator +
          // __function +
          // self.separator +
          // __line +
          self.separator;

        default:
          return '';
      }
    } // display log msg only if msg level has a lesser/equal verbosity than global log level *OR* DEBUG mode is activated


    if (msg_lvl <= self.global_log_level || self.__DEBUG__) {
      Array.prototype.splice.call(arguments, 0, 1, _prefix(msg_lvl));
      console.log.apply(null, Array.prototype.slice.call(arguments));
    }
  },
  debug: function debug(on_off) {
    console.log("I switching debug mode " + on_off ? 'ON' : 'OFF');
    this.__DEBUG__ = on_off;
  }
}; // Export the class

var logger = Logger;

var rdscmds = {
  "APPEND": "r32efa73bcdf4efd261c9",
  "ASKING": "r53eebe4bcfc8e4e11765",
  "AUTH": "r59166c85971605a74b9e",
  "BGREWRITEAOF": "r977f34a23a4c7dafd711",
  "BGSAVE": "r8fbddd3ad25e66b66d75",
  "BITCOUNT": "rf831452f1b8c742fead0",
  "BITFIELD": "re8eece2435bbe0e78f2b",
  "BITOP": "rc70c916b6592c27704df",
  "BITPOS": "rddf7c86738135cc9feba",
  "BLPOP": "r8a385ea327ece206db01",
  "BRPOP": "r8bc260d6056d562c74a7",
  "BRPOPLPUSH": "r4cedfdedff04f42371a3",
  "BZPOPMAX": "r6c05150afc9c97508dea",
  "BZPOPMIN": "raceb1f507d73610d4985",
  "CLIENT": "re2a09ccb04375117069c",
  "CLUSTER": "rfc57ce1d5fc7792fcebe",
  "COMMAND": "raa9c88633a52a77fde21",
  "CONFIG": "r690921766564cc95c40e",
  "DBSIZE": "rcbeb52e1c23cbce73346",
  "DEBUG": "r792c05a3f02afc263c5a",
  "DECR": "r5d395572d2daf94d0ee2",
  "DECRBY": "rdae4b6632805cde75d91",
  "DEL": "r332cd69dadab050c7e03",
  "DISCARD": "re59cb5e280e1e0b44c4a",
  "DUMP": "rd1e8793e1e910c6d0f9c",
  "ECHO": "r5fa62eac76fca09570cb",
  "EVAL": "r6cd6ed29c886ed30605c",
  "EVALSHA": "r590bf147ef64eeafadb3",
  "EXEC": "r50e64b10cdf172df702f",
  "EXISTS": "r190450cc6f31a91a63d9",
  "EXPIRE": "r361b458eef37bcfd1026",
  "EXPIREAT": "r9d9e6e7398c8824e81b3",
  "FLUSHALL": "r2b778d94531380c958ef",
  "FLUSHDB": "r7ac5719dddcd6cfe5f47",
  "GEOADD": "rb05c9f7bc67b56220cd1",
  "GEODIST": "r03fc230a0569c81dd3b9",
  "GEOHASH": "r5f50370755f8497cd69c",
  "GEOPOS": "rb4ef150604770a802c7d",
  "GEORADIUS": "rb6e830dd1ea871ad8899",
  "GEORADIUS_RO": "r81ab714c7e51fc02a633",
  "GEORADIUSBYMEMBER": "r9bae614fb830de88a71d",
  "GEORADIUSBYMEMBER_RO": "r657cbd37fc1f0469a93f",
  "GET": "r99d13cf3716dbb9bec98",
  "GETBIT": "r3da7e567487bbe4f3fa4",
  "GETRANGE": "r82088db4b59f4aaea8b5",
  "GETSET": "r35ec33085df5762700a0",
  "HDEL": "rb038a9a2c15d45bbcb04",
  "HEXISTS": "re920bcf404cb8d2e36f2",
  "HGET": "rbcf42cf954a8b1ab485b",
  "HGETALL": "rffadbacb14fad0388ee5",
  "HINCRBY": "r327ab1a623b81f16bb28",
  "HINCRBYFLOAT": "r7cefea74fb6a6b3ba2fe",
  "HKEYS": "r53b4eb6eeef131884a85",
  "HLEN": "r44515715af21b234f6e9",
  "HMGET": "r82c436ecec51222acaee",
  "HMSET": "r6271d85d7ea5c2016537",
  "HOST:": "r1fcaba9bdf50c7f3ffae",
  "HSCAN": "r27823c02ac78c807f5de",
  "HSET": "raf8f5c1c0382364207d5",
  "HSETNX": "rcf1d727056f77b00d328",
  "HSTRLEN": "r9870d5e052ce6f50f908",
  "HVALS": "re9c03ba5a6cf356f87c9",
  "INCR": "rdbf17cc155ced91fa2c0",
  "INCRBY": "rd81305f10db800bfa71f",
  "INCRBYFLOAT": "rf0fe0a692443ce6dcc3d",
  "INFO": "r6a775f58d6096e8f3fee",
  "KEYS": "r7c58fc41ca7901f7d01e",
  "LASTSAVE": "r8b0e6f19ee35972b7bac",
  "LATENCY": "r42cda9d2b8d1e2ca5c5b",
  "LINDEX": "r265a148ef5bd3d04ca07",
  "LINSERT": "rc435f687bffdc6d17d11",
  "LLEN": "r9c3618e5fb721740773c",
  "LOLWUT": "r90958e8cf18c41945d6b",
  "LPOP": "rc5429e6293709c0143b6",
  "LPUSH": "r4162b7460866dd16e593",
  "LPUSHX": "r92cae2d1732a92c30110",
  "LRANGE": "r734f34a9c8d198a1765c",
  "LREM": "rbb0a9b910059520d314a",
  "LSET": "r55bee04c50e70d63d98d",
  "LTRIM": "ra636956dad6e6dd5e5c9",
  "MEMORY": "r83341d366fbbd3dd725e",
  "MGET": "r963139d81e76a1db74a4",
  "MIGRATE": "r0818532768d5ac4c862b",
  "MODULE": "re7c8da36761c7429a194",
  "MONITOR": "rd8d5b640eea865041c93",
  "MOVE": "r5130ec262e8001c71b63",
  "MSET": "r37e0b9632995c39bb6dd",
  "MSETNX": "rb7a007dae35fc36db7f0",
  "MULTI": "r0ea46cead6ed2044d5e6",
  "OBJECT": "r1de45da792a8697130be",
  "PERSIST": "ra08cadce511ff197b26d",
  "PEXPIRE": "rfb5df2a2440192201d3f",
  "PEXPIREAT": "r57a0a2089cded3b4fff7",
  "PFADD": "rbfe1f1651b51d67bc74b",
  "PFCOUNT": "rd0074482b0529cb32e0f",
  "PFDEBUG": "rce36a026a223ead06904",
  "PFMERGE": "r2939bbb672a85e65a35a",
  "PFSELFTEST": "r8f375412da87e131abcb",
  "PING": "r8e880d60fadc492c52d0",
  "POST": "rce0128b3a37d805eed4a",
  "PSETEX": "rd0b5a0532e73176b6ec2",
  "PSUBSCRIBE": "ra3febaf705f0b3e94b08",
  "PSYNC": "r709dfa29ed094128337b",
  "PTTL": "r82f51da34fd4e64cd7d2",
  "PUBLISH": "r652fea692b19d3b13951",
  "PUBSUB": "r3e122758d5252afdf301",
  "PUNSUBSCRIBE": "rc1636d9b64ba1c7d299a",
  "RANDOMKEY": "r12a38cb3bcb8143e656b",
  "READONLY": "r22cc19f9bd86c420755c",
  "READWRITE": "rce322cd74d5847a2a37f",
  "RENAME": "r9066a7800a292a1904c6",
  "RENAMENX": "r2dcb924dc3c52eaf4326",
  "REPLCONF": "rfbbd3f86069568d629ad",
  "REPLICAOF": "re43358b5f71bf7b9b33a",
  "RESTORE": "r5c35935afbc4ecb59f54",
  "RESTORE-ASKING": "r0491b9fc7fc0c1ed612a",
  "ROLE": "r59f9520cfd70ae9f2dac",
  "RPOP": "rbbdd4ae591afa6c96866",
  "RPOPLPUSH": "r63a325a6fc9cd7455ee7",
  "RPUSH": "r4b45792fb7e0ea8585f8",
  "RPUSHX": "r5507a87adb9a843814b8",
  "SADD": "r91342b9fa4eab746dc3c",
  "SAVE": "ra1be4ede3f473d907098",
  "SCAN": "r569298b21c9637769832",
  "SCARD": "r4c77e11f61d1fde79248",
  "SCRIPT": "rce153ab447ff78bb63bd",
  "SDIFF": "r0c3af3d708a2987a660b",
  "SDIFFSTORE": "r5192532048d831a95037",
  "SELECT": "r1a2fb16f5a163921d090",
  "SET": "r1474d7fbb9a7324bfe8b",
  "SETBIT": "rbbee446c0ca0e678607a",
  "SETEX": "r46e57e1c52332b5a5a99",
  "SETNX": "r0f6b51f5c3e0dc6a5333",
  "SETRANGE": "rab56e993495f87e82568",
  "SHUTDOWN": "rd28064b1b6a02e83d69f",
  "SINTER": "r040dab23af4510e7149f",
  "SINTERSTORE": "r345da673d33003cbcd34",
  "SISMEMBER": "re9edaf9af49dedd76dc0",
  "SLAVEOF": "r72fd174d37c08265e5c1",
  "SLOWLOG": "r437d51923772d10e4f97",
  "SMEMBERS": "r1edcd9984a6482302f84",
  "SMOVE": "rb012f694f06baded5843",
  "SORT": "rd52fed8963807907af5b",
  "SPOP": "r7296cee0472b5c42a056",
  "SRANDMEMBER": "r4834b22bf2e167eec413",
  "SREM": "r45b2cebbd4d7206037ff",
  "SSCAN": "r0337b93f18e636174af5",
  "STRLEN": "r3731b868ab6a189fad20",
  "SUBSCRIBE": "re1cbdcb73780e3bdfb36",
  "SUBSTR": "r210d71a176f50c7d0d0d",
  "SUNION": "r7d72640cccaa75eaf713",
  "SUNIONSTORE": "r7cb8a66e6f7d1a2d81dc",
  "SWAPDB": "r8115b24806a99207caa4",
  "SYNC": "r28ac155def5413926a04",
  "TIME": "r4a905c628adb036f5ebc",
  "TOUCH": "r436d44a1adf050f0b97e",
  "TTL": "r083b2fc6cba07dbf4688",
  "TYPE": "rbceb4ef80d4607215929",
  "UNLINK": "r4c95fa093bc7d290fced",
  "UNSUBSCRIBE": "r421bbad7bcce86124109",
  "UNWATCH": "r27ba8feb2c4c546a4152",
  "WAIT": "rf80e88ba805e079b3e78",
  "WATCH": "r84e26868c42700105908",
  "XACK": "r03ee55b42ebdc2c18a81",
  "XADD": "r23bee686be5fda753179",
  "XCLAIM": "r77e4c1a01c6c040cd3ca",
  "XDEL": "r50623b529d52cc31023e",
  "XGROUP": "r4fb8652508296ac45931",
  "XINFO": "r5edea82e53e6ce3cb66d",
  "XLEN": "r841df2001c1ae836aaaa",
  "XPENDING": "r529f3a179b1611ff66ca",
  "XRANGE": "re231794108ea049c510b",
  "XREAD": "rac4f2bb8c900b7a4588b",
  "XREADGROUP": "rd2da0178505f01ac6a56",
  "XREVRANGE": "r6bb54153c3cd0e34ef79",
  "XSETID": "rf041428ca117772f3c65",
  "XTRIM": "ra63c6d1f016107b0abcf",
  "ZADD": "rb5336953a9773c4fdc85",
  "ZCARD": "rd4fcf8328ecbd58596b0",
  "ZCOUNT": "rf9db5f6d644bd379ea77",
  "ZINCRBY": "r763956de8cf90a3cf1a8",
  "ZINTERSTORE": "r9f9daf2c0f512192f12e",
  "ZLEXCOUNT": "r335ac0fada359dc2a168",
  "ZPOPMAX": "ref0b5cdf20e3d8e2c56f",
  "ZPOPMIN": "r4ff46d82c7ee5abddf08",
  "ZRANGE": "r3dd3add7a10f8e1a3fd5",
  "ZRANGEBYLEX": "r66c704c25f2db6ac805c",
  "ZRANGEBYSCORE": "r85011b7d9cfd9bfc465c",
  "ZRANK": "r2443efd44b6a1ed32cea",
  "ZREM": "raa23ccab68c12c7d94ed",
  "ZREMRANGEBYLEX": "r23d9446a001853d37fc1",
  "ZREMRANGEBYRANK": "r9092c8b2288a642d30a8",
  "ZREMRANGEBYSCORE": "r991f6fd4cdd5c01d11ee",
  "ZREVRANGE": "r46a607ebca2880de70b9",
  "ZREVRANGEBYLEX": "rfc2f355901f83dbc6f32",
  "ZREVRANGEBYSCORE": "re3911909956e43ffcbb7",
  "ZREVRANK": "r10377ca91782901d471c",
  "ZSCAN": "rcd25f69d8b71238c4f89",
  "ZSCORE": "r07b493479fe344b5cf11",
  "ZUNIONSTORE": "r3582a8e329efcb4b3c35"
};

function _toConsumableArray(arr) { return _arrayWithoutHoles(arr) || _iterableToArray(arr) || _unsupportedIterableToArray(arr) || _nonIterableSpread(); }

function _nonIterableSpread() { throw new TypeError("Invalid attempt to spread non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }

function _unsupportedIterableToArray(o, minLen) { if (!o) return; if (typeof o === "string") return _arrayLikeToArray(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(o); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen); }

function _iterableToArray(iter) { if (typeof Symbol !== "undefined" && Symbol.iterator in Object(iter)) return Array.from(iter); }

function _arrayWithoutHoles(arr) { if (Array.isArray(arr)) return _arrayLikeToArray(arr); }

function _arrayLikeToArray(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) { arr2[i] = arr[i]; } return arr2; }

/**
 * Scale Doer class
 * ==================
 */
// External librairies
// ----------------------------------------------------------------------------
var sapcontrol_operations$1 = sapctrl_helpers.sapcontrol_operations,
    sapctrl_process_func$1 = sapctrl_helpers.sapctrl_process_func; // Debug memory leak
// var heapdump = require('heapdump');
// TODO : create pool of SOAP connections!
// Class definition
// ----------------------------------------------------------------------------
// Constructor


function ScaleDoer() {
  // Internal attributes
  // Kue queue
  this.queue = null;
  this.QUEUES = {};
  this.company = '';
  this.region = '';
  this.concurrency_nb = 1; // keeps tracks if SSL keys needs to be resent from Scaler

  this.sending_sslcertifs = {}; // SAP connection retries before considering NOK

  this.conn_retries = {};
  this.conn_retries_max = 3;
  this.conn_retries_delay_msec = 40000; // 40 sec
  // buffer that keeps track of SAP instance to scale (stop / start) with transition state (being stopped status = 2, being started status = 3)

  this.updated_system_instances = {}; // SAP instances limits

  this.min_instance_running = 1;
  this.max_instance_running = 10;
  this.kpiname_separator = '_';
  this.kpi_prefix_sap = 'sap' + this.kpiname_separator;
  this._sap_statuses = {
    'green': 'SAPControl-GREEN',
    'yellow': 'SAPControl-YELLOW',
    'red': 'SAPControl-RED',
    'gray': 'SAPControl-GRAY'
  }; // known errors

  this._errors = {
    'soap_client_init': 'SOAP client could not be created',
    'soap_client_getinstance': 'Error getting instance list',
    'conn_failed': 'Connection to SAP system failed',
    'ws_not_reachable': 'SAP control WS not reachable',
    'no_system_conn': 'No SAP system or no system connection active',
    'no_active_instance': 'No active SAP instance available',
    'stop_ongoing': 'Stop SAP instance already ongoing',
    'start_ongoing': 'Start eligible system instance already ongoing',
    'no_start_candidate': 'No eligible system instance to be started',
    'min_instances_reached': 'Minimal running instances reached',
    'max_instances_reached': 'Maximal autorized running instances reached'
  }; // fault tolerant

  this._resume_on_step = {
    stop: {
      begin: 1,
      counter_updated: 2,
      sap_stop_triggered: 3,
      ec2_stop_triggered: 4
    },
    start: {
      begin: 1,
      counter_updated: 2,
      ec2_start_triggered: 3,
      sap_start_triggered: 4
    }
  }; // directory of sap systems certificates for sap ctrl authentification

  this.certif_dir = __dirname + '/.keys'; // Other API components

  this.aws_cli = new awsmng(); // Redis client

  this.redis_cli = null; // Pushgateway client

  this.pushgtw_cli = null;
  this.gateway_creds = null;
  this.logger = new logger(); // todo: to deactivate in prod

  this.logger.debug(true);
  this.cronjob = cron.CronJob;
} // Class definition


ScaleDoer.prototype = {
  Constructor: ScaleDoer,
  // init : function (redis_config, worker_config, next) {
  init: function init(local_config, next) {
    var that = this; // Load from company id from config file

    that.company = local_config.company;
    that.agent = local_config.agent; // App version from config file

    that.version = local_config.version; // App staging from config file

    that.staging = local_config.staging || 'production';
    that.QUEUES = {
      'collect_exec': 'COLLECT' + '_' + that.staging + '_' + that.agent,
      'checkconn_exec': 'CHECK' + '_' + that.agent,
      'discover_exec': 'DISCOVER' + '_' + that.agent,
      'webhook_exec': 'DO' + '_' + that.agent
    };
    that.gateway_creds = local_config.gateway.credentials; // Load from nb workers from config file

    that.concurrency_nb = local_config.nb_workers; // load redis conf

    that.redis_conf = local_config.db;
    that.logger.log(that.logger.LOG_LEVEL_INFO, "ScaleDoer init start");
    that.logger.log(that.logger.LOG_LEVEL_DEBUG, "company:" + that.company + " version:" + that.version + " staging:" + that.staging);
    async.parallel([// get region
    function (parallel_cb) {
      that.get_cloud_region.call(that, parallel_cb);
    }, // host: 'scaling.worqloads.com',
    // port: 3333,
    // key: 'd843eb7ba29c64ae4f541605e1b621262f91c2b89bd8ffeb4cf91e7470b971d2be51531b8aac2308d9f0624357dfed40ffed0f8d7dfbda6a7c240174cfa475d46fdeb20f4f30ae3c',
    // Initialize queue for engines communications
    function (parallel_cb) {
      that.redis_cli = redis.createClient(Object.assign(that.redis_conf, {
        prefix: 'q',
        db: 2,
        password: decrypt(that.redis_conf.key, that.company + that.gateway_creds.replace(':', '')),
        rename_commands: rdscmds
      })); // console.log('redis_cli :', that.redis_cli)

      that.redis_cli.on("error", function (err) {
        that.logger.log(that.logger.LOG_LEVEL_ERROR, 'Oops redis client error:' + err.code + ' - ' + err.command + ' - ' + err.origin);
      }); // that.redis_cli.on('connect', function () {
      //   console.log('redis_cli connected')
      // })

      that.queue = kue.createQueue({
        prefix: 'q',
        redis: Object.assign(that.redis_conf, {
          'auth': decrypt(that.redis_conf.key, that.company + that.gateway_creds.replace(':', '')),
          'db': local_config.dbindex,
          'options': {
            'rename_commands': rdscmds
          }
        })
      }); // console.log("that.queue:", that.queue)

      that.queue.watchStuckJobs(); // Prevent inconsistency if redis connection lost

      that.queue.setMaxListeners(that.concurrency_nb * 2);
      that.queue.on('error', function (err) {
        that.logger.log(that.logger.LOG_LEVEL_ERROR, 'Oops redis queue error:' + err.code + ' - ' + err.command + ' - ' + err.origin); // that.logger.log(that.logger.LOG_LEVEL_ERROR, 'Configuration used:', Object.assign(local_config.db, { 'db': local_config.dbindex, 'auth': '****' }))
      });
      parallel_cb();
    }, // create WQL gateway endpoint
    function (parallel_cb) {
      that.pushgtw_cli = new pushcli(local_config.gateway.protocole + '://' + (local_config.gateway.credentials ? local_config.gateway.credentials + '@' : '') + local_config.gateway.host + ':' + local_config.gateway.port + '/pshgtw', that.version, that.staging);
      parallel_cb();
    }, // check for local SSL key dir existence, create if needed
    function (parallel_cb) {
      if (!fs$1.existsSync(that.certif_dir)) {
        fs$1.mkdirSync(that.certif_dir);
      }

      parallel_cb();
    }], function () {
      that.logger.log(that.logger.LOG_LEVEL_INFO, "ScaleDoer init completed with queues:", that.QUEUES);
      next.call(that);
    });
  },
  // Delete last pushed metrics in Prometheus without check on retries
  // param instances = [{instancenr:...., status:...}]
  deletePrometheus: function deletePrometheus(job, entity_id, syst_id, sap_id, instances) {
    var that = this;

    if (that.conn_retries[syst_id] == undefined) {
      that.conn_retries[syst_id] = 0;
    }

    that.logger.log(that.logger.LOG_LEVEL_INFO, "pshgtw:" + syst_id + ": delete '" + job + "' timeserie data, set status=0 'up' timeserie"); //Delete all metrics for jobName & instance

    that.pushgtw_cli.delSerie(job, {
      instance: syst_id
    }); // Update SAP Up status
    // that.pushgtw_cli.pushUpInstance('up', entity_id, syst_id, that.region, sap_id, 0)
    // Update SAP instances Up statuses

    that.pushgtw_cli.pushUpSAPInstance('up', entity_id, syst_id, that.region, sap_id, instances.map(function (i) {
      return Object.assign(i, {
        status: 0
      });
    })); // reset counter

    that.conn_retries[syst_id] = 0;
  },
  // create a sap client and provides it to the callback function
  new_soap_client: function new_soap_client(url, auth, data, cb) {
    var that = this;

    try {
      soap.createClient(url + '?wsdl', {
        returnFault: true
      }, function (err, client) {
        if (err || !client) {
          that.logger.log(that.logger.LOG_LEVEL_DEBUG, "Error connecting to WSDL :" + url + '?wsdl');
          cb(that._errors.soap_client_init, data);
        } else {
          switch (auth.method) {
            case 0:
              client.setSecurity(new soap.BasicAuthSecurity(auth.options[0].user, auth.options[0].pwd));
              break;

            case 1:
              client.setSecurity(new soap.ClientSSLSecurityPFX(auth.options[1].pfx, null, {
                rejectUnauthorized: false
              }));
              break;

            default:
              client.setSecurity(new soap.ClientSSLSecurityPFX(auth.options[1].pfx, null, {
                rejectUnauthorized: false
              }));
          }

          client.setEndpoint(url + 'SAPControl.cgi');
          cb(null, {
            soapcli: client,
            payload: data
          });
        }
      });
    } catch (e) {
      if (e) {
        that.logger.log(that.logger.LOG_LEVEL_ERROR, "SOAP client init exception:", e);
        cb(that._errors.soap_client_init, data);
      }
    }
  },
  // find sap instances nr + hostname of SAP system (ip, nr)
  get_sap_instances_nr: function get_sap_instances_nr(ip, nr, cb) {
    var that = this;
    var url = 'https://' + ip + ':5' + nr + '14';

    try {
      soap.createClient(url + '/?wsdl', {
        returnFault: true
      }, function (err, client) {
        if (err || !client) {
          cb(that._errors.soap_client_init, []);
        } else {
          client.GetSystemInstanceList({}, function (err, result) {
            if (!err && result && result.instance && result.instance.item) {
              var instances_list = result.instance.item.map(function (x) {
                var nr = ('' + x.instanceNr).padStart(2, '0');
                return {
                  'hostname': x.hostname,
                  'instancenr': nr,
                  'features': x.features.split('|'),
                  'status': x.dispstatus == that._sap_statuses.green ? 1 : x.dispstatus == that._sap_statuses.yellow ? -1 : 0
                };
              });
              cb(null, instances_list);
            } else {
              cb(that._errors.soap_client_getinstance, []);
            }
          });
        }
      });
    } catch (e) {
      if (e) {
        that.logger.log(that.logger.LOG_LEVEL_ERROR, "check_sapcontrol_listening: SOAP client init exception:", e);
      }

      cb(that._errors.soap_client_getinstance, []);
    }
  },
  // create a sap client and provides it to the callback function
  check_sapcontrol_listening: function check_sapcontrol_listening(ip, nr, di_hostname, cb) {
    var that = this;

    try {
      var request = http.get('http://' + ip + ':5' + nr + '13/?wsdl', {
        timeout: 1000
      }, function (response) {
        that.logger.log(that.logger.LOG_LEVEL_DEBUG, ' WSDL of ' + ip + ':' + nr, response.statusCode);

        if (response && response.statusCode == 200) {
          var url = 'https://' + ip + ':5' + nr + '14';
          soap.createClient(url + '/?wsdl', {
            returnFault: true
          }, function (err, client) {
            if (err || !client) {
              cb(false);
            } else {
              client.GetSystemInstanceList({}, function (err, result) {
                if (!err && result && result.instance && result.instance.item) {
                  cb(result.instance.item.map(function (x) {
                    return x.hostname;
                  }).includes(di_hostname));
                } else {
                  cb(false);
                }
              }, {
                timeout: 2000
              });
            }
          });
        }
      });
      request.on('timeout', function () {
        request.abort();
      });
      request.on("error", function (e) {
        that.logger.log(that.logger.LOG_LEVEL_DEBUG, ' WSDL checking error of ' + ip + ':' + nr, e);
        cb(false);
      });
    } catch (e) {
      if (e) {
        that.logger.log(that.logger.LOG_LEVEL_ERROR, "check_sapcontrol_listening: SOAP client init exception:", e);
      }

      cb(false);
    }
  },
  // create SSL key onf FS from data provided by scaler
  update_sending_ssl: function update_sending_ssl(system_id, pfx_buffer, callback) {
    var that = this;

    if (system_id) {
      // look for system_id file = certif
      fs$1.access(that.certif_dir + '/' + system_id + '.pfx', fs$1.F_OK, function (err) {
        if (err) {
          // certif does not exists at file level
          if (pfx_buffer) {
            fs$1.writeFile(that.certif_dir + '/' + system_id + '.pfx', new Buffer.from(JSON.parse(pfx_buffer)), function (err) {
              that.sending_sslcertifs[system_id] = !!err;
              callback();
            });
          } else {
            that.logger.log(that.logger.LOG_LEVEL_ERROR, "SSL Keys not provided for " + system_id);
            that.sending_sslcertifs[system_id] = true;
            callback('no pfx provided');
          }
        } else {
          that.sending_sslcertifs[system_id] = false;
          callback();
        }
      });
    } else callback('no system provided');
  },
  // - connect to a SAP system using sapcontrol WS and execute function 'execute_in_sap' on all its dialog instances
  //    execute_in_sap : function( client, all_instances, callback )
  // - update status for system & instances on prometheus
  connect_sap: function connect_sap(job_data, execute_in_sap, cb_next) {
    var that = this; // to prevent error for self signed certificates of SAP systems

    process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
    that.logger.log(that.logger.LOG_LEVEL_DEBUG, '[PENDING] {' + job_data.system.syst_id + '} connect sap');
    async.waterfall([// check system certificate
    function (cb) {
      // that.logger.log(that.logger.LOG_LEVEL_DEBUG, 'check system certificate')
      // cb returns nothing
      that.update_sending_ssl(job_data.system.syst_id, job_data.keys_buff, cb);
    }, // connect to the entry point instance and provide soapclient
    function (cb) {
      // that.logger.log(that.logger.LOG_LEVEL_DEBUG, ' connect to the entry point instance and provide soapclient for :', job_data.system)
      var http_s = job_data.system.is_encrypted ? {
        protocol: 'https',
        port_suffix: '14'
      } : {
        protocol: 'http',
        port_suffix: '13'
      };
      var soap_url = http_s.protocol + '://' + (job_data.system.ip_internal || job_data.system.hostname) + ':5' + job_data.system.sn + http_s.port_suffix + '/';
      that.logger.log(that.logger.LOG_LEVEL_DEBUG, ' connect to the entry point instance and provide soapclient for :', soap_url);
      that.pushgtw_cli.addInstance(job_data.system.syst_id);
      that.new_soap_client(soap_url, {
        method: job_data.system.auth_method,
        // method is the index of options
        options: [{
          user: job_data.system.username,
          pwd: job_data.system.password
        }, {
          pfx: job_data.system.auth_method == 1 && that.certif_dir + '/' + job_data.system.syst_id + '.pfx'
        }]
      }, job_data, cb);
    }, // Get list of instances and check system status
    function (cli_data, cb) {
      // that.logger.log(that.logger.LOG_LEVEL_DEBUG, job_data.system.syst_id + ' get list of instances and check system status')
      cli_data.soapcli.GetSystemInstanceList({}, function (err, result) {
        if (!err && result && result.instance && result.instance.item) {
          var instances_list = result.instance.item.map(function (x) {
            var nr = ('' + x.instanceNr).padStart(2, '0');
            var inst_with_ip = job_data.system.instances.find(function (i) {
              return i.instancenr == nr;
            });
            return {
              'ip_internal': inst_with_ip && inst_with_ip.ip_internal,
              'hostname': x.hostname,
              'instancenr': nr,
              'features': x.features.split('|'),
              'status': x.dispstatus == that._sap_statuses.green ? 1 : x.dispstatus == that._sap_statuses.yellow ? -1 : 0
            };
          }); // update up status for system, delete if not up

          var syst_status = that.check_system_status(result.instance.item);

          if (syst_status == that._sap_statuses.red || syst_status == that._sap_statuses.gray) {
            cb(that._errors.conn_failed, cli_data.soapcli);
          } else {
            that.pushgtw_cli.pushUpInstance('up', job_data.entity_id, job_data.system.syst_id, that.region, job_data.system.sid, 1);
            that.conn_retries[job_data.system.syst_id] = 0; // provide list of active instances for KPI collections

            cb(null, instances_list, job_data.system.auth_method, job_data.system.username, job_data.system.password, job_data.system.auth_method == 1 ? that.certif_dir + '/' + job_data.system.syst_id + '.pfx' : null, {
              'is_encrypted': job_data.system.is_encrypted,
              'is_direct': job_data.system.is_direct
            }, job_data);
          } // })

        } else {
          cb(that._errors.ws_not_reachable, err && err.address + ' ' + err.port);
        }
      });
    }, // connect to the all instances and execute the requested functions / web methods
    function (all_instances, auth_method, username, password, pfx_certif, conn, results, cb) {
      that.logger.log(that.logger.LOG_LEVEL_DEBUG, '{' + job_data.system.syst_id + '} instances:' + all_instances.map(function (i) {
        return i.ip_internal + '|' + i.hostname + '/' + i.instancenr + '/' + i.status;
      }).join(', '));
      var soap_clients = [];

      if (!all_instances || all_instances.filter(function (x) {
        return x.status == 1 && x.features.indexOf('MESSAGESERVER') < 0 && x.features.indexOf('ENQUE') < 0;
      }).length == 0) {
        that.pushgtw_cli.pushInstance('scale', results.system.syst_id);
        cb(that._errors.no_active_instance);
      } else {
        // loop through running dialog instances
        async.eachOf(all_instances.filter(function (x) {
          return x.status == 1 && x.features.indexOf('MESSAGESERVER') < 0 && x.features.indexOf('ENQUE') < 0;
        }), function (inst, idx, callback) {
          var http_s = conn.is_encrypted ? {
            protocol: 'https',
            port_suffix: '14'
          } : {
            protocol: 'http',
            port_suffix: '13'
          };
          var soap_url = http_s.protocol + '://' + (inst.ip_internal || inst.hostname) + ':5' + inst.instancenr + http_s.port_suffix + '/';
          that.new_soap_client(soap_url, {
            method: auth_method,
            // method is the index of options
            options: [{
              user: username,
              pwd: password
            }, {
              pfx: pfx_certif
            }]
          }, null, function (soap_err, client) {
            if (soap_err) {
              // should not happened as all_instances are up & running SAP Instances
              // if happens, instances might just have crashed or being stopped
              that.logger.log(that.logger.LOG_LEVEL_ERROR, '{' + job_data.system.syst_id + '} error connecting to instance: ' + inst.hostname + '/' + inst.instancenr + ':', soap_err); // update var all_instances

              all_instances[idx].status = -1;
              all_instances[idx] = Object.assign(all_instances[idx], {
                error: soap_err,
                occur_date: new Date()
              });
              callback();
            } else {
              // get IP internal from job.data
              var inst_from_job = job_data.system.instances.find(function (i) {
                return i.instancenr == inst.instancenr;
              });
              soap_clients.push({
                c: client.soapcli,
                f: inst.features,
                n: inst.instancenr,
                h: inst.hostname,
                i: inst_from_job && inst_from_job && inst_from_job.ip_internal
              });
              callback();
            }
          });
        }, function () {
          // if (err) that.logger.log(that.logger.LOG_LEVEL_ERROR, 'sap connect other error:', err)
          // update instance status for prometheus
          // all_instances = SAP instances visible from sapstartsrv GetSystemInstanceList command
          // need to make sure all instances even with OS down are updated from job_data.system.instances
          job_data.system.instances.forEach(function (instance, idx) {
            all_instances.forEach(function (new_instance) {
              if (instance && instance.instancenr == new_instance.instancenr) {
                job_data.system.instances[idx] = Object.assign(instance, new_instance);

                if (new_instance.error == undefined && new_instance.status != -1) {
                  delete job_data.system.instances[idx].error;
                }
              } // add new instances


              if (job_data.system.instances.map(function (x) {
                return x && x.instancenr;
              }).indexOf(new_instance.instancenr) < 0) {
                job_data.system.instances.push(new_instance);
              } // set missing/deleted/not running instance status to not running


              if (instance && all_instances.map(function (x) {
                return x.instancenr;
              }).indexOf(instance.instancenr) < 0) {
                // delete job_data.system.instances[idx]
                job_data.system.instances[idx].status = 0;
                delete job_data.system.instances[idx].error;
              }
            });
          });
          that.pushgtw_cli.pushUpSAPInstance('up', job_data.entity_id, job_data.system.syst_id, that.region, job_data.system.sid, job_data.system.instances);
          async.each(soap_clients, function (client, async_cb) {
            execute_in_sap(client, all_instances, async_cb);
          }, function (each_err) {
            if (each_err) {
              that.logger.log(that.logger.LOG_LEVEL_ERROR, '{' + job_data.system.syst_id + '} sapcontrol exec operation error:', each_err);
            }

            that.pushgtw_cli.pushInstance('scale', job_data.system.syst_id);
            cb(each_err, all_instances);
          });
        });
      }
    }], function (err, waterfall_res) {
      if (err) {
        // err is relating to technical connection to sap system / instance. Not error from SAP system or instance itself.
        switch (err) {
          case that._errors.conn_failed:
            that.logger.log(that.logger.LOG_LEVEL_ERROR, '[FAILED] {' + job_data.system.syst_id + '}:', that._errors.conn_failed); // Objective is to alert asap if a system is down
            // If there is an error connectiong to the system, we retry until the max_retries is reach or connection finally works.
            // we do not wait for the next execution 5min later

            that.check_failed_conn(waterfall_res, job_data); // use soap client of errorneous conn = waterfall_res

            break;

          case that._errors.no_system_conn:
            that.logger.log(that.logger.LOG_LEVEL_ERROR, '[FAILED] {' + job_data.system.syst_id + '}:', that._errors.no_system_conn); // pushgtw_cli.pushUpInstance and deletePrometheus already called

            break;

          case that._errors.no_active_instance:
            that.logger.log(that.logger.LOG_LEVEL_ERROR, '[FAILED] {' + job_data.system.syst_id + '}:', that._errors.no_active_instance, waterfall_res); // waterfall_res = all instances array

            that.deletePrometheus('scale', job_data.entity_id, job_data.system.syst_id, job_data.system.sid, job_data.system.instances.map(function (s) {
              return {
                'instancenr': s.instancenr,
                'status': 0
              };
            }));
            break;

          case that._errors.ws_not_reachable:
            // that.pushgtw_cli.pushUpInstance('up', job_data.entity_id, job_data.system.syst_id, that.region, job_data.system.sid, 0)
            that.logger.log(that.logger.LOG_LEVEL_ERROR, '[FAILED] {' + job_data.system.syst_id + '}:', that._errors.ws_not_reachable, waterfall_res);
            break;

          default:
            if (err.errno == 'ETIMEDOUT') {
              // that.logger.log(that.logger.LOG_LEVEL_ERROR, '>D ETIMEDOUT ' + err.syscall + ' to '+ err.address + ' on port ' + err.port + ' ', waterfall_res)
              if (waterfall_res === true) {
                that.deletePrometheus('scale', job_data.entity_id, job_data.system.syst_id, job_data.system.sid, job_data.system.instances.map(function (s) {
                  return {
                    'instancenr': s.instancenr,
                    'status': 0
                  };
                }));
              }
            } else {
              that.logger.log(that.logger.LOG_LEVEL_ERROR, '[FAILED] {' + job_data.system.syst_id + '}:', err, waterfall_res); // TBD delete prom data depending on errors
            }

            break;
        }

        cb_next(err.code || err.errno || err);
      } else {
        // update instance status for prometheus
        // pushUpSAPInstance already call in waterfall last func
        // that.pushgtw_cli.pushUpInstance('up', job_data.entity_id, job_data.system.syst_id, that.region, job_data.system.sid, 1) => already called
        // send back the list instances for update by the scaler scheduler
        // cb_next(null, { [job_data.system.syst_id]: waterfall_res })
        cb_next(null, {
          'sending_sslcertifs': that.sending_sslcertifs[job_data.system.syst_id],
          'instances': waterfall_res,
          'syst_id': job_data.system.syst_id
        });
      }
    });
  },
  // Called by Scheduler
  // Consume metrics for SAP (similar to call_sapcontrol) with higher frequency for precise notifications. Do produce Prometheus metrics.
  collect: function collect() {
    var that = this;
    that.queue.process(that.QUEUES.collect_exec, that.concurrency_nb, function (job, done) {
      if (job.data.func && job.data.system) {
        // test if pfx file exists before connecting
        that.update_sending_ssl(job.data.system.syst_id, job.data.keys_buff, function (err) {
          if (err) {
            done('missing pfx');
          } else {
            // async_cb must not be called with error => to no block the process for other sap instances of the targeted SAP system
            that.connect_sap(job.data, function (client, all_instances, async_cb) {
              if (client.f.indexOf(job.data.func.type) >= 0 || job.data.func.type == 'ALL') {
                that.logger.log(that.logger.LOG_LEVEL_DEBUG, '[PENDING] {' + job.data.system.syst_id + '} sapcontrol:' + job.data.func.name + ': execution');
                sapcontrol_operations$1[job.data.func.name].call(client.c, {}, function (err, result) {
                  if (err) {
                    that.logger.log(that.logger.LOG_LEVEL_ERROR, '[FAILED] {' + job.data.system.syst_id + '} sapcontrol:' + job.data.func.name + ': exec error:' + err.body ? err.body.match(/<faultstring>(.*?)<\/faultstring>/)[1] : err);
                  }

                  sapctrl_process_func$1.call(that, err, result, job.data.func.name, {
                    _id: job.data.system.syst_id,
                    sid: job.data.system.sid
                  }, {
                    ip_internal: client.i,
                    hostname: client.h,
                    sn: client.n,
                    features: client.f.join('|')
                  }, job.data.func.type, job.data.entity_id, job.data.restricted_kpis, job.data.rule_id, async_cb);
                });
              } else async_cb();
            }, done);
          }
        });
      } else {
        that.logger.log(that.logger.LOG_LEVEL_ERROR, '[FAILED] {' + job.data.system.syst_id + '} collect_exec: no data provided');
        done();
      }
    });
  },
  // Called by Receiver
  // Check connections to sap systems, cloud
  checkconnection: function checkconnection() {
    var that = this;
    var max_rec_execs_find_sap_instances = 2; // call with sap_instances_ip=job.data.sap_instances_ip, limit_execs=2
    // Recursive func to find SAP system instances among EC2 instances in same VPC as agent
    // based on successful tests on ip, nr, and hostname
    // Send back to results to receiver
    // Run only 2 at max

    function find_sap_instances(vpc_id, limit_execs, sap_instances_ip, instnr_list, done) {
      if (limit_execs <= 0) {
        done('System details not found');
      } else {
        if (sap_instances_ip.length == 0) {
          that.aws_cli.discoverEC2Instances(vpc_id, function (err, list_ec2) {
            // check if delta (= new EC2 instances)
            // if so, need to update the DB with new ones
            if (list_ec2 && list_ec2.length > 0) {
              find_sap_instances(vpc_id, limit_execs - 1, list_ec2, instnr_list, done);
            } else done('System details not found');
          });
        } else {
          // check targets with combination of IP & NR
          var combi_ip_nr = [];
          sap_instances_ip.forEach(function (i) {
            instnr_list.forEach(function (x) {
              combi_ip_nr.push({
                ip: i.ip_internal,
                nr: x.instancenr,
                hostname: x.hostname,
                cloud_instance_id: i.instance_id,
                cloud_instance_type: i.instance_type,
                status: false
              });
            });
          });
          that.logger.log(that.logger.LOG_LEVEL_DEBUG, 'Possible combinations of IP nr:', combi_ip_nr);
          async.eachOf(combi_ip_nr, function (elt, idx, cb) {
            // check if there is a sapcontrol service responding (EC2 must be up & running) at 'hostname'
            that.check_sapcontrol_listening(elt.ip, elt.nr, elt.hostname, function (valid) {
              combi_ip_nr[idx].status = valid;
              cb();
            });
          }, function (err) {
            if (err) {
              that.logger.log(that.logger.LOG_LEVEL_ERROR, 'Error:', err);
            }

            that.logger.log(that.logger.LOG_LEVEL_DEBUG, 'Valid SAP IP NR :', combi_ip_nr.filter(function (x) {
              return x.status;
            })); // Reasons to resync ec2 instances in VPC and retry
            //  - if ec2 instances related to SAP instances are not found at all
            //  - if number of ec2 instances related to SAP instances are found < nb SAP instances

            var sap_instances_with_ip = instnr_list.map(function (i) {
              var found_instance = combi_ip_nr.find(function (x) {
                return x.status && x.hostname == i.hostname && x.nr == i.instancenr;
              });

              if (found_instance) {
                return Object.assign(i, {
                  ip_internal: found_instance.ip,
                  cloud_instance_id: found_instance.cloud_instance_id,
                  cloud_instance_type: found_instance.cloud_instance_type
                });
              }
            }).filter(function (i) {
              return i.ip_internal;
            });

            if (sap_instances_with_ip.length == 0 || sap_instances_with_ip.length < instnr_list.length) {
              that.aws_cli.discoverEC2Instances(vpc_id, function (err, list_ec2) {
                // check if delta (= new EC2 instances)
                // if so, need to update the DB with new ones
                if (!list_ec2 || list_ec2.length == 0) {
                  done('System details not found');
                } else {
                  var new_instances_ip = list_ec2.filter(function (x) {
                    return !sap_instances_ip.includes(x.ip_internal);
                  });

                  if (new_instances_ip.length > 0) {
                    find_sap_instances(vpc_id, limit_execs - 1, new_instances_ip, instnr_list, done);
                  } else done('System details not found');
                }
              });
            } else {
              if (limit_execs == max_rec_execs_find_sap_instances) {
                done(null, {
                  'instances': sap_instances_with_ip
                });
              } else {
                // new ec2 since registration for this SAP system
                done(null, {
                  'instances': sap_instances_with_ip,
                  'new_ec2': sap_instances_ip
                });
              }
            }
          });
        }
      }
    } // 1. triggered by new system saved, to get its instances data 


    that.queue.process(that.QUEUES.discover_exec, that.concurrency_nb, function (job, done) {
      if (job.data.ip != undefined && job.data.nr != undefined && job.data.hostname != undefined && job.data.sap_instances_ip != undefined) {
        process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
        that.get_sap_instances_nr(job.data.ip, job.data.nr, function (err, instnr_list) {
          if (err) {
            done(err);
          } else {
            try {
              var vpc_id = fs$1.readFileSync(__dirname + '/.aws_vpc').toString();
              that.logger.log(that.logger.LOG_LEVEL_DEBUG, 'find_sap_instances params: ', vpc_id, job.data.sap_instances_ip, instnr_list);
              find_sap_instances(vpc_id, max_rec_execs_find_sap_instances, job.data.sap_instances_ip, instnr_list, done);
            } catch (e) {
              that.logger.log(that.logger.LOG_LEVEL_ERROR, 'Exception Unexcepted error:', e);
              done('Unexcepted error');
            }
          }
        });
      } else {
        done();
      }
    }); // 2. triggered by check system & instances status

    that.queue.process(that.QUEUES.checkconn_exec, that.concurrency_nb, function (job, done) {
      if (job.data.type != undefined && job.data.system) {
        that.logger.log(that.logger.LOG_LEVEL_DEBUG, '[PENDING] {' + job.data.system.syst_id + '} checkconn_exec system');

        switch (job.data.type) {
          case 0:
            // sap system
            that.update_sending_ssl(job.data.system.syst_id, job.data.keys_buff, function (err) {
              if (err) {
                done('missing pfx');
              } else {
                var soap_timeout_sec = 10000; // add first Dialog Instance from System info

                that.connect_sap(job.data, function (client, all_instances, async_cb) {
                  // For each instance, check if authorization is OK and get internal ip
                  var upd_idx = all_instances.findIndex(function (i) {
                    return i.instancenr == client.n;
                  });
                  async.parallel({
                    check: function check(parallel_cb) {
                      client.c.AccessCheck({
                        "function": 'Start'
                      }, function (err) {
                        if (err) {
                          that.logger.log(that.logger.LOG_LEVEL_ERROR, 'checkconn_exec authorization error for SAP instance:' + client.h + '/' + client.i + '/' + client.n);
                          all_instances[upd_idx].status = -1;
                          all_instances[upd_idx] = Object.assign(all_instances[upd_idx], {
                            error: err.body ? err.body.match(/<faultstring>(.*?)<\/faultstring>/)[1] : err,
                            occur_date: new Date()
                          });
                        }

                        parallel_cb();
                      }, {
                        timeout: soap_timeout_sec
                      });
                    },
                    ip: function ip(parallel_cb) {
                      async.waterfall([// get IP from SAP control for Dialog Instances
                      function (waterfall_cb) {
                        client.c.GetAlertTree({}, function (err, result) {
                          if (!err && result && result.tree) {
                            var temp_res = result.tree.item.filter(function (i) {
                              return result.tree.item[i.parent] && result.tree.item[i.parent].name.trim() == 'Server Configuration' && i.name.trim() == 'IP Address';
                            });

                            if (temp_res && temp_res[0] && temp_res[0].description) {
                              all_instances[upd_idx].ip_internal = temp_res[0].description;
                              waterfall_cb(null, temp_res[0].description);
                            }
                          } else waterfall_cb('No IP ' + err);
                        });
                      }, // get ID from cloud API
                      function (ip, waterfall_cb) {
                        // get instances ec2 ID + ec2 instance type
                        that.aws_cli.getEC2ID_Type(ip, function (ec2_id_type) {
                          return waterfall_cb(null, ec2_id_type);
                        });
                      }, function (cloud_instance_details, waterfall_cb) {
                        all_instances[upd_idx].cloud_instance_id = cloud_instance_details.instance_id;
                        all_instances[upd_idx].cloud_instance_type = cloud_instance_details.instance_type;
                        waterfall_cb();
                      }], function (err) {
                        if (err) {
                          that.logger.log(that.logger.LOG_LEVEL_ERROR, 'checkconn_exec error getting SAP instance details (IP, cloud instance ID and type):' + client.h + '/' + client.i + '/' + client.n + ':', err);
                        }

                        parallel_cb();
                      });
                    }
                  }, function () {
                    // if (!err) {
                    //   that.logger.log(that.logger.LOG_LEVEL_MIN, 'checkconn_exec: SAP instance updated OK:' + client.h + '/' + client.i + '/' + client.n)
                    // }
                    async_cb();
                  });
                }, done);
              }
            });
            break;

          case 1:
            // aws
            done();
            break;

          default:
            done();
            break;
        }
      } else {
        that.logger.log(that.logger.LOG_LEVEL_ERROR, '[FAILED] {' + job.data.system.syst_id + '} checkconn_exec: no data provided');
        done();
      }
    });
  },
  // Called by Receiver
  // Response to alertmanager msg sent to webhook receiver.
  // Does not pull metrics but execute task based on metrics values and defined rules
  // --
  // todo log start/stop actions
  scale: function scale() {
    var that = this;
    var _start_server_timeout_error = 0;
    var _start_server_not_found = 1;
    var _stop_server_error = 2;
    var _stop_server_timeout_error = 3;
    var _stop_server_not_found = 4;
    var _start_sap_error = 5;
    var _start_sap_timeout_error = 6;
    var _stop_sap_error = 7;
    var _stop_sap_timeout_error = 8;
    var _scaling_errors = [];
    _scaling_errors[_start_server_timeout_error] = 'Start EC2 server operation timeout';
    _scaling_errors[_start_server_not_found] = 'EC2 server to start cannot be found';
    _scaling_errors[_stop_server_error] = 'EC2 server could not be stopped (but SAP instance successfully stopped)';
    _scaling_errors[_stop_server_timeout_error] = 'Stop EC2 server operation timeout (but SAP instance successfully stopped)';
    _scaling_errors[_stop_server_not_found] = 'EC2 server to stop cannot be found';
    _scaling_errors[_start_sap_error] = 'Start SAP instance operation failed';
    _scaling_errors[_start_sap_timeout_error] = 'Start SAP instance operation timeout';
    _scaling_errors[_stop_sap_error] = 'Stop SAP instance operation failed';
    _scaling_errors[_stop_sap_timeout_error] = 'Stop SAP instance operation timeout'; // check if SAP instance is stopped before stopping the OS

    function check_stop_sap_instance(soap_client, count, wait_sec, sn, serie_cb) {
      if (count > 0) {
        setTimeout(function () {
          soap_client.GetSystemInstanceList({}, function (err, result) {
            if (!err) {
              var inst_status = result.instance.item && result.instance.item.filter(function (i) {
                return i.instanceNr == sn;
              });

              if (inst_status && inst_status[0] && inst_status[0].dispstatus == 'SAPControl-GRAY') {
                serie_cb();
              } else {
                check_stop_sap_instance(soap_client, count - 1, wait_sec, sn, serie_cb);
              }
            } else {
              check_stop_sap_instance(soap_client, count - 1, wait_sec, sn, serie_cb); // serie_cb('error geeting SAP instances list ' + err)
            }
          });
        }, wait_sec); // 3 retries with 20sec to valide in 1 min
      } else serie_cb(_stop_sap_timeout_error);
    } // check if SAP instance is started


    function check_start_sap_instance(soap_client, count, wait_sec, sn, serie_cb) {
      // todo
      that.logger.log(that.logger.LOG_LEVEL_DEBUG, 'check_start_sap_instance:', count, wait_sec, sn);

      if (count > 0) {
        setTimeout(function () {
          soap_client.GetSystemInstanceList({}, function (err, result) {
            if (!err) {
              var inst_status = result.instance.item && result.instance.item.filter(function (i) {
                return ('' + i.instanceNr).padStart(2, '0') == sn + '';
              });

              if (inst_status && inst_status[0] && inst_status[0].dispstatus == that._sap_statuses.green) {
                serie_cb();
              } else {
                check_start_sap_instance(soap_client, count - 1, wait_sec, sn, serie_cb);
              }
            } else {
              // serie_cb('error geeting SAP instances list ' + err)
              check_start_sap_instance(soap_client, count - 1, wait_sec, sn, serie_cb);
            }
          });
        }, wait_sec); // 3 retries with 20sec to valide in 1 min
      } else serie_cb(_start_sap_timeout_error);
    } // check if host OS is started before starting SAP instance


    function check_start_ec2_instance(aws_client, count, wait_sec, single_ip, serie_cb) {
      that.logger.log(that.logger.LOG_LEVEL_DEBUG, 'check_start_ec2_instance:', count, wait_sec, single_ip);

      if (count > 0) {
        setTimeout(function () {
          aws_client.isEC2Running(single_ip, function (status) {
            if (status != undefined && status != null) {
              if (status) {
                serie_cb();
              } else check_start_ec2_instance(aws_client, count - 1, wait_sec, single_ip, serie_cb);
            } else serie_cb(_start_server_not_found);
          });
        }, wait_sec); // 3 retries with 20sec to valide in 1 min
      } else serie_cb(_start_server_timeout_error);
    } // check if host OS is stopped 


    function check_stop_ec2_instance(aws_client, count, wait_sec, single_ip, serie_cb) {
      if (count > 0) {
        setTimeout(function () {
          aws_client.isEC2Stopped(single_ip, function (status) {
            if (status != undefined && status != null) {
              if (status) {
                serie_cb();
              } else check_stop_ec2_instance(aws_client, count - 1, wait_sec, single_ip, serie_cb);
            } else serie_cb(_stop_server_not_found);
          });
        }, wait_sec); // 3 retries with 20sec to valide in 1 min
      } else serie_cb(_stop_server_timeout_error);
    } // recursive restart SAP Instance


    function do_restart_sap(soapcli, curr_system, syst_instance_to_start, index_curr_instance_restart) {
      var n_times = arguments.length > 4 && arguments[4] !== undefined ? arguments[4] : 1;

      if (n_times > 0) {
        // status for restart = 3. needed to prevent false error on inconsistency status by USI.
        // => status for failed start + restart (without resetting status): 0 > 3 > -1 > 0 => inconsistency as prev = new status
        // => status for failed start + restart (with resetting status): 0 > 3 > 3 > 1|0 => no inconsistency as prev != new status
        that.updated_system_instances[curr_system.syst_id][index_curr_instance_restart].status = 3;
        sapcontrol_operations$1['RestartInstance'].call(soapcli, {}, function (err) {
          if (err !== undefined && err !== null) {
            if (err.body) {
              var start_error = err.body.match(/<faultstring>(.*?)<\/faultstring>/) && err.body.match(/<faultstring>(.*?)<\/faultstring>/)[1]; // Instance already started

              if (start_error == 'Instance already started') {
                that.logger.log(that.logger.LOG_LEVEL_MIN, '[COMPLETED] {' + curr_system.syst_id + '} (restart-' + n_times + ') already started:' + curr_system.syst_id + '/' + syst_instance_to_start.hostname + '/' + syst_instance_to_start.ip_internal + '/' + syst_instance_to_start.instancenr);
                that.updated_system_instances[curr_system.syst_id][index_curr_instance_restart].status = 1;
                that.save_resume_step(curr_system.syst_id, index_curr_instance_restart, -1);
              } else {
                that.logger.log(that.logger.LOG_LEVEL_ERROR, '[FAILED] {' + curr_system.syst_id + '} (restart -' + n_times + ') sap instance error:' + start_error);
                that.updated_system_instances[curr_system.syst_id][index_curr_instance_restart].status = -1;
                that.updated_system_instances[curr_system.syst_id][index_curr_instance_restart].error = {
                  'occur_date': Date.now(),
                  'msg': _scaling_errors[_start_sap_error] + ':' + start_error
                };
                do_restart_sap(soapcli, curr_system, syst_instance_to_start, index_curr_instance_restart, n_times - 1);
              }
            } else {
              that.logger.log(that.logger.LOG_LEVEL_ERROR, '[FAILED] {' + curr_system.syst_id + '} (restart -' + n_times + ') sap instance error:', err);
              that.updated_system_instances[curr_system.syst_id][index_curr_instance_restart].status = -1;
              that.updated_system_instances[curr_system.syst_id][index_curr_instance_restart].error = {
                'occur_date': Date.now(),
                'msg': _scaling_errors[_start_sap_error]
              };
              do_restart_sap(soapcli, curr_system, syst_instance_to_start, index_curr_instance_restart, n_times - 1);
            }
          } else {
            var step_wait_sec = 20;
            var timeout_wait_sec = 300;
            var nb_iterations = Math.ceil(timeout_wait_sec / step_wait_sec);
            that.logger.log(that.logger.LOG_LEVEL_DEBUG, '[PENDING] {' + curr_system.syst_id + '} (restart -' + n_times + ') waiting for SAP instance to actually start within timeout ' + timeout_wait_sec + ' sec:' + syst_instance_to_start.hostname + '/' + syst_instance_to_start.ip_internal + '/' + syst_instance_to_start.instancenr);
            check_start_sap_instance(soapcli, nb_iterations, step_wait_sec * 1000, syst_instance_to_start.instancenr, function (err) {
              if (err) {
                that.updated_system_instances[curr_system.syst_id][index_curr_instance_restart].status = -1;
                that.updated_system_instances[curr_system.syst_id][index_curr_instance_restart].error = {
                  'occur_date': Date.now(),
                  'msg': _scaling_errors[_start_sap_timeout_error]
                };
                that.logger.log(that.logger.LOG_LEVEL_MIN, '[COMPLETED] {' + curr_system.syst_id + '} (restart-' + n_times + ') partially started (EC2:OK, SAP:NOK): ' + curr_system.syst_id + '/' + syst_instance_to_start.hostname + '/' + syst_instance_to_start.ip_internal + '/' + syst_instance_to_start.instancenr + ' error:', _scaling_errors[_start_sap_timeout_error]); // error handling : try restart

                do_restart_sap(soapcli, curr_system, syst_instance_to_start, index_curr_instance_restart, n_times - 1);
              } else {
                that.updated_system_instances[curr_system.syst_id][index_curr_instance_restart].status = 1;
                delete that.updated_system_instances[curr_system.syst_id][index_curr_instance_restart].error;
                that.logger.log(that.logger.LOG_LEVEL_MIN, '[COMPLETED] {' + curr_system.syst_id + '} (restart-' + n_times + ') fully started:' + curr_system.syst_id + '/' + syst_instance_to_start.hostname + '/' + syst_instance_to_start.ip_internal + '/' + syst_instance_to_start.instancenr);
                that.save_resume_step(curr_system.syst_id, index_curr_instance_restart, -1);
              }
            });
          }
        }); // end sapcontrol_operations
      } else {
        that.logger.log(that.logger.LOG_LEVEL_MIN, '[COMPLETED] {' + curr_system.syst_id + '} (restart-' + n_times + ') all retries completed:' + curr_system.syst_id + '/' + syst_instance_to_start.hostname + '/' + syst_instance_to_start.ip_internal + '/' + syst_instance_to_start.instancenr);
        that.updated_system_instances[curr_system.syst_id][index_curr_instance_restart].status = -1;
        that.updated_system_instances[curr_system.syst_id][index_curr_instance_restart].error = {
          'occur_date': Date.now(),
          'msg': _scaling_errors[_start_sap_timeout_error]
        }; // send email to notify

        that.save_resume_step(curr_system.syst_id, index_curr_instance_restart, -1);
      }
    } // TODO
    // improvement: can set minimal number of instances instead of 1


    function do_stop(d, queue_cb) {
      var is_resume_mode = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : false;
      var resume_step = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : -1;
      // to prevent error for self signed certificates of SAP systems
      process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
      var alert = d.alert;
      var curr_system = d.system;
      var syst_id = alert.labels.instance;
      var entity_id = alert.labels.entity_id;
      var instance_to_stop = curr_system.instances.find(function (i) {
        return i.instancenr == alert.labels.sn;
      });
      var mode_resume = is_resume_mode ? '<-' : '';

      if (that.updated_system_instances[syst_id] == undefined || that.updated_system_instances[syst_id].length == 0) {
        // important to clone the array to prevent circular dependency with resume_context property
        that.updated_system_instances[syst_id] = _toConsumableArray(curr_system.instances);
      }

      if (curr_system && instance_to_stop) {
        that.logger.log(that.logger.LOG_LEVEL_INFO, '[PENDING] {' + curr_system.syst_id + '} (stop' + mode_resume + ') requested for instance :' + instance_to_stop.hostname + '/' + instance_to_stop.instancenr + '/' + instance_to_stop.status + ' from alert ' + alert.labels.alertname + ' ' + alert.labels.sn + ' - ' + alert.labels.ip_internal + ' ' + alert.labels.hostname);
        async.waterfall([// check system certificate at file level, create it if not existing
        function (cb) {
          // cb returns nothing
          that.update_sending_ssl(d.system.syst_id, d.keys_buff, cb);
        }, // connect to the instance and provide soapclient
        function (cb) {
          // that.logger.log(that.logger.LOG_LEVEL_DEBUG, 'connect to the entry point instance and provide soapclient')
          var http_s = {
            protocol: 'https',
            port_suffix: '14'
          };
          var soap_url = http_s.protocol + '://' + (instance_to_stop.ip_internal || instance_to_stop.hostname) + ':5' + instance_to_stop.instancenr + http_s.port_suffix + '/';
          that.pushgtw_cli.addInstance(d.system.syst_id);
          that.new_soap_client(soap_url, {
            method: 1,
            // method is the index of options
            options: [{}, {
              pfx: that.certif_dir + '/' + d.system.syst_id + '.pfx'
            }]
          }, d, cb);
        }, // Get list of instances and check system status
        function (cli_data, cb) {
          if (!cli_data || !cli_data.soapcli) {
            that.logger.log(that.logger.LOG_LEVEL_ERROR, '[PENDING] {' + curr_system.syst_id + '} (stop' + mode_resume + ') no soap client created for system instance ' + syst_id);
            async_cb(that._errors.soap_client_init);
          } else {
            // that.logger.log(that.logger.LOG_LEVEL_DEBUG, 'Get list of instances and check system status')
            cli_data.soapcli.GetSystemInstanceList({}, function (err, result) {
              if (!err && result && result.instance && result.instance.item) {
                // update up status for system, delete if not up
                var syst_status = that.check_system_status(result.instance.item);

                if (syst_status == that._sap_statuses.red || syst_status == that._sap_statuses.gray) {
                  cb(that._errors.conn_failed, cli_data.soapcli);
                } else {
                  that.pushgtw_cli.pushUpInstance('up', entity_id, d.system.syst_id, that.region, d.system.sid, 1);
                  that.conn_retries[d.system.syst_id] = 0;
                  var features_of_instancenr = {};
                  var all_instances = result.instance.item.map(function (x) {
                    return {
                      'hostname': x.hostname,
                      'instancenr': ('' + x.instanceNr).padStart(2, '0'),
                      'features': x.features.split('|'),
                      'status': x.dispstatus == that._sap_statuses.green ? 1 : x.dispstatus == that._sap_statuses.yellow ? -1 : 0
                    };
                  });
                  that.logger.log(that.logger.LOG_LEVEL_DEBUG, '[PENDING] {' + curr_system.syst_id + '} (stop' + mode_resume + ') - all instances of system:' + all_instances.map(function (i) {
                    return i.hostname + '/' + i.instancenr + '/' + i.status;
                  }).join(', '));
                  all_instances.filter(function (i) {
                    return i.status == 1;
                  }).forEach(function (i) {
                    features_of_instancenr[i.instancenr] = i.features.join('/');
                  }); // skip if min instance is reached
                  // continue *ONLY* if in resume mode and resume step >= sap_stop_triggered: 3 or ec2_stop_triggered: 4. In this case, we need to finished the EC2 stop operation.

                  if (Object.values(features_of_instancenr).filter(function (x) {
                    return x == features_of_instancenr[alert.labels.sn];
                  }).length > that.min_instance_running || is_resume_mode && resume_step >= that._resume_on_step.stop.sap_stop_triggered) {
                    cli_data.payload = Object.assign(cli_data.payload, {
                      instances: all_instances
                    });
                    cb(null, cli_data);
                  } else {
                    cb(that._errors.min_instances_reached);
                  }
                }
              } else {
                cb(that._errors.ws_not_reachable, err && err.address + ' ' + err.port);
              }
            });
          }
        }, // Get list of instances and check system status
        function (cli_data, async_cb) {
          // check if there is not a stop in progress for this instance in normal mode 
          // OR is in resume mode
          if (is_resume_mode || that.updated_system_instances[syst_id].filter(function (i) {
            return i.status == 2 && i.instancenr == alert.labels.sn;
          }).length == 0) {
            // Set this instance *only* in stop WIP so it is not considered as active. Prevent from shutting down all AS and trying to shut down same AS from the same alert when the stop takes more time than alert resending
            // set status == 2 for stop in progress
            // also init resume_on_step value for fault tolerant (if process gets killed and restarted)
            var index_curr_instance_stop = that.updated_system_instances[syst_id].map(function (i) {
              return i.instancenr;
            }).indexOf(instance_to_stop.instancenr);

            if (index_curr_instance_stop < 0) {
              index_curr_instance_stop = that.updated_system_instances[syst_id].push(Object.assign({}, instance_to_stop, {
                status: 2,
                resume_on_step: that._resume_on_step.stop.begin,
                resume_context: d
              })) - 1;
            } else {
              that.updated_system_instances[syst_id][index_curr_instance_stop] = Object.assign({}, that.updated_system_instances[syst_id][index_curr_instance_stop], {
                status: 2,
                resume_on_step: that._resume_on_step.stop.begin,
                resume_context: d
              });
            }

            that.logger.log(that.logger.LOG_LEVEL_INFO, '[PENDING] {' + curr_system.syst_id + '} (stop' + mode_resume + ') update to transition status:' + that.updated_system_instances[syst_id].map(function (i) {
              return i.hostname + '/' + i.instancenr + '/' + i.status;
            }).join(',')); // call async now to prevent delay of DB update due to waiting for stop operations 

            async_cb();
            var counter_elt = d.counter.find(function (c) {
              return c.instancenr == alert.labels.sn;
            });
            var counter_instance = counter_elt ? counter_elt.value : 0; // --- TRIGGER STOP SAP INSTANCE ----
            // process STOP
            // Execution in normal mode 'live/on demand' => request by receiver
            // Execution in resume mode => re run on interrupted step
            // const is_normal_mode = that.updated_system_instances[syst_id][index_curr_instance_stop].resume_on_step < 0

            that.logger.log(that.logger.LOG_LEVEL_MIN, '[PENDING] {' + syst_id + '} (stop' + mode_resume + ') triggered: ' + alert.labels.alertname + '/' + alert.labels.hostname + '/' + alert.labels.sn + ' (counter=' + parseInt(counter_instance) + 1 + ' entity=' + entity_id + ')');
            async.series([// increment stop counter
            function (serie_cb) {
              if (!is_resume_mode || that.resume_here_on_interruption(syst_id, index_curr_instance_stop, that._resume_on_step.stop.counter_updated)) {
                that.pushgtw_cli.pushCounter('counter', 'stop', entity_id, syst_id, alert.labels.sn, alert.labels.alertname, parseInt(counter_instance) + 1);
                that.save_resume_step(syst_id, index_curr_instance_stop, that._resume_on_step.stop.counter_updated);
              }

              serie_cb();
            }, // stop sap instance
            function (serie_cb) {
              if (!is_resume_mode || that.resume_here_on_interruption(syst_id, index_curr_instance_stop, that._resume_on_step.stop.sap_stop_triggered)) {
                that.logger.log(that.logger.LOG_LEVEL_INFO, '[PENDING] {' + syst_id + '} (stop' + mode_resume + ') triggered SAP instance:' + alert.labels.ip_internal + '/' + alert.labels.hostname + '/' + alert.labels.sn);
                sapcontrol_operations$1[d.action.name].call(cli_data.soapcli, {}, function (err) {
                  that.save_resume_step(syst_id, index_curr_instance_stop, that._resume_on_step.stop.sap_stop_triggered);

                  if (err) {
                    serie_cb(_stop_sap_error);
                  } else {
                    serie_cb();
                  }
                });
              } else serie_cb();
            }, // wait for actual stop
            function (serie_cb) {
              var step_wait_sec = 20;
              var timeout_wait_sec = 300;
              var nb_iterations = Math.ceil(timeout_wait_sec / step_wait_sec);
              that.logger.log(that.logger.LOG_LEVEL_INFO, '[PENDING] {' + syst_id + '} (stop' + mode_resume + ') waiting SAP instance to stop before timeout ' + timeout_wait_sec + ' sec: ' + alert.labels.ip_internal + '/' + alert.labels.hostname + '/' + alert.labels.sn);
              check_stop_sap_instance(cli_data.soapcli, nb_iterations, step_wait_sec * 1000, alert.labels.sn, serie_cb);
            }, // stop ec2 instance
            function (serie_cb) {
              if (!is_resume_mode || that.resume_here_on_interruption(syst_id, index_curr_instance_stop, that._resume_on_step.stop.ec2_stop_triggered)) {
                that.logger.log(that.logger.LOG_LEVEL_INFO, '[PENDING] {' + syst_id + '} (stop' + mode_resume + ') triggered EC2 instance:' + alert.labels.ip_internal);
                that.aws_cli.stopEC2(alert.labels.ip_internal, serie_cb);
                that.save_resume_step(syst_id, index_curr_instance_stop, that._resume_on_step.stop.ec2_stop_triggered);
              } else serie_cb();
            }], function (err) {
              // var temp_updated_instance_idx = that.updated_system_instances[syst_id].findIndex(i => i.instancenr == alert.labels.sn)
              if (err) {
                that.logger.log(that.logger.LOG_LEVEL_ERROR, '[FAILED] {' + syst_id + '} (stop' + mode_resume + '):', err);

                switch (err) {
                  case _stop_sap_error:
                    that.updated_system_instances[syst_id][index_curr_instance_stop].status = -1;
                    that.updated_system_instances[syst_id][index_curr_instance_stop].error = {
                      'occur_date': Date.now(),
                      'msg': _scaling_errors[_stop_sap_error]
                    };
                    break;

                  case _scaling_errors[_stop_sap_timeout_error]:
                    // set value to -1 so Receiver can get knowledge of unsuccessfull operation. unknown instance status
                    that.updated_system_instances[syst_id][index_curr_instance_stop].status = -1;
                    that.updated_system_instances[syst_id][index_curr_instance_stop].error = {
                      'occur_date': Date.now(),
                      'msg': _scaling_errors[_stop_sap_timeout_error]
                    };
                    break;

                  case that.aws_cli._errors.ec2_not_stopped:
                    that.updated_system_instances[syst_id][index_curr_instance_stop].status = -1;
                    that.updated_system_instances[syst_id][index_curr_instance_stop].error = {
                      'occur_date': Date.now(),
                      'msg': _scaling_errors[_stop_server_error]
                    };
                    break;
                }

                that.save_resume_step(syst_id, index_curr_instance_stop, -1);
              } else {
                var step_wait_sec = 20;
                var timeout_wait_sec = 300;
                var nb_iterations = Math.ceil(timeout_wait_sec / step_wait_sec);
                that.updated_system_instances[syst_id][index_curr_instance_stop].status = 0;
                check_stop_ec2_instance(that.aws_cli, nb_iterations, step_wait_sec * 1000, alert.labels.ip_internal, function (err) {
                  if (err) {
                    that.logger.log(that.logger.LOG_LEVEL_MIN, '[COMPLETED] {' + syst_id + '} (stop' + mode_resume + ') partially stopped (SAP:OK, EC2:NOK):' + alert.labels.ip_internal + '/' + alert.labels.hostname + '/' + alert.labels.sn + ' error:', _scaling_errors[err]); // TODO send email  start ec2 failed

                    that.updated_system_instances[syst_id][index_curr_instance_stop].error = {
                      'occur_date': Date.now(),
                      'msg': _scaling_errors[err]
                    };
                  } else {
                    delete that.updated_system_instances[syst_id][index_curr_instance_stop].error;
                    that.logger.log(that.logger.LOG_LEVEL_MIN, '[COMPLETED] {' + syst_id + '} (stop' + mode_resume + ') fully stopped:' + alert.labels.ip_internal + '/' + alert.labels.hostname + '/' + alert.labels.sn);
                  }

                  that.save_resume_step(syst_id, index_curr_instance_stop, -1);
                });
              }
            });
          } else {
            that.logger.log(that.logger.LOG_LEVEL_INFO, '[CANCELLED] {' + syst_id + '} (stop' + mode_resume + ') instance is already being stopped');
            async_cb(that._errors.stop_ongoing);
          }
        }], function (waterfall_err) {
          // waterfall_err is not an error relating to operation execution, it does not involve any change on instance status but rather on business rules
          if (waterfall_err) {
            that.logger.log(that.logger.LOG_LEVEL_ERROR, '[CHECKS FAILED] {' + syst_id + '} (stop' + mode_resume + ') on ' + curr_system.ip_internal + '/' + curr_system.sid + ':', waterfall_err);

            switch (waterfall_err) {
              case that._errors.soap_client_init:
              case that._errors.conn_failed:
              case that._errors.ws_not_reachable:
              case that._errors.min_instances_reached:
              case that._errors.stop_ongoing:
              default:
                queue_cb(waterfall_err);
                break;
            }
          } else {
            queue_cb(null, {
              'sending_sslcertifs': that.sending_sslcertifs[curr_system.syst_id + ''],
              'instances': that.updated_system_instances,
              'syst_id': curr_system.syst_id // 'error': waterfall_err

            });
          }
        });
      } else {
        that.logger.log(that.logger.LOG_LEVEL_ERROR, '[CANCELLED] {' + syst_id + '} (stop' + mode_resume + ') no system provided');
        queue_cb('No system provided');
      }
    } // improvement: can set max number of instances instead of const


    function do_start(d, queue_cb) {
      var is_resume_mode = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : false;
      var instance_idx = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : -1;
      // to prevent error for self signed certificates of SAP systems
      process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
      var alert = d.alert;
      var curr_system = d.system;
      var syst_id = alert.labels.instance;
      var entity_id = alert.labels.entity_id;
      var mode_resume = is_resume_mode ? '<-' : '';

      if (that.updated_system_instances[syst_id] == undefined || that.updated_system_instances[syst_id].length == 0) {
        // important to clone the array to prevent circular dependency with resume_context property
        that.updated_system_instances[syst_id] = _toConsumableArray(curr_system.instances);
      }

      if (curr_system) {
        that.logger.log(that.logger.LOG_LEVEL_INFO, '[PENDING] {' + curr_system.syst_id + '} (start' + mode_resume + ') requested for instance:' + curr_system.ip_internal + '-' + curr_system.sid);
        async.waterfall([// find the sap instance to start depending on execution mode: normal or resume
        function (waterfall_cb) {
          async.parallel({
            // returns something only in normal mode
            normal_instance_to_start: function normal_instance_to_start(parallel_cb) {
              if (is_resume_mode) parallel_cb();else {
                async.waterfall([// check no CI instances
                function (waterfall_cb2) {
                  // var syst_instances_to_start_candidates = curr_system.instances
                  // search for stopped (from db perspective) dialog instances (!= msg server)
                  var syst_instances_to_start_candidates = that.updated_system_instances[syst_id] // search for stopped (from up to date cache) dialog instances (!= msg server)
                  .filter(function (x) {
                    return x.status == 0 && x.features.indexOf('MESSAGESERVER') < 0 && x.features.indexOf('ENQUE') < 0;
                  });

                  if (syst_instances_to_start_candidates && syst_instances_to_start_candidates.length > 0) {
                    waterfall_cb2();
                  } else {
                    that.logger.log(that.logger.LOG_LEVEL_ERROR, '[FAILED] {' + curr_system.syst_id + '} (start' + mode_resume + '):' + that._errors.no_start_candidate);
                    waterfall_cb2(that._errors.no_start_candidate);
                  }
                }, // check system certificate
                function (waterfall_cb2) {
                  // cb returns nothing
                  that.update_sending_ssl(d.system.syst_id, d.keys_buff, waterfall_cb2);
                }, // connect to the entry point instance and provide soapclient
                function (waterfall_cb2) {
                  // that.logger.log(that.logger.LOG_LEVEL_DEBUG, 'connect to the entry point instance and provide soapclient')
                  var http_s = d.system.is_encrypted ? {
                    protocol: 'https',
                    port_suffix: '14'
                  } : {
                    protocol: 'http',
                    port_suffix: '13'
                  };
                  var soap_url = http_s.protocol + '://' + (d.system.ip_internal || d.system.hostname) + ':5' + d.system.sn + http_s.port_suffix + '/';
                  that.pushgtw_cli.addInstance(d.system.syst_id);
                  that.new_soap_client(soap_url, {
                    method: d.system.auth_method,
                    // method is the index of options
                    options: [{
                      user: d.system.username,
                      pwd: d.system.password
                    }, {
                      pfx: d.system.auth_method == 1 && that.certif_dir + '/' + d.system.syst_id + '.pfx'
                    }]
                  }, d, waterfall_cb2);
                }, // Get list of instances and check system status
                function (cli_data, waterfall_cb2) {
                  // that.logger.log(that.logger.LOG_LEVEL_DEBUG, 'Get list of instances and check system status')
                  cli_data.soapcli.GetSystemInstanceList({}, function (err, result) {
                    if (!err && result && result.instance && result.instance.item) {
                      var instances_list = result.instance.item.map(function (x) {
                        return {
                          'hostname': x.hostname,
                          'instancenr': ('' + x.instanceNr).padStart(2, '0'),
                          'features': x.features.split('|'),
                          'status': x.dispstatus == that._sap_statuses.green ? 1 : x.dispstatus == that._sap_statuses.yellow ? -1 : 0
                        };
                      }); // update up status for system, delete if not up

                      var syst_status = that.check_system_status(result.instance.item);

                      if (syst_status == that._sap_statuses.red || syst_status == that._sap_statuses.gray) {
                        waterfall_cb2(that._errors.conn_failed, cli_data.soapcli);
                      } else {
                        that.pushgtw_cli.pushUpInstance('up', entity_id, d.system.syst_id, that.region, d.system.sid, 1);
                        that.conn_retries[d.system.syst_id] = 0; // provide list of active instances for KPI collections

                        waterfall_cb2(null, instances_list);
                      }
                    } else {
                      waterfall_cb2(that._errors.ws_not_reachable, err && err.address + ' ' + err.port);
                    }
                  });
                }, // check system instances statuses and conditions before triggering start
                function (all_instances, waterfall_cb2) {
                  // check if max instances is reached already 
                  var features_of_instancenr = {};
                  all_instances.filter(function (i) {
                    return i.status == 1;
                  }).forEach(function (i) {
                    features_of_instancenr[i.instancenr] = i.features.join('|');
                  });

                  if (Object.values(features_of_instancenr).filter(function (x) {
                    return !RegExp('MESSAGESERVER').test(x) && !RegExp('ENQUE').test(x);
                  }).length < that.max_instance_running) {
                    waterfall_cb2(null, all_instances);
                  } else {
                    waterfall_cb2(that._errors.max_instances_reached);
                  }
                }, // check if eligible instance can be started
                function (all_instances, waterfall_cb2) {
                  that.logger.log(that.logger.LOG_LEVEL_DEBUG, '[PENDING] {' + curr_system.syst_id + '} (start' + mode_resume + ') all instances of system:' + all_instances.map(function (i) {
                    return i.hostname + '/' + i.instancenr + '/' + i.status;
                  }).join(',')); // var syst_instances_to_start = curr_system.instances
                  // search for stopped (from db perspective) dialog instances (!= msg server)

                  var syst_instances_to_start = that.updated_system_instances[syst_id] // search for stopped (from up to date cache perspective) dialog instances (!= msg server)
                  .filter(function (x) {
                    return x.status == 0 && x.features.indexOf('MESSAGESERVER') < 0 && x.features.indexOf('ENQUE') < 0;
                  }) // search for stopped (from sapctrl res perspective)
                  .filter(function (x) {
                    return all_instances.filter(function (i) {
                      return i.status == 0;
                    }).findIndex(function (i) {
                      return i.instancenr == x.instancenr;
                    }) >= 0 || // os is up, sap instance is down
                    all_instances.findIndex(function (i) {
                      return i.instancenr == x.instancenr;
                    }) < 0;
                  } // os (and sap instance) is down
                  ); // var syst_instances_to_start = all_instances.filter(x => x.status == 0 && x.features.indexOf('MESSAGESERVER') < 0 && x.features.indexOf('ENQUE') < 0)

                  that.logger.log(that.logger.LOG_LEVEL_DEBUG, '[PENDING] {' + curr_system.syst_id + '} (start' + mode_resume + ') candidates instances:' + syst_instances_to_start.map(function (i) {
                    return i.hostname + '/' + i.instancenr + '/' + i.status;
                  }).join(','));

                  if (syst_instances_to_start && syst_instances_to_start.length > 0) {
                    waterfall_cb2(null, syst_instances_to_start[0]);
                  } else {
                    waterfall_cb2(that._errors.no_start_candidate);
                  }
                }], function (waterfall_err2, syst_instance_to_start) {
                  // waterfall_err is not an error relating to operation execution, 
                  // it does not involve any change on instance status but rather on business rules and pre checks
                  if (waterfall_err2) {
                    parallel_cb(waterfall_err2); // that.logger.log(that.logger.LOG_LEVEL_ERROR, '[CHECKS FAILED] {' + curr_system.syst_id + '} (start'+mode_resume+') on ' + curr_system.ip_internal + '-' + curr_system.sid + ':', waterfall_err)
                    // switch (waterfall_err) {
                    //   case that._errors.soap_client_init:
                    //   case that._errors.conn_failed:
                    //   case that._errors.ws_not_reachable:
                    //   case that._errors.max_instances_reached:
                    //   case that._errors.no_start_candidate:
                    //   case that._errors.start_ongoing:
                    //   default:
                    //     parallel_cb(waterfall_err)
                    //     break
                    // }
                  } else parallel_cb(null, syst_instance_to_start);
                });
              }
            },
            // returns something only in resume mode
            resume_instance_to_start: function resume_instance_to_start(parallel_cb) {
              if (is_resume_mode) parallel_cb(null, that.updated_system_instances[syst_id][instance_idx]);else parallel_cb();
            }
          }, function (err, res) {
            waterfall_cb(err, res.normal_instance_to_start || res.resume_instance_to_start);
          });
        }, function (syst_instance_to_start, waterfall_cb) {
          that.logger.log(that.logger.LOG_LEVEL_DEBUG, '[PENDING] {' + curr_system.syst_id + '} (start' + mode_resume + ') current buffered instances:' + that.updated_system_instances[syst_id].map(function (i) {
            return i.hostname + '/' + i.instancenr + '/' + i.status;
          }).join(',')); // confirm if syst_instance_to_start (from sapstartsrv) if really a valid candidate by check its status in buffered instances
          // check if there is not a start in progress for this instance when in normal mode
          // OR is in resume mode

          if (is_resume_mode || that.updated_system_instances[syst_id].filter(function (i) {
            return i.status == 3;
          }
          /*&& i.instancenr == syst_instance_to_start.instancenr*/
          ).length == 0) {
            that.logger.log(that.logger.LOG_LEVEL_INFO, '[PENDING] {' + curr_system.syst_id + '} (start' + mode_resume + ') alert:' + alert.labels.alertname + ' on ' + syst_instance_to_start.hostname + '/' + syst_instance_to_start.ip_internal + '/' + syst_instance_to_start.instancenr); // Set *only* the starting instance in start WIP so it are not considered as active. Other instances are not changed. Prevent from shutting down all AS and trying to shut down same AS from the same alert when the stop takes more time than alert resending
            // set status == 3 for start in progress

            var index_curr_instance_start = that.updated_system_instances[syst_id].map(function (i) {
              return i.instancenr;
            }).indexOf(syst_instance_to_start.instancenr);

            if (index_curr_instance_start < 0) {
              index_curr_instance_start = that.updated_system_instances[syst_id].push(Object.assign({}, syst_instance_to_start, {
                status: 3,
                resume_on_step: that._resume_on_step.start.begin,
                resume_context: d
              })) - 1;
            } else {
              that.updated_system_instances[syst_id][index_curr_instance_start] = Object.assign({}, that.updated_system_instances[syst_id][index_curr_instance_start], {
                status: 3,
                resume_on_step: that._resume_on_step.start.begin,
                resume_context: d
              });
            }

            that.logger.log(that.logger.LOG_LEVEL_INFO, '[PENDING] {' + curr_system.syst_id + '} (start' + mode_resume + ') update to transition status:' + that.updated_system_instances[syst_id].map(function (i) {
              return i.hostname + '/' + i.instancenr + '/' + i.status;
            }).join(',')); // call async now to prevent delay of DB update due to waiting for stop operations 

            waterfall_cb(); // --- TRIGGER START SAP INSTANCE ----

            var counter_elt = d.counter.find(function (c) {
              return c.instancenr == syst_instance_to_start.instancenr;
            });
            var counter_instance = counter_elt ? counter_elt.value : 0; // Execution in normal mode 'live/on demand' => request by receiver
            // Execution in resume mode => re run on interrupted step
            // const is_normal_mode = that.updated_system_instances[syst_id][index_curr_instance_start].resume_on_step < 0

            that.logger.log(that.logger.LOG_LEVEL_MIN, '[PENDING] {' + curr_system.syst_id + '} (start' + mode_resume + ') triggered:' + syst_id + '/' + syst_instance_to_start.ip_internal + '/' + syst_instance_to_start.hostname + '/' + syst_instance_to_start.instancenr + ' (counter=' + (parseInt(counter_instance) + 1) + ' entity=' + entity_id + ')');
            async.series({
              // increment start counter
              incr: function incr(serie_cb) {
                if (!is_resume_mode || that.resume_here_on_interruption(syst_id, index_curr_instance_start, that._resume_on_step.start.counter_updated)) {
                  that.pushgtw_cli.pushCounter('counter', 'start', entity_id, syst_id, syst_instance_to_start.instancenr, alert.labels.alertname, parseInt(counter_instance) + 1);
                  that.save_resume_step(syst_id, index_curr_instance_start, that._resume_on_step.start.counter_updated);
                }

                serie_cb();
              },
              // Start EC2 host
              start: function start(serie_cb) {
                if (!is_resume_mode || that.resume_here_on_interruption(syst_id, index_curr_instance_start, that._resume_on_step.start.ec2_start_triggered)) {
                  that.logger.log(that.logger.LOG_LEVEL_INFO, '[PENDING] {' + curr_system.syst_id + '} (start' + mode_resume + ') trigger EC2 instance:' + syst_instance_to_start.ip_internal);
                  that.aws_cli.startEC2(syst_instance_to_start.ip_internal, serie_cb);
                  that.save_resume_step(syst_id, index_curr_instance_start, that._resume_on_step.start.ec2_start_triggered);
                } else serie_cb();
              },
              // Check EC2 status 
              check: function check(serie_cb) {
                var step_wait_sec = 20;
                var timeout_wait_sec = 300;
                var nb_iterations = Math.ceil(timeout_wait_sec / step_wait_sec);
                that.logger.log(that.logger.LOG_LEVEL_DEBUG, '[PENDING] {' + curr_system.syst_id + '} (start' + mode_resume + ') waiting for EC2 instance to actually start within timeout ' + timeout_wait_sec + ' sec:' + syst_instance_to_start.ip_internal);
                check_start_ec2_instance(that.aws_cli, nb_iterations, step_wait_sec * 1000, syst_instance_to_start.ip_internal, serie_cb);
              },
              // Provide soap cli
              soap: function soap(serie_cb) {
                var pfx_certif = null;
                var http_s = curr_system.is_encrypted ? {
                  protocol: 'https',
                  port_suffix: '14'
                } : {
                  protocol: 'http',
                  port_suffix: '13'
                };
                var soap_url = http_s.protocol + '://' + (syst_instance_to_start.ip_internal || syst_instance_to_start.hostname) + ':5' + syst_instance_to_start.instancenr + http_s.port_suffix + '/';

                if (curr_system.auth_method == 1) {
                  pfx_certif = that.certif_dir + '/' + curr_system.syst_id + '.pfx';
                }

                that.new_soap_client(soap_url, {
                  method: curr_system.auth_method,
                  // method is the index of options
                  options: [{
                    user: curr_system.username,
                    pwd: curr_system.password
                  }, {
                    pfx: pfx_certif
                  }]
                }, {}, serie_cb);
              }
            }, function (err, array_res) {
              var cli_data = array_res.soap; // var temp_updated_instance_idx = that.updated_system_instances[syst_id].findIndex(i => i.instancenr == syst_instance_to_start.instancenr)

              if (err || !cli_data) {
                that.logger.log(that.logger.LOG_LEVEL_ERROR, '[FAILED] {' + curr_system.syst_id + '} (start' + mode_resume + ') error:', err);

                switch (err) {
                  case that.aws_cli._errors.ec2_not_started:
                    // from that.aws_cli.startEC2
                    that.updated_system_instances[syst_id][index_curr_instance_start].status = -1;
                    that.updated_system_instances[syst_id][index_curr_instance_start].error = {
                      'occur_date': Date.now(),
                      'msg': that.aws_cli._errors.ec2_not_started
                    };
                    break;

                  case that._errors.soap_client_init:
                    // from new_soap_client
                    that.updated_system_instances[syst_id][index_curr_instance_start].status = -1;
                    that.updated_system_instances[syst_id][index_curr_instance_start].error = {
                      'occur_date': Date.now(),
                      'msg': that._errors.soap_client_init
                    };
                    break;

                  case _start_server_not_found: // from check_start_ec2_instance

                  case _start_server_timeout_error: // from check_start_ec2_instance

                  default:
                    // reset status to 0 with error
                    that.updated_system_instances[syst_id][index_curr_instance_start].status = -1;
                    that.updated_system_instances[syst_id][index_curr_instance_start].error = {
                      'occur_date': Date.now(),
                      'msg': _scaling_errors[err]
                    };
                    break;
                } // remove meta data, not needed anymore


                that.save_resume_step(syst_id, index_curr_instance_start, -1);
              } else {
                that.logger.log(that.logger.LOG_LEVEL_INFO, '[PENDING] {' + curr_system.syst_id + '} (start' + mode_resume + ') trigger start SAP instance:' + syst_instance_to_start.hostname + '/' + syst_instance_to_start.ip_internal + '/' + syst_instance_to_start.instancenr);
                async.series([function (series_cb) {
                  if (!is_resume_mode || that.resume_here_on_interruption(syst_id, index_curr_instance_start, that._resume_on_step.start.sap_start_triggered)) {
                    sapcontrol_operations$1[d.action.name].call(cli_data.soapcli, {}, function (err) {
                      that.save_resume_step(syst_id, index_curr_instance_start, that._resume_on_step.start.sap_start_triggered);

                      if (err !== undefined && err !== null) {
                        if (err.body) {
                          var start_error = err.body.match(/<faultstring>(.*?)<\/faultstring>/) && err.body.match(/<faultstring>(.*?)<\/faultstring>/)[1]; // Instance already started

                          if (start_error == 'Instance already started') {
                            that.updated_system_instances[syst_id][index_curr_instance_start].status = 1;
                          } else {
                            that.logger.log(that.logger.LOG_LEVEL_ERROR, '[FAILED] {' + curr_system.syst_id + '} (start' + mode_resume + ') sap instance error:' + start_error);
                            that.updated_system_instances[syst_id][index_curr_instance_start].status = -1;
                            that.updated_system_instances[syst_id][index_curr_instance_start].error = {
                              'occur_date': Date.now(),
                              'msg': _scaling_errors[_start_sap_error] + ':' + start_error
                            };
                          }
                        } else {
                          that.logger.log(that.logger.LOG_LEVEL_ERROR, '[FAILED] {' + curr_system.syst_id + '} (start' + mode_resume + ') sap instance error:', err);
                          that.updated_system_instances[syst_id][index_curr_instance_start].status = -1;
                          that.updated_system_instances[syst_id][index_curr_instance_start].error = {
                            'occur_date': Date.now(),
                            'msg': _scaling_errors[_start_sap_error]
                          };
                        } // remove meta data, not needed anymore


                        that.save_resume_step(syst_id, index_curr_instance_start, -1);
                        series_cb(err);
                      } else {
                        series_cb();
                      }
                    }); // end sapcontrol_operations
                  } else series_cb(); // resume mode, start triggered already

                }, function (series_cb) {
                  var step_wait_sec = 20;
                  var timeout_wait_sec = 300;
                  var nb_iterations = Math.ceil(timeout_wait_sec / step_wait_sec);
                  that.logger.log(that.logger.LOG_LEVEL_DEBUG, '[PENDING] {' + curr_system.syst_id + '} (start' + mode_resume + ') waiting for SAP instance to actually start within timeout ' + timeout_wait_sec + ' sec:' + syst_instance_to_start.hostname + '/' + syst_instance_to_start.ip_internal + '/' + syst_instance_to_start.instancenr);
                  check_start_sap_instance(cli_data.soapcli, nb_iterations, step_wait_sec * 1000, syst_instance_to_start.instancenr, function (err) {
                    if (err) {
                      that.updated_system_instances[syst_id][index_curr_instance_start].status = -1;
                      that.updated_system_instances[syst_id][index_curr_instance_start].error = {
                        'occur_date': Date.now(),
                        'msg': _scaling_errors[_start_sap_timeout_error]
                      };
                      that.logger.log(that.logger.LOG_LEVEL_MIN, '[COMPLETED] {' + curr_system.syst_id + '} (start' + mode_resume + ') partially started (EC2:OK, SAP:NOK): ' + syst_id + '/' + syst_instance_to_start.hostname + '/' + syst_instance_to_start.ip_internal + '/' + syst_instance_to_start.instancenr + ' error:', _scaling_errors[_start_sap_timeout_error]); // error handling : try restart

                      do_restart_sap(cli_data.soapcli, curr_system, syst_instance_to_start, index_curr_instance_start, 1);
                    } else {
                      that.updated_system_instances[syst_id][index_curr_instance_start].status = 1;
                      delete that.updated_system_instances[syst_id][index_curr_instance_start].error;
                      that.logger.log(that.logger.LOG_LEVEL_MIN, '[COMPLETED] {' + curr_system.syst_id + '} (start' + mode_resume + ') fully started:' + syst_id + '/' + syst_instance_to_start.hostname + '/' + syst_instance_to_start.ip_internal + '/' + syst_instance_to_start.instancenr);
                      that.save_resume_step(syst_id, index_curr_instance_start, -1);
                    }

                    series_cb();
                  });
                }]);
              }
            });
          } else {
            waterfall_cb(that._errors.start_ongoing);
          }
        }], function (waterfall_err) {
          // waterfall_err is not an error relating to operation execution, it does not involve any change on instance status but rather on business rules
          // and pre checks
          if (waterfall_err) {
            that.logger.log(that.logger.LOG_LEVEL_ERROR, '[CHECKS FAILED] {' + curr_system.syst_id + '} (start' + mode_resume + ') on ' + curr_system.ip_internal + '-' + curr_system.sid + ':', waterfall_err);
            queue_cb(waterfall_err); // switch (waterfall_err) {
            //   case that._errors.soap_client_init:
            //   case that._errors.conn_failed:
            //   case that._errors.ws_not_reachable:
            //   case that._errors.max_instances_reached:
            //   case that._errors.no_start_candidate:
            //   case that._errors.start_ongoing:
            //   default:
            //     queue_cb(waterfall_err)
            //     break
            // }
          } else {
            queue_cb(null, {
              'sending_sslcertifs': that.sending_sslcertifs[curr_system.syst_id + ''],
              'instances': that.updated_system_instances,
              'syst_id': curr_system.syst_id // 'error': waterfall_err

            });
          }
        });
      } else {
        that.logger.log(that.logger.LOG_LEVEL_ERROR, '[FAILED] {} (start' + mode_resume + '): no system provided');
        queue_cb('No system provided');
      }
    }

    function do_update_scaling_instance(d, queue_cb) {
      if (that.updated_system_instances[d.syst_id]) {
        var requested_instance = that.updated_system_instances[d.syst_id].filter(function (i) {
          return i.instancenr == d.instance_nr;
        })[0];

        if (requested_instance) {
          // remove resume meta data not required on receiver side
          // delete requested_instance.resume_context
          // delete requested_instance.resume_on_step
          that.logger.log(that.logger.LOG_LEVEL_DEBUG, '[PENDING] {' + d.syst_id + '} (update) :' + requested_instance.hostname + '/' + requested_instance.instancenr + '/' + requested_instance.status); // test if start or stop operation failed or timeout

          if (requested_instance.status == -1) {
            // the instance is in unknown state. check for system instances status update from sapstartsrv call (if manual restart was performed for instance)
            async.waterfall([// check system certificate
            function (waterfall_cb) {
              // cb returns nothing
              that.update_sending_ssl(d.syst_id, d.keys_buff, waterfall_cb);
            }, // connect to the entry point instance and provide soapclient
            function (waterfall_cb) {
              // that.logger.log(that.logger.LOG_LEVEL_DEBUG, 'connect to the entry point instance and provide soapclient')
              var http_s = {
                protocol: 'https',
                port_suffix: '14'
              };
              var soap_url = http_s.protocol + '://' + (requested_instance.ip_internal || requested_instance.hostname) + ':5' + d.instance_nr + http_s.port_suffix + '/';
              that.new_soap_client(soap_url, {
                method: 1,
                // method is the index of options
                options: [{}, {
                  pfx: that.certif_dir + '/' + d.syst_id + '.pfx'
                }]
              }, d, waterfall_cb);
            }, // Get list of instances and check system status
            function (cli_data, waterfall_cb) {
              // that.logger.log(that.logger.LOG_LEVEL_DEBUG, 'Get list of instances and check system status')
              cli_data.soapcli.GetSystemInstanceList({}, function (err, result) {
                if (!err && result && result.instance && result.instance.item) {
                  waterfall_cb(null, result.instance.item.find(function (x) {
                    return ('' + x.instanceNr).padStart(2, '0') == d.instance_nr;
                  }));
                } else {
                  waterfall_cb();
                }
              });
            }], function (err, updated_instance) {
              // queue_cb(null, that.updated_system_instances[d.syst_id].filter(i=>i.instancenr == d.instance_nr)[0])
              if (err) {
                queue_cb('Error getting system instance latest status ' + err);
              } else {
                queue_cb(null, {
                  'sending_sslcertifs': that.sending_sslcertifs[d.syst_id + ''],
                  'instance': updated_instance ? Object.assign(requested_instance, {
                    status: updated_instance.dispstatus == that._sap_statuses.green ? 1 : updated_instance.dispstatus == that._sap_statuses.yellow ? -1 : 0
                  }, {
                    resume_context: null,
                    resume_on_step: null
                  }) : Object.assign(requested_instance, {
                    resume_context: null,
                    resume_on_step: null
                  }),
                  'syst_id': d.syst_id
                });
              }
            });
          } else {
            // instance is in transition (stopping or starting)
            queue_cb(null, {
              'sending_sslcertifs': that.sending_sslcertifs[d.syst_id + ''],
              'instance': requested_instance,
              'syst_id': d.syst_id
            });
          }
        } else {
          that.logger.log(that.logger.LOG_LEVEL_ERROR, '[FAILED] {' + d.syst_id + '} (update) system not indexed:' + d.instance_nr);
          queue_cb('System instance not indexed');
        }
      } else {
        that.logger.log(that.logger.LOG_LEVEL_ERROR, '[FAILED] {' + d.syst_id + '} (update) system not active:' + d.syst_id);
        queue_cb('System instance not active');
      }
    }

    function send_notification(d) {
      // parameters must have at least one 'endpoint' property. Others param are set in URL 
      var req_data = null;
      var req_headers = {};
      var full_url = d.action.parameters.endpoint;

      switch (d.action.name) {
        case 'slack':
          var gen_fields = function gen_fields(text, list) {
            var blocks = [];

            if (list.length > 0) {
              blocks.push({
                "type": "section",
                "text": {
                  "type": "mrkdwn",
                  "text": "<https://scaling.worqloads.com|" + text + ">"
                }
              });
              list.forEach(function (alert) {
                blocks.push({
                  "type": "section",
                  "block_id": alert.fingerprint,
                  "fields": [{
                    "type": "mrkdwn",
                    "text": "*Notification*\n" + alert.labels.alertname
                  }, {
                    "type": "mrkdwn",
                    "text": "*System*\n" + alert.labels.sid + (alert.labels.hostname != undefined && alert.labels.hostname != '' ? '@' + alert.labels.hostname : '') + (alert.labels.sn != undefined && alert.labels.sn != '' ? ' [' + alert.labels.sn + ']' : '')
                  }]
                });
              });
              blocks.push({
                "type": "divider"
              });
            }

            return blocks;
          };

          req_data = {
            'text': d.alerts.length + ' notification' + (d.alerts.length > 1 && 's' || '') + '( ' + d.alerts.filter(function (x) {
              return x.status == 'firing';
            }
            /*&& !x.reminder*/
            ).length + ' new)',
            "blocks": gen_fields('New notifications', d.alerts.filter(function (x) {
              return x.status == 'firing';
            }
            /*&& !x.reminder*/
            )) // .concat(
            //   gen_fields('Reminders', d.alerts.filter(x => x.status == 'firing' && x.reminder))
            // )

          };
          break;

        case 'email':
          req_data = Object.assign(d, d.action.parameters); // var action_params = Object.keys(d.action.parameters)
          // action_params.splice(action_params.indexOf('endpoint'), 1)
          // action_params.forEach(function (k) {
          //   full_url += '&' + k + '=' + d.action.parameters[k]
          // })

          req_headers = {
            'headers': {
              'x-api-key': 'ZqDvnKwJhCz69koeSUSB59jIhyDMjHm3RMHyg675'
            }
          };
          break;
      }

      if (req_data != null) {
        axios.post(full_url, req_data, req_headers).then(function (response) {
          that.logger.log(that.logger.LOG_LEVEL_INFO, '[COMPLETED] {' + d.action.name + '} (notif)');
        })["catch"](function (error) {
          if (error) {
            that.logger.log(that.logger.LOG_LEVEL_ERROR, '[FAILED] {' + d.action.name + '} (notif):', error);
          }
        });
      }
    }

    async.series([// load scaling buffer from last process stopped for scaling doer only
    function (series_cb) {
      that.logger.log(that.logger.LOG_LEVEL_MIN, 'loading resume processing data...');
      async.waterfall([function (waterfall_cb) {
        that.redis_cli.get(that.company, waterfall_cb);
      }, function (buff_instances, waterfall_cb) {
        // get last values
        that.updated_system_instances = JSON.parse(buff_instances) && JSON.parse(buff_instances).root || {}; // reinit

        that.redis_cli.set(that.company, '{"root":{}}', waterfall_cb);
      }], function (err) {
        if (err) {
          that.logger.log(that.logger.LOG_LEVEL_ERROR, 'redis client get/set error:', err);
        }

        that.logger.log(that.logger.LOG_LEVEL_MIN, 'loaded from cache :', that.updated_system_instances);
        series_cb();
      });
    }, // resumes interrupted operations
    function (series_cb) {
      // if there is something (system, instances) to save...
      if (that.updated_system_instances && Object.keys(that.updated_system_instances).length > 0) {
        series_cb();
        Object.keys(that.updated_system_instances).forEach(function (syst_key) {
          async.eachOf(that.updated_system_instances[syst_key], function (instance, instance_idx, each_cb) {
            if (instance.resume_on_step > 0) {
              that.logger.log(that.logger.LOG_LEVEL_MIN, 'resuming interrupted scale processing operation:', instance.status);

              switch (instance.status) {
                case 2:
                  that.logger.log(that.logger.LOG_LEVEL_MIN, '(resume) stop on:', instance);
                  each_cb();
                  do_stop(instance.resume_context, function (err, data) {
                    if (err) {
                      that.logger.log(that.logger.LOG_LEVEL_ERROR, '(resume) stop error :', err);
                    } else {
                      that.logger.log(that.logger.LOG_LEVEL_DEBUG, '(resume) stop OK:', data);
                    }
                  }, true, instance.resume_on_step);
                  break;

                case 3:
                  that.logger.log(that.logger.LOG_LEVEL_MIN, '(resume) start on:', instance);
                  each_cb();
                  do_start(instance.resume_context, function (err, data) {
                    if (err) {
                      that.logger.log(that.logger.LOG_LEVEL_ERROR, '(resume) start error :', err);
                    } else {
                      that.logger.log(that.logger.LOG_LEVEL_DEBUG, '(resume) start OK:', data);
                    }
                  }, true, instance_idx);
                  break;

                default:
                  that.logger.log(that.logger.LOG_LEVEL_ERROR, '(resume) action type not supported:', instance.status);
                  each_cb();
                  break;
              }
            } else {
              // remove instance without resume
              delete that.updated_system_instances[syst_key][instance_idx];
              each_cb();
            }
          }, function (err) {
            if (err) that.logger.log(that.logger.LOG_LEVEL_ERROR, '(resume) actions error:', err); // remove undefined instance due to delete

            that.updated_system_instances[syst_key] = that.updated_system_instances[syst_key].filter(function (i) {
              return i != undefined;
            });
          });
        });
      } else series_cb();
    }, // listen for new kue job requests
    function (series_cb) {
      that.queue.process(that.QUEUES.webhook_exec, that.concurrency_nb, function (job, done) {
        if (job.data.action
        /*&& job.data.alerts */
        ) {
            switch (job.data.action.type) {
              case 0:
                // communication
                send_notification(job.data);
                done();
                break;

              case 1:
                // action
                var syst_id = job.data.system ? job.data.system.syst_id : job.data.syst_id;
                that.update_sending_ssl(syst_id, job.data.keys_buff, function (err) {
                  if (err) {
                    done('missing pfx');
                  } else {
                    switch (job.data.action.name) {
                      case 'Stop':
                        that.logger.log(that.logger.LOG_LEVEL_DEBUG, 'stop action data:', job.data);
                        if (!job.data.alerts) done();else do_stop(job.data, done);
                        break;

                      case 'Start':
                        that.logger.log(that.logger.LOG_LEVEL_DEBUG, 'start action data:', job.data);
                        if (!job.data.alerts) done();else do_start(job.data, done);
                        break;

                      case 'UpdateScalingInstance':
                        do_update_scaling_instance(job.data, done);
                        break;

                      default:
                        done();
                        break;
                    }
                  }
                });
                break;

              default:
                that.logger.log(that.logger.LOG_LEVEL_ERROR, 'action type not supported:', job.data.action.type);
                done();
                break;
            }
          } else {
          that.logger.log(that.logger.LOG_LEVEL_ERROR, 'no data provided');
          done();
        }
      });
      series_cb();
    }]);
  },
  get_cloud_region: function get_cloud_region(cb) {
    var that = this;
    var cp_type = 1; // AWS

    switch (cp_type) {
      case 0:
        // AZURE
        break;

      case 1:
        // AWS using IMDSv1
        var meta_data_url = "http://169.254.169.254/latest/meta-data/placement/availability-zone";
        axios.get(meta_data_url).then(function (region) {
          if (region.data) {
            that.logger.log(that.logger.LOG_LEVEL_INFO, 'get_cloud_region ', region.data);
            that.region = region.data.slice(0, -1); // get region from availability zone

            cb();
          } else {
            that.logger.log(that.logger.LOG_LEVEL_ERROR, 'get_cloud_region : no data');
            cb();
          }
        })["catch"](function (error) {
          if (error) {
            that.logger.log(that.logger.LOG_LEVEL_ERROR, 'get_cloud_region:', error);
          }

          cb();
        });
        break;
    }
  },
  // helper functions
  // ----------------------------------------------------------------------
  // check status of SAP system based on its instances status
  // SAP system is DOWN if CI is down or all DI are down
  check_system_status: function check_system_status(instance_items) {
    var that = this;
    var di_status_err = [];
    var ci_down = false;

    for (var j = 0, item_len = instance_items.length; j < item_len; j++) {
      if (instance_items[j].features.split('|').indexOf('MESSAGESERVER') >= 0 || instance_items[j].features.split('|').indexOf('ENQUE') >= 0) {
        if (instance_items[j].dispstatus != that._sap_statuses.green) {
          ci_down = true;
          break;
        }
      } else {
        di_status_err.push({
          'instancenr': ('' + instance_items[j].instanceNr).padStart(2, '0'),
          'status': instance_items[j].dispstatus == that._sap_statuses.green ? 1 : 0
        });
      }
    }

    if (ci_down || di_status_err.reduce(function (accumulator, currentValue) {
      return accumulator + currentValue;
    }, 0) == 0) {
      return that._sap_statuses.red;
    }

    return that._sap_statuses.green;
  },
  // recursive func to check conn_retries_max times if connection is down before confirmation
  check_failed_conn: function check_failed_conn(soap_client, job_data) {
    var that = this;

    if (that.conn_retries[job_data.system.syst_id] <= that.conn_retries_max) {
      setTimeout(function () {
        soap_client.GetSystemInstanceList({}, function (err, result) {
          if (err || !result || !result.instance || !result.instance.item) {
            that.conn_retries[job_data.system.syst_id]++;
            that.check_failed_conn(soap_client, job_data);
          } else {
            var syst_status = that.check_system_status(result.instance.item);

            if (syst_status == that._sap_statuses.red || syst_status == that._sap_statuses.gray) {
              that.conn_retries[job_data.system.syst_id]++;
              that.check_failed_conn(soap_client, job_data);
            } else that.pushgtw_cli.pushUpInstance('up', job_data.entity_id, job_data.system.syst_id, that.region, job_data.system.sid, 1);
          }
        });
      }, 20000); // 3 retries with 20sec to valide in 1 min
    } else {
      that.deletePrometheus('scale', job_data.entity_id, job_data.system.syst_id, job_data.system.sid, job_data.system.instances.map(function (s) {
        return {
          'instancenr': s.instancenr,
          'status': 0
        };
      }));
      that.pushgtw_cli.pushUpInstance('up', job_data.entity_id, job_data.system.syst_id, that.region, job_data.system.sid, 0);
    }
  },
  // (de)activate debug mode
  debug: function debug(on_off) {
    if (this.logger) {
      this.logger.debug(on_off);
    }
  },
  // add meta data for instance to be able to resume if interrupted
  save_resume_step: function save_resume_step(syst_id, index, step) {
    var that = this;
    var resume_data = step < 0 ? {
      resume_on_step: step,
      resume_context: null
    } : {
      resume_on_step: step
    };
    that.updated_system_instances[syst_id][index] = Object.assign({}, that.updated_system_instances[syst_id][index], resume_data);
  },
  resume_here_on_interruption: function resume_here_on_interruption(syst_id, index_resume_instance, curr_step) {
    var that = this;

    if (that.updated_system_instances[syst_id] && that.updated_system_instances[syst_id][index_resume_instance]) {
      return that.updated_system_instances[syst_id][index_resume_instance].resume_on_step < curr_step;
    } else return false;
  },
  // on process exit:
  // - save the content of if this.updated_system_instances to file to reloading on next start
  // - clean exit of clients
  graceful_shutdown: function graceful_shutdown() {
    var that = this; // if there is something (system, instances) to save...

    if (that.updated_system_instances && Object.keys(that.updated_system_instances).length > 0) {
      // need to save the wip step: to resume interrupted operation
      that.redis_cli.set(that.company, JSON.stringify({
        'root': that.updated_system_instances
      }), function (err) {
        if (err) {
          that.logger.log(that.logger.LOG_LEVEL_ERROR, 'redis client get error:', err);
        } else {
          that.logger.log(that.logger.LOG_LEVEL_DEBUG, 'system instances buffer saved');
        }
      });
    } // close kue connection


    if (that.queue) that.queue.shutdown(5000, function (err) {
      that.logger.log(that.logger.LOG_LEVEL_MIN, 'Kue shutdown: ', err || '');
    }); // close redis connection

    if (that.redis_cli) that.redis_cli.quit(); // file based version
    // var that = this
    // // if there is something (system, instances) to save...
    // if (
    //   Object.keys(that.updated_system_instances).length > 0 &&
    //   Object.keys(that.updated_system_instances).map(syst_id => that.updated_system_instances[syst_id].length > 0).reduce((acc, curr) => { return acc && curr })
    // ) {
    //   // create or replace file
    //   fs.writeFile(
    //     process.cwd() + '/.scaling_instances_in_progress',
    //     Buffer.from(JSON.stringify(that.updated_system_instances)),
    //     'binary',
    //     (err) => {
    //       if (err) that.logger.log(that.logger.LOG_LEVEL_ERROR, '[FAILED] (saving) scaling instances buffer:', err)
    //       else that.logger.log(that.logger.LOG_LEVEL_DEBUG, '[COMPLETED] (saving) scaling instances buffer:', that.updated_system_instances)
    //     }
    //   )
    // }
  } // file based version
  // load_scaling_instances(local_config, callback) {
  //   var that = this
  // const file_scaling_instances_in_progress = process.cwd() + '/.scaling_instances_in_progress'
  // fs.access(file_scaling_instances_in_progress, fs.F_OK, (err) => {
  //   if (err) {
  //     if (err) that.logger.log(that.logger.LOG_LEVEL_ERROR, '[FAILED] (loading) no access to scaling instances buffer file:', err)
  //     callback()
  //   } else {
  //     fs.readFile(file_scaling_instances_in_progress, (err, data) => {
  //       if (err) that.logger.log(that.logger.LOG_LEVEL_ERROR, '[FAILED] (loading) scaling instances buffer:', err)
  //       else if (data && data.toString().length > 0) {
  //         that.updated_system_instances = JSON.parse(data.toString())
  //         that.logger.log(that.logger.LOG_LEVEL_DEBUG, '[COMPLETED] (loaded) scaling instances buffer:', that.updated_system_instances)
  //       }
  //       fs.unlink(file_scaling_instances_in_progress, (err) => {
  //         if (err) that.logger.log(that.logger.LOG_LEVEL_ERROR, '[FAILED] (deleting) scaling instances buffer:', err)
  //       })
  //       callback()
  //     })
  //   }
  // })
  // }

};
/*
text: d843eb7ba29c64ae4f541605e1b621262f91c2b89bd8ffeb4cf91e7470b971d2be51531b8aac2308d9f0624357dfed40ffed0f8d7dfbda6a7c240174cfa475d46fdeb20f4f30ae3c
key:  5e7e2a8b6e012a2a77c48e65b6b6c753b449b64d4807
5e42cd71b3d6cc3c03d57b62

decrypt: d843eb7ba29c64ae4f541605e1b621262f91c2b89bd8ffeb4cf91e7470b971d2be51531b8aac2308d9f0624357dfed40ffed0f8d7dfbda6a7c240174cfa475d46fdeb20f4f30ae3c 
key: 5e7e2a8b6e012a2a77c48e65b6b6c753b449b64d4807
*/
// for redis db

function decrypt(text, key) {
  var iv = Buffer.from(text.substring(98, text.length - 14), 'hex');
  var encryptedText = Buffer.from(text.substring(2, text.length - 32 - 14), 'hex');
  var decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(key.substring(0, 32)), iv);
  var decrypted = decipher.update(encryptedText);
  return Buffer.concat([decrypted, decipher["final"]()]).toString();
} // Export the class


var scaledoer = ScaleDoer;

try {
  var ScaleDoer$1 = scaledoer,
      fs = fs$1,
      config_file = __dirname + '/conf.json';

  if (!fs.existsSync(config_file)) {
    console.error('E missing configuration file:', config_file);
    throw {
      code: 2
    };
  } else {
    var localconf = JSON.parse(fs.readFileSync(config_file));
    var myenv = process.env.NODE_ENV || 'production';
    var checkScaleDoer = new ScaleDoer$1();
    checkScaleDoer.init(Object.assign(localconf[myenv], {
      'dbindex': 1
    }), checkScaleDoer.checkconnection); // dynamic (de)activation of debug mode

    process.on('SIGUSR1', function () {
      console.log("I switching debug mode ON");
      checkScaleDoer.debug(true);
    });
    process.on('SIGUSR2', function () {
      console.log("I switching debug mode OFF");
      checkScaleDoer.debug(false);
    });
  }
} catch (e) {
  console.error('Exception raised:', e.code || e);
  process.exit(1);
}

process.on('exit', function (code) {
  return console.log('I Scale Doer Check ! About to exit with code ' + code);
});
