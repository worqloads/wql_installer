(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory(require('axios'), require('async'), require('moment'), require('aws-sdk'), require('kue'), require('cron'), require('soap')) :
  typeof define === 'function' && define.amd ? define(['axios', 'async', 'moment', 'aws-sdk', 'kue', 'cron', 'soap'], factory) :
  (global.scaledoercheck = factory(global.axios,global.async,global.moment,global.awsSdk,global.kue,global.cron,global.soap));
}(this, (function (axios,async,moment,awsSdk,kue,cron,soap) { 'use strict';

  axios = axios && axios.hasOwnProperty('default') ? axios['default'] : axios;
  async = async && async.hasOwnProperty('default') ? async['default'] : async;
  moment = moment && moment.hasOwnProperty('default') ? moment['default'] : moment;
  awsSdk = awsSdk && awsSdk.hasOwnProperty('default') ? awsSdk['default'] : awsSdk;
  kue = kue && kue.hasOwnProperty('default') ? kue['default'] : kue;
  cron = cron && cron.hasOwnProperty('default') ? cron['default'] : cron;
  soap = soap && soap.hasOwnProperty('default') ? soap['default'] : soap;

  var worker = {
    development: {
      systems_id: ["5a6a298ea50ddcabaf6ba6ea", "5a6a3ad73035caacacdd41ab"],
      nb_workers: 10
      // proxy_ip: '10.0.1.3'
    },
    production: {
      systems_id: ["5a6a298ea50ddcabaf6ba6ea", "5a6a3ad73035caacacdd41ab"],
      nb_workers: 10
      // proxy_ip: '10.0.1.3'
    }
  };

  var redis = {
    // Dev instance
    development: {
      port: 6379,
      host: '10.0.1.21',
      auth: 'klfdscd-wqqwxsudsjkjs&0921foobared',
      db: 3, // if provided select a non-default redis db
      options: {
        // see https://github.com/mranney/node_redis#rediscreateclient
      }
    },
    // Production instance
    production: {
      port: 16379,
      host: '35.246.148.61',
      auth: '69571ba1390d88a0d5ea4c0d919026a8da8be80f',
      db: 3, // if provided select a non-default redis db
      options: {
        // see https://github.com/mranney/node_redis#rediscreateclient
      }
    }
  };

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
  function PushCli(endpoint) {
    console.log('! PushCli ! Constructor begins');

    this.gtw_url = endpoint; // 'http://'+prometheusGtw[env].pushgateway_host+':'+prometheusGtw[env].pushgateway_port
    this.metrics_caches = {}; // {instance : [ array of labels, kpi_value, kpi]}
  }

  // Class definition
  PushCli.prototype = {
    Constructor: PushCli,

    // Private methods
    generateGroupings: function (groupings) {
      if (!groupings) {
        return '';
      }
      return Object.keys(groupings).map(key => `/${encodeURIComponent(key)}/${encodeURIComponent(groupings[key])}`).join('');
    },

    // Init an instance (SAP system)
    addInstance: function (syst_id) {
      // console.log('==== pshgtw addInstance '+syst_id)
      this.metrics_caches[syst_id] = {};
    },

    // Remove an Instance (SAP system)
    deleteInstance: function (job, suid, tuid, tname, sap_id) {
      var self = this;
      const syst_id = suid + tuid;

      delete this.metrics_caches[syst_id];
      //Delete all metrics for jobName & instance
      // self.del(job,suid,tuid)
      self.delSerie(job, { instance: suid + '' + tuid });
      // Update SAP Up status
      self.pushUpInstance('up', suid, tuid, tname, sap_id, 0);
    },

    // Push SAP system Up state for a specified instance (SAP system)!
    pushUpInstance: function (jobname = 'up', entity_id, systId, tenantId, tenantName, sid, status) {
      var self = this;
      const tenant = tenantName != undefined && tenantName != '' ? ',tenant="' + tenantName + '" ' : '';
      const groupings = tenantName != undefined && tenantName != '' ? { instance: systId + '' + tenantId } : { instance: systId };
      var req = '# TYPE status_up gauge\n' + 'status_up {instance="' + systId + tenantId + '",entity_id="' + entity_id + '",sid="' + sid + '"' + tenant + ' } ' + status + '\n';
      axios.post(self.gtw_url + '/metrics/job/' + encodeURIComponent(jobname) + self.generateGroupings(groupings), req).catch(function (error) {
        console.error('pushUpInstance error:', error);
      });
      // delete status_up for sap hana SID that went singledb to MDC
      if (tenant != undefined && tenant != '') {
        // self.del('up', systId, '')
        self.delSerie('up', { instance: systId });
      }
    },

    // Push SAP instance Up state!
    pushUpSAPInstance: function (jobname = 'up', entity_id, systId, sid, instances) {
      var self = this;
      const groupings = { instance: systId };
      var req = '# TYPE status_instance_up gauge\n';
      instances.forEach(i => {
        req += 'status_instance_up {instance="' + systId + '",entity_id="' + entity_id + '",sid="' + sid + '",sn="' + i.instancenr + '"} ' + i.status + '\n';
      });
      axios.post(self.gtw_url + '/metrics/job/' + encodeURIComponent(jobname) + self.generateGroupings(groupings), req).catch(function (error) {
        console.error('pushUpSAPInstance error:', error);
      });
    },

    // Push KPIs values to the gateway for a specified instance!
    pushInstance: function (jobname, systId, cb) {
      var self = this;
      var arr_filter_keys = Object.keys(self.metrics_caches[systId]).filter(x => self.metrics_caches[systId][x].length > 0);
      // console.log('==== pshgtw pushInstance '+systId)
      async.each(arr_filter_keys, function (kpi_id, callback) {
        const req = '# TYPE ' + kpi_id + ' gauge\n' + self.metrics_caches[systId][kpi_id].map(x => kpi_id + ' ' + x).join('\n') + '\n';
        // console.log("push:",req)
        axios.post(self.gtw_url + '/metrics/job/' + encodeURIComponent(jobname) + self.generateGroupings({ instance: systId }), req).then(function (response) {
          self.metrics_caches[systId][kpi_id] = [];
          callback();
        }).catch(function (error) {
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
    },

    // Set kpi and lables into caches for futur push
    set: function (labelsnames, kpiname, value, system_id) {
      var self = this;
      var kpi = kpiname.replace(/-|\(|\)|\[|\]|\%|\+|\.|\s/g, '_');
      // console.log('==== pshgtw set : '+system_id+' '+kpi+' >> self.metrics_caches[system_id]',self.metrics_caches[system_id])
      var kpi_value = value == null ? 0 : isNaN(value) ? Math.round(parseInt(moment(value, 'YYYY/MM/DD hh:mm:ss').format('X'))) : Math.round(parseInt(value));
      if (!self.metrics_caches[system_id][kpi]) self.metrics_caches[system_id][kpi] = [];
      // Check if KPI with same labels has already been submitting since the last pushInstance
      const kpi_is_set_idx = self.metrics_caches[system_id][kpi].map(x => x.split(' ')[0]).indexOf(labelsnames /*+' '+kpi_value*/);
      if (kpi_is_set_idx >= 0) {
        // If so, update the value with the most recent one by deleting first, then inserting
        self.metrics_caches[system_id][kpi].splice(kpi_is_set_idx, 1);
      }
      self.metrics_caches[system_id][kpi].push(labelsnames + ' ' + kpi_value);
    },

    // Delete last pushed metrics in Prometheus if connection to system (suid) is lost for (conn_retries_max) tentatives
    // del : function (jobname, sap_id,tenant_id,tenant_name) {
    del: function (jobname, sap_id, tenant_id) {
      var self = this;

      // curl -X DELETE http://pushgateway.example.org:9091/metrics/job/some_job/instance/some_instance
      axios.delete(self.gtw_url + '/metrics/job/' + encodeURIComponent(jobname) + self.generateGroupings({ instance: sap_id + '' + tenant_id })).then(function (response) {})
      // .then(function(response){
      //   console.log('del:',response)
      // })
      .catch(function (error) {
        console.error('pshgtw::del::error :', error);
      });
    },

    delSerie: function (jobname, matching_condition) {
      var self = this;

      // curl -X DELETE http://pushgateway.example.org:9091/metrics/job/some_job/instance/some_instance
      axios.delete(self.gtw_url + '/metrics/job/' + encodeURIComponent(jobname) + self.generateGroupings(matching_condition)).then(function (response) {})
      // .then(function(response){
      //   console.log('del:',response)
      // })
      .catch(function (error) {
        console.error('pshgtw::delSerie::error :', error);
      });
    },

    delInstance: function (jobname, instance_id) {
      var self = this;

      // curl -X DELETE http://pushgateway.example.org:9091/metrics/job/some_job/instance/some_instance
      axios.delete(self.gtw_url + '/metrics/job/' + encodeURIComponent(jobname) + self.generateGroupings({ instance: instance_id })).then(function (response) {})
      // .then(function(response){
      //   console.log('del:',response)
      // })
      .catch(function (error) {
        console.error('pshgtw::delInstance::error :', error);
      });
    }

    // Export the class
  };var pushcli = PushCli;

  var sapcontrol_operations = {
      "ABAPGetComponentList": function (arg1, cb) {
          this.ABAPGetComponentList(arg1, cb);
      },
      "GetProcessList": function (arg1, cb) {
          this.GetProcessList(arg1, cb);
      },
      "GetAlerts": function (arg1, cb) {
          this.GetAlerts(arg1, cb);
      },
      "GetAlertTree": function (arg1, cb) {
          this.GetAlertTree(arg1, cb);
      },
      "GetEnvironment": function (arg1, cb) {
          this.GetEnvironment(arg1, cb);
      },
      "GetVersionInfo": function (arg1, cb) {
          this.GetVersionInfo(arg1, cb);
      },
      "GetQueueStatistic": function (arg1, cb) {
          this.GetQueueStatistic(arg1, cb);
      },
      "GetInstanceProperties": function (arg1, cb) {
          this.GetInstanceProperties(arg1, cb);
      },
      "ABAPGetWPTable": function (arg1, cb) {
          this.ABAPGetWPTable(arg1, cb);
      },
      "Start": function (arg1, cb) {
          this.Start(arg1, cb);
      },
      "Stop": function (arg1, cb) {
          this.Stop(arg1, cb);
      },
      // "StartSystem": function ( arg1, cb) { this.StartSystem(arg1, cb ) },
      // "StopSystem": function ( arg1, cb) { this.StopSystem(arg1, cb ) },
      // "RestartSystem": function ( arg1, cb) { this.RestartSystem(arg1, cb ) },
      "GetSystemInstanceList": function (arg1, cb) {
          this.GetSystemInstanceList(arg1, cb);
      },
      "ABAPGetSystemWPTable": function (arg1, cb) {
          this.ABAPGetSystemWPTable(arg1, cb);
      },
      "GetCallstack": function (arg1, cb) {
          this.GetCallstack(arg1, cb);
      },
      "J2EEGetProcessList2": function (arg1, cb) {
          this.J2EEGetProcessList2(arg1, cb);
      },
      "J2EEGetThreadList2": function (arg1, cb) {
          this.J2EEGetThreadList2(arg1, cb);
      },
      "J2EEGetWebSessionList": function (arg1, cb) {
          this.J2EEGetWebSessionList(arg1, cb);
      },
      "J2EEGetCacheStatistic2": function (arg1, cb) {
          this.J2EEGetCacheStatistic2(arg1, cb);
      },
      "J2EEGetVMHeapInfo": function (arg1, cb) {
          this.J2EEGetVMHeapInfo(arg1, cb);
      },
      "J2EEGetEJBSessionList": function (arg1, cb) {
          this.J2EEGetEJBSessionList(arg1, cb);
      },
      "J2EEGetRemoteObjectList": function (arg1, cb) {
          this.J2EEGetRemoteObjectList(arg1, cb);
      },
      "J2EEGetClusterMsgList": function (arg1, cb) {
          this.J2EEGetClusterMsgList(arg1, cb);
      },
      "J2EEGetSharedTableInfo": function (arg1, cb) {
          this.J2EEGetSharedTableInfo(arg1, cb);
      },
      "J2EEGetThreadCallStack": function (arg1, cb) {
          this.J2EEGetThreadCallStack(arg1, cb);
      },
      "J2EEGetThreadTaskStack": function (arg1, cb) {
          this.J2EEGetThreadTaskStack(arg1, cb);
      },
      "J2EEGetComponentList": function (arg1, cb) {
          this.J2EEGetComponentList(arg1, cb);
      },
      "ICMGetThreadList": function (arg1, cb) {
          this.ICMGetThreadList(arg1, cb);
      },
      "ICMGetConnectionList": function (arg1, cb) {
          this.ICMGetConnectionList(arg1, cb);
      },
      "ICMGetCacheEntries": function (arg1, cb) {
          this.ICMGetCacheEntries(arg1, cb);
      },
      "ICMGetProxyConnectionList": function (arg1, cb) {
          this.ICMGetProxyConnectionList(arg1, cb);
      },
      "WebDispGetServerList": function (arg1, cb) {
          this.WebDispGetServerList(arg1, cb);
      },
      "EnqGetLockTable": function (arg1, cb) {
          this.EnqGetLockTable(arg1, cb);
      },
      "EnqGetStatistic": function (arg1, cb) {
          this.EnqGetStatistic(arg1, cb);
      }

      // f = function name
      // syst = _id, sid
      // instance = nr, hostname, features
      // t = type
      // e = entity id
      // c = customer (id + name)
      // restricted_kpis = array with for NAK only => to save only these KPIs in prometheus
  };var sapctrl_process_func = function (err, result, f, syst, instance, t, entity_id, customer, restricted_kpis, rule_id, callback) {
      var that = this;
      if (err) {
          console.error('execution error of (' + f + '@' + syst.sid + ') :' + err && err.body);
          // delete prmths
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
                  const mte_separator = that.kpiname_separator; // '_'
                  // const inactive_state = 'SAPControl-GRAY'

                  const def_kpi_name = function (t, elt) {
                      var new_unit = elt.unit.replace(/\%/g, 'percent').replace(/\//g, '_per_').replace(/\W+/g, '').toLowerCase();
                      if (new_unit == '') new_unit = 'nb';
                      if (t.toUpperCase() != 'ALL') {
                          return that.kpi_prefix_sap + t.toLowerCase() + '_' + elt.kpi.replace(/\W+/g, '') + '__' + new_unit;
                      } else {
                          return that.kpi_prefix_sap + elt.kpi.replace(/\W+/g, mte_separator) + '__' + new_unit;
                      }
                  };
                  // Function to create the node
                  const create_node = function (p, sep, e, v) {
                      var res = {
                          value: isNaN(v[0].replace(/\s/g, '')) ? 0 : Math.round(parseInt(v[0].replace(/\s/g, ''))),
                          type: t,
                          unit: v.length > 1 && v[1] || ''
                      };
                      if (e.parent > 1
                      // && result.tree.item[e.parent].ActualValue != inactive_state
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
                                                      break;
                                                  case 'Lan':
                                                      return Object.assign(res, {
                                                          network_int: p[3].name,
                                                          category: 'OperatingSystem',
                                                          kpi: 'Network_' + e.name
                                                      });
                                                      break;
                                                  default:
                                                      return Object.assign(res, {
                                                          category: p[Math.max(p.length - 2, 1)].name,
                                                          kpi: p.slice(Math.max(p.length - 1, 0), p.length).map(x => x.name).join(sep) + sep + e.name
                                                      });
                                              }
                                          } else {
                                              return Object.assign(res, {
                                                  category: p[Math.max(p.length - 2, 1)].name,
                                                  kpi: p.slice(Math.max(p.length - 1, 0), p.length).map(x => x.name).join(sep) + sep + e.name
                                              });
                                          }
                                          break;
                                      case 'Microsoft SQL Server':
                                          if (p.length >= 4) {
                                              switch (p[2].name) {
                                                  case 'Space management':
                                                      const dbf = p[4].name.split('/').pop();
                                                      return Object.assign(res, {
                                                          database: p[3].name.split(':')[1],
                                                          db_datafile: dbf,
                                                          category: p[2].name,
                                                          kpi: e.name.replace(new RegExp(dbf.replace(/(\.[a-z]{3})$/gi, '') + ' ', "gi"), '')
                                                      });
                                                      break;
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
                                                      break;
                                                  default:
                                                      return Object.assign(res, {
                                                          category: p[Math.max(p.length - 2, 1)].name,
                                                          kpi: p.slice(Math.max(p.length - 1, 0), p.length).map(x => x.name).join(sep) + sep + e.name
                                                      });
                                                      break;
                                              }
                                          } else {
                                              return Object.assign(res, {
                                                  category: p[Math.max(p.length - 2, 1)].name,
                                                  kpi: p.slice(Math.max(p.length - 1, 0), p.length).map(x => x.name).join(sep) + sep + e.name
                                              });
                                          }
                                          break;
                                      case 'InstanceAsTask':
                                      case 'Server Configuration':
                                          // we only save in promtheus numerical values
                                          if (v[0].match(/^([0-9]|\s)+(\.[0-9]+)?$/g)) {
                                              return Object.assign(res, {
                                                  category: p[1].name,
                                                  kpi: p.slice(Math.max(p.length - 1, 0), p.length).map(x => x.name).join(sep) + sep + e.name
                                              });
                                          }
                                          break;
                                      case 'R3Services':
                                          if (p.length >= 3 && p[2].name == 'ICM') {
                                              return Object.assign(res, {
                                                  category: 'R3Services',
                                                  kpi: p.slice(Math.max(p.length - 2, 0), p.length).map(x => x.name).join(sep) + sep + e.name
                                              });
                                          } else {
                                              return Object.assign(res, {
                                                  category: 'R3Services',
                                                  kpi: p.slice(Math.max(p.length - 1, 0), p.length).map(x => x.name).join(sep) + sep + e.name
                                              });
                                          }
                                          break;
                                      default:
                                          return Object.assign(res, {
                                              category: p[Math.max(p.length - 2, 1)].name,
                                              kpi: p.slice(Math.max(p.length - 1, 0), p.length).map(x => x.name).join(sep) + sep + e.name
                                          });
                                          break;
                                  }
                              } /*else {
                                  console.log('cas non gere:',e)
                                }*/
                          } else {
                          return null;
                      }
                  };
                  if (result.tree && result.tree.item) {
                      result.tree.item.forEach(element => {
                          if (element.parent > parent) {
                              parents_name.push({
                                  idx: element.parent,
                                  name: result.tree.item[element.parent].name,
                                  status: result.tree.item[element.parent].ActualValue
                              });
                              const v = element.description.split(' ');

                              // support values with 2 kpis: ex "Size:11280 in 	Used:11232"
                              if (v[0].indexOf(':') > 0) {
                                  v.forEach(pair => {
                                      const vv = pair.split(':');
                                      if (vv.length == 2 && vv[1].match(/[0-9]+(\.[0-9]+)?/g) /* && element.ActualValue != inactive_state */) {
                                              // console.log('1 valid :', vv)
                                              tmp_nodes = tmp_nodes.concat([create_node(parents_name, mte_separator, Object.assign(element, { name: element.name + mte_separator + vv[0] }), [vv[1]])]);
                                          }
                                  });
                              } else {
                                  // create only valid nodes (that only contains numbers)
                                  if (v[0].match(/[0-9]+(\.[0-9]+)?/g) /* && element.ActualValue != inactive_state */) {
                                          tmp_nodes = tmp_nodes.concat([create_node(parents_name, mte_separator, element, [v.reduce((acc, cur) => {
                                              return cur.match(/[0-9]+(\.[0-9]+)?/g) ? acc + cur : acc;
                                          }, ''), v[v.length - 1].replace(/\s|[0-9]/g, '')] // to support both "12121 23132" => "1212123132" and "1221 MB"
                                          )]);
                                      }
                                  // tmp_nodes = ( v[0].match(/\s+[0-9]+(\.[0-9]+)?/g ) /* && element.ActualValue != inactive_state */ ) ? 
                                  //     [ create_node(parents_name, mte_separator, element, v) ] : []
                              }
                              parent = element.parent;
                          } else if (element.parent == parent) {
                              const v = element.description.split(' ');

                              if (v[0].indexOf(':') > 0) {
                                  // console.log( "2. MULTIPLE VALUES :", v)
                                  // support values with 2 kpis: ex "Size:11280 in 	Used:11232"
                                  v.forEach(pair => {
                                      const vv = pair.split(':');
                                      if (vv.length == 2 && vv[1].match(/[0-9]+(\.[0-9]+)?/g) /* && element.ActualValue != inactive_state */) {
                                              tmp_nodes = tmp_nodes.concat([create_node(parents_name, mte_separator, Object.assign(element, { name: element.name + mte_separator + vv[0] }), [vv[1]])]);
                                          }
                                  });
                              } else {
                                  // create only valid nodes (that only contains numbers)
                                  if (v[0].match(/[0-9]+(\.[0-9]+)?/g) /* && element.ActualValue != inactive_state */) {
                                          tmp_nodes = tmp_nodes.concat([create_node(parents_name, mte_separator, element, [v.reduce((acc, cur) => {
                                              return cur.match(/[0-9]+(\.[0-9]+)?/g) ? acc + cur : acc;
                                          }, ''), v[v.length - 1].replace(/\s|[0-9]/g, '')] // to support both "12121 23132" => "1212123132" and "1221 MB"
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
                      });
                      // console.log('Result of (' + f + '@' + syst.sid + ')= ');
                      // end_nodes/*.filter(x=>x.is_valid)*/.forEach(e => console.log(e))
                      if (!restricted_kpis || restricted_kpis.length == 0) {
                          end_nodes.forEach(e => {
                              if (e) {
                                  // original worqloads version
                                  // var labels = 'instance="'+syst._id+'",sid="'+ syst.sid+'",category="'+ e.category+'",type="'+ e.type+'",entity_id="'+ entity_id+'"'//,hostname="'+ instance.hostname+'"'
                                  // Scaler with limited labels
                                  var labels = 'instance="' + syst._id + '",sid="' + syst.sid + '",entity_id="' + entity_id + ',features="' + instance.features + '"'; //,hostname="'+ instance.hostname+'"'
                                  if (instance.sn != undefined) labels += ',sn="' + instance.sn + '"';
                                  if (rule_id != undefined) labels += ',rule_id="' + rule_id + '"';
                                  if (customer != undefined) labels += ',customer="' + customer.id + '__' + customer.name + '"';
                                  if (instance.hostname != undefined) labels += ',hostname="' + instance.hostname + '"';
                                  if (instance.ip_internal != undefined) labels += ',ip_internal="' + instance.ip_internal + '"';
                                  if (e.filesystem != undefined) labels += ',filesystem="' + e.filesystem + '"';
                                  if (e.network_int != undefined) labels += ',network_int="' + e.network_int + '"';
                                  if (e.database != undefined) labels += ',database="' + e.database + '"';
                                  if (e.db_datafile != undefined) labels += ',db_datafile="' + e.db_datafile + '"';
                                  that.pushgtw_cli.set('{' + labels + '}', def_kpi_name(t, e), e.value, syst._id);
                              }
                          });
                      } else {
                          end_nodes.forEach(e => {
                              if (e) {
                                  var kpi_name = def_kpi_name(t, e);
                                  if (restricted_kpis.indexOf(kpi_name) >= 0) {
                                      // original worqloads version
                                      // var labels = 'instance="'+syst._id+'",sid="'+ syst.sid+'",category="'+ e.category+'",type="'+ e.type+'",entity_id="'+ entity_id+'"'//,hostname="'+ instance.hostname+'"'
                                      // Scaler with limited labels
                                      var labels = 'instance="' + syst._id + '",sid="' + syst.sid + '",type="' + e.type + '",entity_id="' + entity_id + '"'; //,hostname="'+ instance.hostname+'"'
                                      if (instance.features != undefined) labels += ',features="' + instance.features + '"';
                                      if (instance.sn != undefined) labels += ',sn="' + instance.sn + '"';
                                      if (rule_id != undefined) labels += ',rule_id="' + rule_id + '"';
                                      if (customer != undefined) labels += ',customer="' + customer.id + '__' + customer.name + '"';
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
                      }

                      // console.log('Result of (' + f + '@' + syst.sid + ')= ', end_nodes);
                  }
                  // else console.log('non result.tree.item')
                  callback();
                  break;
              case 'ABAPGetWPTable':
                  // ~= SM50 = current instance
                  // console.log('Result of (' + f + '@' + syst.sid + ')= ', result.workprocess.item);
                  const types = ['dia', 'upd', 'up2', 'enq', 'btc', 'spo'];
                  const statuses = ['wait', 'hold', 'run', 'stop', 'ended', 'new', 'down'];
                  var res = {};

                  const def_kpi_name_ABAPGetWPTable = function (t, elt_Status) {
                      if (t.toUpperCase() != 'ALL') {
                          return that.kpi_prefix_sap + t.toLowerCase() + '_workprocess_' + elt_Status + '__nb';
                      } else {
                          return that.kpi_prefix_sap + '_workprocess_' + elt_Status + '__nb';
                      }
                  };

                  // init kpi values
                  types.forEach(ty => {
                      statuses.forEach(s => {
                          res[def_kpi_name_ABAPGetWPTable(t, s)] = res[def_kpi_name_ABAPGetWPTable(t, s)] ? Object.assign({}, res[def_kpi_name_ABAPGetWPTable(t, s)], { [ty]: 0 }) : { [ty]: 0 };
                      });
                  });
                  if (result.workprocess && result.workprocess.item) {
                      result.workprocess.item.forEach(i => {
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
                  Object.keys(res).forEach(k => {
                      if (!restricted_kpis || restricted_kpis.length == 0) {
                          types.forEach(ty => {
                              that.pushgtw_cli.set('{' + labels + ',workproces="' + ty + '"}', k, // kpi name
                              res[k][ty], // value
                              syst._id);
                          });
                      } else {
                          if (restricted_kpis.indexOf(k) >= 0) {
                              types.forEach(ty => {
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
                  const def_kpi_name_EnqGetStatistic = function (t) {
                      if (t.toLowerCase().match(/.*time$/)) {
                          return that.kpi_prefix_sap + 'enqueue_' + t.toLowerCase().replace(/[^a-zA-Z0-9]/g, '_') + '__sec';
                      } else {
                          return that.kpi_prefix_sap + 'enqueue_' + t.toLowerCase().replace(/[^a-zA-Z0-9]/g, '_') + '__nb';
                      }
                  };
                  var labels = 'instance="' + syst.sid + '",sid="' + syst.sid + '",type="' + t + '",entity_id="' + entity_id + '"'; //,hostname="'+ instance.hostname+'"'
                  if (instance.hostname != undefined) labels += ',hostname="' + instance.hostname + '"';
                  if (instance.ip_internal != undefined) labels += ',ip_internal="' + instance.ip_internal + '"';
                  if (instance.sn != undefined) labels += ',sn="' + instance.sn + '"';
                  if (rule_id != undefined) labels += ',rule_id="' + rule_id + '"';
                  Object.keys(result).forEach(key => {
                      // console.log(' >>> ' + def_kpi_name_EnqGetStatistic(key) + ' : '+result[key])
                      that.pushgtw_cli.set('{' + labels + '}', def_kpi_name_EnqGetStatistic(key), // kpi name
                      result[key], // value
                      syst._id);
                  });
                  // console.log('Result of (' + f + '@' + s.sid + ')= ', result);
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
  // , util = require ('util')

  // const TAGS = [{
  //     key: 'autostartandstop',
  //     value: 'true'
  // }];

  // const EC2_REGIONS = [
  //     'eu-north-1',
  //     'ap-south-1',
  //     'eu-west-3',
  //     'eu-west-2',
  //     'eu-west-1',
  //     'ap-northeast-2',
  //     'ap-northeast-1',
  //     'sa-east-1',
  //     'ca-central-1',
  //     'ap-southeast-1',
  //     'ap-southeast-2',
  //     'eu-central-1',
  //     'us-east-1',
  //     'us-east-2',
  //     'us-west-1',
  //     'us-west-2'
  // ];
  // Internal librairies
  // -----------------------------------------------------------------------------


  // Class definition
  // ----------------------------------------------------------------------------

  // Constructor
  function AWSMng() {
      console.log('! AWSMng! Constructor begins ');
      this.ec2 = new awsSdk.EC2({ apiVersion: '2016-11-15', region: 'eu-west-3' });
      this.mappings_ip_id = {};

      awsSdk.config.getCredentials(function (err) {
          if (err) console.log(err.stack);
          // credentials not loaded
          else {
                  console.log("Access key:", awsSdk.config.credentials.accessKeyId);
                  console.log("Secret access key:", awsSdk.config.credentials.secretAccessKey);
              }
      });
  }

  // Class definition
  AWSMng.prototype = {
      Constructor: AWSMng,

      // Collect AWS cloud KPI
      _collect_aws: function (vm, metric) {
          // AWS collect
          var params = {

              MetricDataQueries: [/* required */
              {
                  // Id: 'aiyzeorezlbkAz', /* required */
                  Id: (vm + metric).replace('-', '_'), /* required */
                  MetricStat: {
                      Metric: { /* required */
                          Dimensions: [{
                              Name: 'InstanceId',
                              Value: vm
                          }],
                          MetricName: metric,
                          Namespace: 'AWS/EC2'
                      },
                      Period: 10, /* required */
                      Stat: 'Average', /* required */
                      Unit: 'Percent'
                  },
                  ReturnData: true
              }],
              StartTime: moment().add(-10, 'm').unix(),
              EndTime: moment().add(-5, 'm').unix(),
              // StartTime: new Date((new Date).getTime() - 15*60000),
              // EndTime:  new Date(),
              MaxDatapoints: 10000,
              // NextToken: 'STRING_VALUE',
              ScanBy: 'TimestampAscending'
          };

          self.aws.cloudwatch.getMetricData(params, function (err, data) {
              if (err) console.log('cloudwatch error: ', err, err.stack); // an error occurred
              else {
                      self.pushgtw_cli.set('{hostname="' + vm + '"}', self._cleanKpiName(metric), data.MetricDataResults[0].Values[0], vm);
                  }
          });

          self.pushgtw_cli.pushInstance(self.cloud_job[self.cloud_type], vm);
      },

      getEC2statuses: function (ips, callback) {
          var self = this;

          async.waterfall([function (waterfall_cb) {
              // https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/EC2.html#describeInstanceStatus-property
              self.ec2.describeInstanceStatus({
                  // InstanceIds: ids
                  InstanceIds: Object.keys(self.mappings_ip_id).filter(key_ip => ips.indexOf(key_ip) >= 0).map(key => self.mappings_ip_id[key])
              }, waterfall_cb);
          }, function (inst_statuses, waterfall_cb) {
              var res_statuses = {};
              inst_statuses.InstanceStatuses.forEach(status => {
                  res_statuses[status.InstanceId] = status.InstanceState.Code == 16 // 0 : pending, 16 : running, 32 : shutting-down, 48 : terminated, 64 : stopping, 80 : stopped
                  && status.InstanceStatus.Status == "ok" && status.SystemStatus.Status == "ok";
              });
              // {
              //     InstanceStatuses: [
              //        {
              //       AvailabilityZone: "us-east-1d", 
              //       InstanceId: "i-1234567890abcdef0", 
              //       InstanceState: {
              //        Code: 16, 
              //        Name: "running"
              //       }, 
              //       InstanceStatus: {
              //        Details: [
              //           {
              //          Name: "reachability", 
              //          Status: "passed"
              //         }
              //        ], 
              //        Status: "ok"
              //       }, 
              //       SystemStatus: {
              //        Details: [
              //           {
              //          Name: "reachability", 
              //          Status: "passed"
              //         }
              //        ], 
              //        Status: "ok"
              //       }
              //      }
              //     ]
              // }
              waterfall_cb(null, res_statuses);
          }], function (err, list_instance_status) {
              if (err) {
                  console.error(' getEC2statuses error:', err);
              }
              callback(list_instance_status);
          });
      },

      getEC2IDs: function (new_ips, old_ips, callback) {
          var self = this;

          if (new_ips && new_ips.length > 0) {
              const dedup_ips = new_ips.filter(i => Object.keys(old_ips).indexOf(i) < 0);
              if (dedup_ips.length > 0) {
                  async.waterfall([function (waterfall_cb) {
                      self.ec2.describeInstances({
                          Filters: [{
                              Name: "private-ip-address",
                              Values: dedup_ips
                          }]
                      }, waterfall_cb);
                  }, function (ec2s, waterfall_cb) {
                      const instanceIds = {};
                      for (const reservation of ec2s.Reservations) {
                          for (const instance of reservation.Instances) {
                              instanceIds[instance.PrivateIpAddress] = instance.InstanceId;
                          }
                      }
                      waterfall_cb(null, instanceIds);
                  }], function (err, list_instance_ids) {
                      if (err) {
                          console.error(' getEC2s error:', err);
                      }
                      self.mappings_ip_id = Object.assign(self.mappings_ip_id, list_instance_ids);
                      callback(list_instance_ids);
                  });
              } else {
                  callback([]);
              }
          } else {
              callback([]);
          }
      },

      stopEC2s: function (ips, callback) {
          var self = this;
          // console.log('ips:',ips)
          // console.log('self.mappings_ip_id:',self.mappings_ip_id)
          // console.log('ids:',Object.keys(self.mappings_ip_id).filter( (key_ip) => ips.indexOf(key_ip) >= 0 ).map( key => self.mappings_ip_id[key]))
          self.ec2.stopInstances({
              InstanceIds: Object.keys(self.mappings_ip_id).filter(key_ip => ips.indexOf(key_ip) >= 0).map(key => self.mappings_ip_id[key])
          }, callback);
      },

      startEC2s: function (ips, callback) {
          var self = this;
          self.ec2.startInstances({
              InstanceIds: Object.keys(self.mappings_ip_id).filter(key_ip => ips.indexOf(key_ip) >= 0).map(key => self.mappings_ip_id[key])
          }, callback);
      }

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

      // Export the class
  };var awsmng = AWSMng;

  var prometheus = {
    // Dev instance
    development: {
      prometheus_host: "10.0.1.22",
      prometheus_port: "9090",
      pushgateway_host: "10.0.1.22",
      pushgateway_port: "9091"
    },
    // Production instance
    production: {
      prometheus_protocole: "https",
      prometheus_host: "35.246.148.61",
      prometheus_port: "443",
      pushgateway_credentials: "superadmin:h4n4lyt1c5_",
      pushgateway_protocole: "https",
      pushgateway_host: "35.246.148.61",
      pushgateway_port: "443"
    }
  };

  /**
   * Scale Doer class
   * ==================
   */

  // External librairies
  // ----------------------------------------------------------------------------

  //  var mongoose =  require('mongoose')
  //  , fs =       require('fs')
  var { sapcontrol_operations: sapcontrol_operations$1, sapctrl_process_func: sapctrl_process_func$1 } = sapctrl_helpers;
  // , axios = require('axios')

  // Debug memory leak
  // var heapdump = require('heapdump');

  // Internal librairies
  // -----------------------------------------------------------------------------


  //kue.app.listen(3000);

  // Class definition
  // ----------------------------------------------------------------------------

  // Constructor
  function ScaleDoer(env) {
    console.log('! ScaleDoer ! Constructor begins');

    // to prevent error for self signed certificates of SAP systems
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

    this.cronjob = cron.CronJob;

    // Internal attributes
    this.company = '';
    this.all_systems = [];
    this.all_systems_hosts = [];
    this.updated_system_instances = {}; // keeps track of instance to stop / being stopped
    // this.mapping_hostname_ip = {}
    this.nb_workers = 1;
    this.conn_retries = {};
    this.conn_retries_max = 3;
    this.conn_retries_delay_msec = 40000; // 40 sec
    this.keepalive_delay_msec = 60000;
    this.queue = null;

    // Integration components
    this.pushgtw_cli = new pushcli(prometheus[env].pushgateway_protocole + '://' + (prometheus[env].pushgateway_credentials ? prometheus[env].pushgateway_credentials + '@' : '') + prometheus[env].pushgateway_host + ':' + prometheus[env].pushgateway_port + '/pshgtw');
    this.aws_cli = new awsmng();
  }

  // Class definition
  ScaleDoer.prototype = {
    Constructor: ScaleDoer,
    // Delete last pushed metrics in Prometheus if connection to system (suid) is lost for (conn_retries_max) tentatives
    checkDeletePrometheus: function (job, entity_id, suid, tuid, tname, sap_id) {
      var self = this;
      const syst_tenant_id = suid + tuid;
      if (self.conn_retries[syst_tenant_id] == undefined) {
        self.conn_retries[syst_tenant_id] = 0;
      }
      // console.log("! checkDeletePrometheus ! " + suid + '('+self.conn_retries[syst_tenant_id]+') ' +  moment().format('MMMM Do YYYY, h:mm:ss a') );
      if (self.conn_retries[syst_tenant_id] >= self.conn_retries_max) {
        console.log("! checkDeletePrometheus ! delete data and set status=0 for " + syst_tenant_id + '(' + self.conn_retries[syst_tenant_id] + ' >= ' + self.conn_retries_max + ') ' + moment().format('MMMM Do YYYY, h:mm:ss a'));
        //Delete all metrics for jobName & instance
        // self.pushgtw_cli.del(job,suid,tuid)
        self.pushgtw_cli.delSerie(job, { instance: suid + '' + tuid });
        // self.pushgtw_cli.del(job,suid,tuid,tname)
        // Update SAP Up status
        self.pushgtw_cli.pushUpInstance('up', entity_id, suid, tuid, tname, sap_id, 0);
        // reset counter
        self.conn_retries[syst_tenant_id] = 0;
      } else {
        self.conn_retries[syst_tenant_id]++;
      }
    },
    // Delete last pushed metrics in Prometheus without check on retries
    deletePrometheus: function (job, entity_id, suid, tuid, tname, sap_id) {
      var self = this;
      const syst_tenant_id = suid + tuid;
      if (self.conn_retries[syst_tenant_id] == undefined) {
        self.conn_retries[syst_tenant_id] = 0;
      }
      console.log("! deletePrometheus ! delete data and set status=0 for " + syst_tenant_id + ' ' + moment().format('MMMM Do YYYY, h:mm:ss a'));
      //Delete all metrics for jobName & instance
      // self.pushgtw_cli.del(job,suid,tuid)
      self.pushgtw_cli.delSerie(job, { instance: suid + '' + tuid });
      // self.pushgtw_cli.del(job,suid,tuid,tname)
      // Update SAP Up status
      self.pushgtw_cli.pushUpInstance('up', entity_id, suid, tuid, tname, sap_id, 0);
      // reset counter
      self.conn_retries[syst_tenant_id] = 0;
    },

    // create a sap client and provides it to the callback function
    new_soap_client: function (url, auth, data, cb) {
      soap.createClient(url + '?wsdl', { returnFault: true }, function (err, client) {
        if (err || !client) {
          cb(err);
        } else {
          switch (auth.method) {
            case 0:
              client.setSecurity(new soap.BasicAuthSecurity(auth.options[0].user, auth.options[0].pwd));
              break;
            case 1:
              client.setSecurity(new soap.ClientSSLSecurityPFX(auth.options[1].pfx));
              break;
            default:
              client.setSecurity(new soap.ClientSSLSecurityPFX(auth.options[1].pfx));
          }
          client.setEndpoint(url + 'SAPControl.cgi');
          cb(null, { soapcli: client, payload: data });
        }
      });
    },

    // init connection to redis & HANA db
    // init : function (redis_config, worker_config, next) {
    init: function (redis_config, worker_config, next) {
      var that = this;
      // Load from company id from config file
      that.company = worker_config['company'];
      // Load from nb workers from config file
      that.nb_workers = worker_config['nb_workers'];

      // Initialize (one time execution needed)
      // ---------------------------------------------------------------------------

      console.log("! ScaleDoer init ! start  ! (now=" + new Date().toJSON() + ")");

      // Initialize queue for engines communications
      that.queue = kue.createQueue({
        prefix: 'q',
        redis: redis_config
      });
      that.queue.watchStuckJobs(); // Prevent inconsistency if redis connection lost
      that.queue.setMaxListeners(that.nb_workers * 3);
      that.queue.on('error', function (err) {
        console.error('Oops... redis queue error', err);
      });

      next.call(that);
    },

    call_sapcontrol: function (job_data, queue_cb) {
      var that = this;
      // const ssl_dir = process.cwd()+'/.keys'
      const green_status = 'SAPControl-GREEN';
      const red_status = 'SAPControl-RED';
      const gray_status = 'SAPControl-GRAY';
      const _errors = {
        'conn_failed': 'Connection to SAP system failed',
        'ws_not_reachable': 'SAP control WS not reachable',
        'no_system_conn': 'No SAP system or no system connection active',
        'no_active_instance': 'No active SAP instance available'
        // var main_soap_client = null

        // check status of SAP system based on its instances status
        // SAP system is DOWN if CI is down or all DI are down
      };function check_system_status(instance_items, syst_id, sid, entity_id) {
        var di_status_err = [];
        var ci_down = false;

        for (var j = 0, item_len = instance_items.length; j < item_len; j++) {
          if (instance_items[j].features.split('|').indexOf('MESSAGESERVER') >= 0 || instance_items[j].features.split('|').indexOf('ENQUE') >= 0) {
            if (instance_items[j].dispstatus != green_status) {
              ci_down = true;
              break;
            }
          } else {
            di_status_err.push({ 'instancenr': ('' + instance_items[j].instanceNr).padStart(2, '0'), 'status': instance_items[j].dispstatus == green_status ? 1 : 0 });
          }
        }
        // console.log('di_status_err:', di_status_err)
        that.pushgtw_cli.pushUpSAPInstance('up', entity_id, syst_id, sid, di_status_err
        // di_status_err.map(x=>Object.keys(x)[0]).map( (s) => {return { 
        //   'instancenr': (''+s).padStart(2, '0'), 
        //   'status': (di_status_err[s] == green_status) ? 1 : 0
        // }})
        );
        if (ci_down || di_status_err.reduce((accumulator, currentValue) => accumulator + currentValue, 0) == 0) {
          return red_status;
        }
        return green_status;
      }

      // recursive func to check conn_retries_max times if connection is down before confirmation
      function check_failed_conn(soap_client, job_data) {
        if (that.conn_retries[job_data.system.syst_id] <= that.conn_retries_max) {
          setTimeout(function () {
            soap_client.GetSystemInstanceList({}, function (err, result) {
              var syst_status = check_system_status(result.instance.item, job_data.system.syst_id, job_data.system.sid, job_data.entity_id);
              if (result && result.instance && result.instance.item && (syst_status == red_status || syst_status == gray_status) || err) {
                that.conn_retries[job_data.system.syst_id]++;
                check_failed_conn(soap_client, job_data);
              }
            });
          }, 20000); // 3 retries with 20sec to valide in 1 min
        } else {
          that.deletePrometheus('scale', job_data.entity_id, job_data.system.syst_id, '', null, job_data.system.sid);
        }
      }

      async.waterfall([
      // connect to the entry point instance and provide soapclient
      function (cb) {
        var syst_idx = that.all_systems.map(x => x.id).indexOf(job_data.system.syst_id);

        // if status has changed and is now inactive, delete pushgtw data
        if (syst_idx >= 0 && that.all_systems[syst_idx].status != job_data.system.syst_status && job_data.system.syst_status == 0) {
          // console.log('No system or no system connection active')
          that.deletePrometheus(job_data.entity_id, 'scale', job_data.system.syst_id, "", null, job_data.system.sid);
          cb(_errors.no_system_conn);
        } else {
          // check if system is newly created, if so add it
          if (syst_idx < 0) {
            that.all_systems.push({
              'id': job_data.system.syst_id,
              'status': job_data.system.syst_status
            });
            that.pushgtw_cli.addInstance(job_data.system.syst_id);
          }

          const http_s = job_data.system.is_encrypted ? { protocol: 'https', port_suffix: '14' } : { protocol: 'http', port_suffix: '13' };
          const soap_url = http_s.protocol + '://' + job_data.system.ip_internal + ':5' + job_data.system.sn + http_s.port_suffix + '/';

          that.new_soap_client(soap_url, {
            method: job_data.system.auth_method, // method is the index of options
            options: [{
              user: job_data.system.username,
              pwd: job_data.system.password
            }, {
              pfx: job_data.system.auth_method == 1 && job_data.keys_buff
            }]
          }, job_data, cb);
        }
      },
      // Get list of instances and check system status
      function (cli_data, cb) {
        cli_data.soapcli.GetSystemInstanceList({}, function (err, result) {
          if (!err && result && result.instance && result.instance.item) {
            // console.log('GetSystemInstanceList '+ cli_data.payload.syst && cli_data.payload.syst.sid+' :',  result.instance.item);
            var instances_list = result.instance.item.map(x => {
              const temp_ip_internal = job_data.system.instances.filter(i => i.hostname.toLowerCase() == x.hostname.toLowerCase() && i.instancenr == ('' + x.instanceNr).padStart(2, '0') && i.status < 2 // to consider only stable instances
              );
              return temp_ip_internal && temp_ip_internal[0] && temp_ip_internal[0].ip_internal ? {
                'hostname': x.hostname,
                'ip_internal': job_data.system.instances.filter(i => i.hostname.toLowerCase() == x.hostname.toLowerCase() && i.instancenr == ('' + x.instanceNr).padStart(2, '0'))[0].ip_internal, //that.mapping_hostname_ip[x.hostname],
                'instancenr': ('' + x.instanceNr).padStart(2, '0'),
                'features': x.features.split('|'),
                // 'id' : crypto.createHash('md5').update(x.hostname+x.instanceNr+x.features+x.dispstatus).digest("hex"),
                // 'role': x.features.split('|'),
                'status': x.dispstatus == green_status ? 1 : 0
              } : {};
              // filter to handle situation when there is no instance with the requested ip internal
            }).filter(i => i.ip_internal != undefined) || [];

            // add new instances host in that.all_systems_hosts
            var temp_list_hosts = instances_list.map(i => i.ip_internal).filter((el, i, arr) => arr.indexOf(el) === i && Object.keys(that.all_systems_hosts).indexOf(el) < 0);
            // console.log('>> temp_list_hosts:', temp_list_hosts)
            // console.log('>> that.all_systems_hosts:', that.all_systems_hosts)

            // get AWS EC2 IDs for those systems
            that.aws_cli.getEC2IDs(temp_list_hosts, that.all_systems_hosts, function (list_ids) {
              // [{ip:id},{},...]
              that.all_systems_hosts = Object.assign({}, list_ids, that.all_systems_hosts);
            });

            // delete prometheus data for sap instance that went inactive
            if (instances_list.filter(x => x.status == 0 && x.features.indexOf('MESSAGESERVER') < 0 && x.features.indexOf('ENQUE') < 0).length == 0) {
              that.pushgtw_cli.delSerie('scale', { instance: job_data.system.syst_id });
            }

            // update up status for system, delete if not up
            var syst_status = check_system_status(result.instance.item, job_data.system.syst_id, job_data.system.sid, job_data.entity_id);
            if (syst_status == red_status || syst_status == gray_status) {
              // that.checkDeletePrometheus('scale', job_data.entity_id, job_data.system.syst_id, "", null, job_data.system.sid)
              // main_soap_client = cli_data.soapcli
              cb(_errors.conn_failed, cli_data.soapcli);
            } else {
              that.pushgtw_cli.pushUpInstance('up', job_data.entity_id, job_data.system.syst_id, '', '', job_data.system.sid, 1);
              that.conn_retries[job_data.system.syst_id] = 0;
              // provide list of active instances for KPI collections
              cb(null, instances_list, job_data.system.auth_method, job_data.system.username, job_data.system.password, job_data.system.auth_method == 1 ? job_data.keys_buff : null, { 'is_encrypted': job_data.system.is_encrypted, 'is_direct': job_data.system.is_direct }, job_data);
            }
          } else {
            cb(_errors.ws_not_reachable, err && err.address + ' ' + err.port);
          }
        });
      },
      // connect to the all instances and execute the requested functions / web methods
      function (all_instances, auth_method, username, password, pfx_certif, conn, results, cb) {
        var soap_clients = [];
        if (!all_instances || all_instances.filter(x => x.status == 1).length == 0) {
          that.pushgtw_cli.pushInstance('scale', results.syst._id);
          cb(_errors.no_active_instance, all_instances);
        } else {
          async.each(all_instances.filter(x => x.status == 1), function (inst, callback) {
            const http_s = conn.is_encrypted ? { protocol: 'https', port_suffix: '14' } : { protocol: 'http', port_suffix: '13' };
            const soap_url = http_s.protocol + '://' + inst.ip_internal + ':5' + inst.instancenr + http_s.port_suffix + '/';
            that.new_soap_client(soap_url, {
              method: auth_method, // method is the index of options
              options: [{
                user: username,
                pwd: password
              }, {
                pfx: pfx_certif
              }]
            }, null, function (soap_err, client) {
              if (soap_err) {
                console.error('error connecting to instance: ', inst, 'with error: ', soap_err);
                callback();
              } else {
                soap_clients.push({ c: client.soapcli, f: inst.features, n: inst.instancenr, h: inst.hostname, i: inst.ip_internal });
                callback();
              }
            });
          }, function (err) {
            // if (err) console.error('other:',err)

            async.each(soap_clients, (client, async_cb) => {
              if (client.f.indexOf(job_data.func.type) >= 0 || job_data.func.type == 'ALL') {
                sapcontrol_operations$1[job_data.func.name].call(client.c, {}, (err, result) => {
                  // if (err) { console.error('call sapcontrol error:',err) }
                  sapctrl_process_func$1.call(that, err, result, job_data.func.name, { _id: job_data.system.syst_id, sid: job_data.system.sid }, { ip_internal: client.i, hostname: client.h, sn: client.n, features: client.f.join('|') }, job_data.func.type, job_data.entity_id, job_data.customer, job_data.restricted_kpis, job_data.rule_id, async_cb);
                });
              } else async_cb();
            }, each_err => {
              if (each_err) {
                console.error('call_sapcontrol exec operations error:', each_err);
              }
              that.pushgtw_cli.pushInstance('scale', job_data.system.syst_id);
            });
            cb(err, all_instances);
          });
        }
      }], function (err, waterfall_res) {
        if (err) {
          switch (err) {
            case _errors.conn_failed:
              console.error('>E ', _errors.conn_failed);
              // Objective is to alert asap if a system is down
              // If there is an error connectiong to the system, we retry until the max_retries is reach or connection finally works.
              // we do not wait for the next execution 5min later
              check_failed_conn(waterfall_res, job_data); // use soap client of errorneous conn
              break;
            case _errors.no_system_conn:
              console.error('>E ', _errors.no_system_conn);
              if (err && err.errno != 'ETIMEDOUT') {
                console.error('call_sapcontrol init conn error:', err);
              }
              break;
            case _errors.no_active_instance:
              console.error('>E ', _errors.no_system_conn);
              break;
            case _errors.ws_not_reachable:
              console.error('>E ', _errors.ws_not_reachable, waterfall_res);
              break;
            default:
              console.error('>E default', waterfall_res);
              break;
          }
          queue_cb(err, {});
        } else {
          // send back the list instances for update by the scaler scheduler
          queue_cb(null, { [job_data.system.syst_id]: waterfall_res });
        }
      });
    },

    // Consume metrics for SAP (similar to call_sapcontrol) with higher frequency for precise notifications. Do produce Prometheus metrics.
    collect: function () {
      var that = this;
      that.queue.process('scale_exec', that.nb_workers, function (job, done) {
        // console.log('consum NAK queue req:', job.data.systId)
        if (job.data.func && job.data.system) {
          // that.get_system_instances_Ip_Hostname(job.data.system, function() {
          //   console.log('....mapping:', that.mapping_hostname_ip)
          that.call_sapcontrol(job.data, done);
          // })
        } else {
          done();
        }
      });
    },

    // Check connections to sap systems, cloud
    checkconnection: function () {
      var that = this;
      that.queue.process('checkconn_exec', that.nb_workers, function (job, done) {
        // console.log('consum NAK queue req:', job.data.systId)
        if (job.data.type != undefined && job.data.system) {
          switch (job.data.type) {
            case 0:
              // sap system

              async.waterfall([
              // connect to the entry point instance and provide soapclient
              function (cb) {
                const http_s = job_data.system.is_encrypted ? { protocol: 'https', port_suffix: '14' } : { protocol: 'http', port_suffix: '13' };
                const soap_url = http_s.protocol + '://' + job_data.system.ip_internal + ':5' + job_data.system.sn + http_s.port_suffix + '/';

                that.new_soap_client(soap_url, {
                  method: job_data.system.auth_method, // method is the index of options
                  options: [{
                    user: job_data.system.username,
                    pwd: job_data.system.password
                  }, {
                    pfx: job_data.system.auth_method == 1 && job_data.keys_buff
                  }]
                }, job_data, cb);
              },
              // Get list of instances and check system status
              function (cli_data, cb) {
                // check for authorization issue
                cli_data.soapcli.AccessCheck({ function: 'Start' }, function (err, result) {
                  if (err) {
                    if (err.body) {
                      console.error('AccessCheck RC:', err.body.match(/<faultstring>(.*?)<\/faultstring>/)[1]);
                      cb(err.body.match(/<faultstring>(.*?)<\/faultstring>/)[1]);
                    } else cb(err);
                  } else {

                    cli_data.soapcli.GetSystemInstanceList({}, function (err, result) {

                      if (!err && result && result.instance && result.instance.item) {
                        // console.log('GetSystemInstanceList '+ cli_data.payload.syst && cli_data.payload.syst.sid+' :',  result.instance.item);
                        var instances_list = result.instance.item.map(x => {
                          return {
                            'hostname': x.hostname,
                            'instancenr': ('' + x.instanceNr).padStart(2, '0'),
                            'features': x.features.split('|'),
                            'status': x.dispstatus == green_status ? 1 : 0
                          };
                        });

                        cb(null, instances_list, job_data.system.auth_method, job_data.system.username, job_data.system.password, job_data.system.auth_method == 1 ? job_data.keys_buff : null, { 'is_encrypted': job_data.system.is_encrypted, 'is_direct': job_data.system.is_direct }, job_data);
                      } else {
                        cb(_errors.ws_not_reachable, err && err.address + ' ' + err.port);
                      }
                    });
                  }
                });
              }, function (all_instances, auth_method, username, password, pfx_certif, conn, results, cb) {
                var soap_clients = [];
                if (!all_instances || all_instances.length == 0) {
                  cb(null, []);
                } else {
                  async.eachOf(all_instances, function (inst, idx, callback) {
                    const http_s = conn.is_encrypted ? { protocol: 'https', port_suffix: '14' } : { protocol: 'http', port_suffix: '13' };
                    const soap_url = http_s.protocol + '://' + inst.hostname + ':5' + inst.instancenr + http_s.port_suffix + '/';
                    that.new_soap_client(soap_url, {
                      method: auth_method, // method is the index of options
                      options: [{
                        user: username,
                        pwd: password
                      }, {
                        pfx: pfx_certif
                      }]
                    }, null, function (soap_err, client) {
                      if (soap_err) {
                        if (err.code) {
                          // conn refused
                          all_instances[idx].status = -1;
                          all_instances[idx] = Object.assign(all_instances[idx], { error: err.code });
                        }
                        console.error('error connecting to instance: ', inst, 'with error: ', soap_err);
                      } else {
                        soap_clients.push({ c: client.soapcli, f: inst.features, n: inst.instancenr, h: inst.hostname });
                        callback();
                      }
                    });
                  }, function (err) {

                    async.each(soap_clients, (client, async_cb) => {
                      client.AccessCheck({ function: 'Start' }, function (err, result) {
                        if (err) {
                          all_instances.filter((i, idx) => {
                            if (i.instancenr == client.n) {
                              all_instances[idx].status = -1;
                              all_instances[idx] = Object.assign(all_instances[idx], { error: err.body ? err.body.match(/<faultstring>(.*?)<\/faultstring>/)[1] : err });
                              return true;
                            }
                          });
                        }
                      });
                      async_cb();
                    }, each_err => {
                      if (each_err) {
                        console.error('call_sapcontrol exec operations error:', each_err);
                      }
                      cb(err, all_instances);
                    });
                  });
                }
              }], function (err, all_instances) {
                if (err) {
                  if (err.code) {
                    // conn refused, from soap client error
                    done(err.code);
                  } else {
                    // authorization error on main soap client (system central instance)
                    done(err.code);
                  }
                } else {
                  done(null, all_instances);
                }
              });

              break;
            case 1:
              // aws

              break;
            default:
              done();
              break;
          }
        } else {
          done();
        }
      });
    },

    // Response to alertmanager msg sent to webhook receiver.
    // Does not pull metrics but execute task based on metrics values and defined rules
    scale: function () {
      var that = this;

      // check if SAP instance is stop before stopping the OS
      function check_stop_instance(soap_client, count, wait_sec, sn, serie_cb) {
        if (count > 0) {
          setTimeout(function () {
            soap_client.GetSystemInstanceList({}, function (err, result) {
              if (!err) {
                var inst_status = result.instance.item && result.instance.item.filter(i => i.instanceNr == sn);
                if (inst_status && inst_status[0] && inst_status[0].dispstatus == 'SAPControl-GRAY') {
                  serie_cb();
                } else {
                  check_stop_instance(soap_client, count - 1, wait_sec, sn, serie_cb);
                }
              } else {
                // console.log('check_stop_instance err', err)
                serie_cb('error geeting SAP instances list ' + err);
                // check_stop_instance(soap_client, count-1, wait_sec, sn, serie_cb)
              }
            });
          }, wait_sec); // 3 retries with 20sec to valide in 1 min
        } else serie_cb('stop timeout reached');
      }

      // check if host OS is started before starting SAP instance
      function check_start_instance(aws_client, count, wait_sec, single_id, serie_cb) {
        if (count > 0) {
          setTimeout(function () {
            aws_client.getEC2statuses([single_id], function (list_statuses) {
              if (list_statuses && Object.keys(list_statuses).length > 0) {
                if (Object.values(list_statuses).reduce((a, s) => a && s, true)) {
                  serie_cb();
                } else check_start_instance(aws_client, count - 1, wait_sec, single_id, serie_cb);
              } else serie_cb('no ec2 instance found for any of ' + single_id);
            });
          }, wait_sec); // 3 retries with 20sec to valide in 1 min
        } else serie_cb('start timeout reached');
      }

      // TODO
      // improvement: can set minimal number of instances instead of 1
      function do_stop(d, queue_cb) {
        // console.log('do_action:', d)
        var alert = d.alert;
        var syst_id = alert.labels.instance;
        const min_instance_running = 1;
        // console.log(' >> processing system ', syst_id)

        // GET SAP system relatad Cloud VMs
        // _______________________________________________
        // add new instances host in that.all_systems_hosts
        var temp_list_hosts = d.system.instances.map(i => i.ip_internal).filter((el, i, arr) => arr.indexOf(el) === i && Object.keys(that.all_systems_hosts).indexOf(el) < 0);
        that.aws_cli.getEC2IDs(temp_list_hosts, that.all_systems_hosts, function (list_ids) {
          // [{ip:id},{},...]
          that.all_systems_hosts = Object.assign({}, list_ids, that.all_systems_hosts);
        });
        // console.log('>> that.all_systems_hosts:', that.all_systems_hosts)

        var curr_system = d.system;
        async.waterfall([
        // connect to the entry point instance and provide soapclient
        function (cb) {
          var features_of_instancenr = {};

          if (curr_system) {

            // method 1: get nb of up and running instances from db. not synced ? (few delay)!
            // if d.action.name = stop (instance), 
            // if 
            //    system has only 1 instance of this type running => skip, 
            // else 
            //    if nb(instance type) == total same instance type & instance => exclude 1 instance (min instancenr for ex)
            //    then stop all other instances in parallel

            curr_system.instances.filter(i => i.status == 1).forEach(i => {
              features_of_instancenr[i.instancenr] = i.features.join('-');
            });

            if (Object.values(features_of_instancenr).filter(x => x == features_of_instancenr[alert.labels.sn]).length > min_instance_running) {

              console.log(' ======= ' + (curr_system != undefined && curr_system.sid || '-No System-') + ' alert ' + alert.labels.alertname + ' ' + alert.labels.sn + ' - ' + alert.labels.ip_internal + '===========');

              var pfx_certif = null;
              var syst_instance = curr_system.instances.filter(x => x.instancenr == alert.labels.sn)[0];
              const http_s = curr_system.is_encrypted ? { protocol: 'https', port_suffix: '14' } : { protocol: 'http', port_suffix: '13' };
              var soap_url = http_s.protocol + '://' + syst_instance.ip_internal + ':5' + alert.labels.sn + http_s.port_suffix + '/';
              if (curr_system.auth_method == 1) {
                pfx_certif = d.keys_buff;
              }

              that.new_soap_client(soap_url, {
                method: curr_system.auth_method, // method is the index of options
                options: [{
                  user: curr_system.username,
                  pwd: curr_system.password
                }, {
                  pfx: pfx_certif
                }]
              }, {
                'instances': curr_system.instances
              }, cb);
            } else {
              cb('System Instance cannot be stop due to minimal running instance');
            }
          } else {
            cb('No system or no system connection active');
          }
        },
        // Get list of instances and check system status
        function (cli_data, async_cb) {

          // check if there is not a stop in progress for this instance
          if (that.updated_system_instances[syst_id] == undefined || that.updated_system_instances[syst_id].filter(i => i.status == 2 && i.instancenr == alert.labels.sn).length == 0) {
            // Set instance in stop WIP so they are not considered as active. Prevent from shutting down all AS and trying to shut down same AS from the same alert when the stop takes more time than alert resending
            // set status == 2 for stop in progress
            var updated_instances_list = [];
            cli_data.payload.instances.forEach(i => {
              if (i.instancenr == alert.labels.sn) {
                updated_instances_list.push(Object.assign({}, i, { status: 2 }));
              } else {
                updated_instances_list.push(i);
              }
            });
            that.updated_system_instances[syst_id] = updated_instances_list;

            // call async now to prevent delay of DB update due to waiting for stop operations 
            async_cb();

            async.series([function (serie_cb) {
              console.log('trigger stop SAP instance... ' + new Date() + ' of :', { ip_internal: alert.labels.ip_internal, hostname: alert.labels.hostname, sn: alert.labels.sn });
              sapcontrol_operations$1[d.action.name].call(cli_data.soapcli, {}, err => {
                serie_cb(err);
              });
            }, function (serie_cb) {
              const step_wait_sec = 20;
              const timeout_wait_sec = 300;
              const nb_iterations = Math.ceil(timeout_wait_sec / step_wait_sec);
              console.log('waiting for instance to actually stop within timeout ' + nb_iterations + ' times ... ' + new Date());
              check_stop_instance(cli_data.soapcli, nb_iterations, step_wait_sec * 1000, alert.labels.sn, serie_cb);
            }, function (serie_cb) {
              console.log('trigger stop EC2 instance ' + alert.labels.ip_internal + '... ' + new Date());
              // Stop EC2 host
              that.aws_cli.stopEC2s([alert.labels.ip_internal], serie_cb);
            }], function (err) {
              if (err) {
                console.error('Stop instances error:', err);
              } else {

                // todo check instance is correctly stopped before confirmation
                that.updated_system_instances[syst_id].forEach((instance, idx) => {
                  if (instance.instancenr == alert.labels.sn) {
                    that.updated_system_instances[syst_id][idx].status = 0;
                  }
                });
              }
              // async_cb()
            });
          } else {
            async_cb();
          }
        }], function (waterfall_err) {
          if (waterfall_err) {
            console.log('error for alert:', waterfall_err);
          }
          // eachof_cb()
        });
        queue_cb(null, that.updated_system_instances);
      }

      function do_start(d, queue_cb) {
        // console.log('do_action:', d)

        var alert = d.alert;
        var curr_system = d.system;
        var syst_id = alert.labels.instance;
        const max_instance_running = 10;
        // console.log(' >> processing system ', syst_id)

        if (curr_system) {

          async.waterfall([
          // init ec2 ids
          function (async_cb) {
            // GET ALL Inactive SAP SYSTEMS & relatad Cloud VMs
            // _______________________________________________
            // add new instances host in that.all_systems_hosts
            var temp_list_hosts = d.system.instances.map(i => i.ip_internal).filter((el, i, arr) => arr.indexOf(el) === i && Object.keys(that.all_systems_hosts).indexOf(el) < 0);
            that.aws_cli.getEC2IDs(temp_list_hosts, that.all_systems_hosts, function (list_ids) {
              // [{ip:id},{},...]
              that.all_systems_hosts = Object.assign({}, list_ids, that.all_systems_hosts);
              async_cb();
            });
          },
          // Get list of instances and check system status
          function (async_cb) {

            var syst_instance_to_start = curr_system.instances.filter(x => x.status == 0 && x.features.indexOf('ABAP') >= 0)[0];
            if (syst_instance_to_start) {

              // check if there is not a start in progress for this instance
              if (that.updated_system_instances[syst_id] == undefined || that.updated_system_instances[syst_id].filter(i => i.status == 3 /*&& i.instancenr == syst_instance_to_start.instancenr*/).length == 0) {

                console.log(' ======= ' + (curr_system != undefined && curr_system.sid || '-No System-') + ' alert ' + alert.labels.alertname + ' - ' + (alert.labels.ip_internal != undefined && alert.labels.ip_internal || '-No NR-') + '===========', syst_instance_to_start);

                // Set instance in start WIP so they are not considered as active. Prevent from shutting down all AS and trying to shut down same AS from the same alert when the stop takes more time than alert resending
                // set status == 3 for start in progress
                var updated_instances_list = [];
                var to_start_instance = null;
                curr_system.instances.forEach(i => {
                  if (i.instancenr == syst_instance_to_start.instancenr) {
                    updated_instances_list.push(Object.assign({}, i, { status: 3 }));
                    to_start_instance = i;
                  } else {
                    updated_instances_list.push(i);
                  }
                });
                that.updated_system_instances[syst_id] = updated_instances_list;

                // call async now to prevent delay of DB update due to waiting for stop operations 
                async_cb();

                async.series([function (serie_cb) {
                  console.log('trigger start EC2 instance ' + to_start_instance.ip_internal + '... ' + new Date());
                  // Start EC2 host
                  that.aws_cli.startEC2s([to_start_instance.ip_internal], serie_cb);
                }, function (serie_cb) {
                  const step_wait_sec = 20;
                  const timeout_wait_sec = 300;
                  const nb_iterations = Math.ceil(timeout_wait_sec / step_wait_sec);
                  console.log('waiting for EC2 instance to actually start within timeout ' + nb_iterations + ' times ... ' + new Date());
                  check_start_instance(that.aws_cli, nb_iterations, step_wait_sec * 1000, syst_instance_to_start.ip_internal, serie_cb);
                }, function (serie_cb) {
                  var features_of_instancenr = {};

                  curr_system.instances.filter(i => i.status == 1).forEach(i => {
                    features_of_instancenr[i.instancenr] = i.features.join('|');
                  });

                  // todo: support non abap AS => update ABAP with additional values
                  if (Object.values(features_of_instancenr).filter(x => RegExp('ABAP').test(x)).length < max_instance_running) {

                    var pfx_certif = null;
                    const http_s = curr_system.is_encrypted ? { protocol: 'https', port_suffix: '14' } : { protocol: 'http', port_suffix: '13' };
                    var soap_url = http_s.protocol + '://' + syst_instance_to_start.ip_internal + ':5' + syst_instance_to_start.instancenr + http_s.port_suffix + '/';
                    if (curr_system.auth_method == 1) {
                      pfx_certif = d.keys_buff;
                    }

                    that.new_soap_client(soap_url, {
                      method: curr_system.auth_method, // method is the index of options
                      options: [{
                        user: curr_system.username,
                        pwd: curr_system.password
                      }, {
                        pfx: pfx_certif
                      }]
                    }, {}, serie_cb);
                  } else {
                    serie_cb('System Instance cannot be started due to maximal running instances');
                  }
                }], function (err, array_res) {
                  if (err) {
                    console.error('Start instance error:', err);
                  }

                  console.log('trigger start SAP instance... ' + new Date() + ' of :', { ip_internal: to_start_instance.ip_internal, hostname: to_start_instance.hostname, sn: to_start_instance.instancenr });

                  var cli_data = array_res[2];
                  if (cli_data && cli_data.soapcli) {
                    sapcontrol_operations$1[d.action.name].call(cli_data.soapcli, {}, err => {
                      if (err) {
                        console.error('starting sap instance error:', err);
                      } else {

                        // todo check instance is correctly started before confirmation
                        that.updated_system_instances[syst_id].forEach((instance, idx) => {
                          if (instance.instancenr == syst_instance_to_start.instancenr) {
                            that.updated_system_instances[syst_id][idx].status = 1;
                          }
                        });
                      }
                    }); // end sapcontrol_operations
                  } else {
                    console.error('No SOAP Client created');
                  }
                });
              } else {
                async_cb();
              }
            } else {
              async_cb('No available System Instance to be started');
            }
          }], function (waterfall_err) {
            if (waterfall_err) {
              console.log('error for alert:', waterfall_err);
            }
          });
          queue_cb(null, that.updated_system_instances);
        } else {
          console.log('error for alert:', 'No system or no system connection active');
          queue_cb();
        }
      }

      function do_update_scaling_instance(d, queue_cb) {
        // console.log('do_update_scaling_instance:',d,that.updated_system_instances)
        queue_cb(null, that.updated_system_instances[d.syst_id].filter(i => i.instancenr == d.instance_nr)[0]);
      }

      that.queue.process('webhook_exec', that.nb_workers, function (job, done) {
        if (job.data.action /*&& job.data.alerts && job.data.severity != undefined*/) {
            switch (job.data.action.type) {
              case 0:
                // communication
                // do_action(job.data, done)
                done();
                break;
              case 1:
                // action
                switch (job.data.action.name) {
                  case 'Stop':
                    if (!job.data.alerts) done();else do_stop(job.data, done);
                    break;
                  case 'Start':
                    if (!job.data.alerts) done();else do_start(job.data, done);
                    break;
                  case 'UpdateScalingInstance':
                    do_update_scaling_instance(job.data, done);
                    break;
                  default:
                    done();
                    break;
                }
                break;
              default:
                console.log('action type not supported:', job.data.action.type);
                done();
                break;
            }
          } else {
          done();
        }
      });
    }

    // Export the class
  };var scaledoer = ScaleDoer;

  // Internal librairies
  // -----------------------------------------------------------------------------


  var myenv = process.env.NODE_ENV || 'production';
  var scaleScaleDoer = new scaledoer(myenv);
  scaleScaleDoer.init(redis[myenv], worker[myenv], scaleScaleDoer.checkconnection);

  process.on('exit', function (code) {
    return console.log('! Webhook Worker ! About to exit with code ' + code);
  });

  var scale_doer_check = {};

  return scale_doer_check;

})));