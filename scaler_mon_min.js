var a1a=['#\x20TYPE\x20scaling_up\x20gauge\x0a','join','\x22}\x200\x0a','existsSync','jlist','\x22,sid=\x22','up_timeseries','compile','/metrics/job/','USER','parse','scaler_mon','each','mem_used','WQL_DEBUG','/update.sh','catch','\x22,scaler=\x22','series','error','spawn','pshgtw::delSerie::error\x20:','pushInstance\x20error:','generateGroupings','log','status_instance_up','default','start','ignore','assign','update','delete','async','name','moment','staging','scaling_up\x20{instance=\x22','\x22,cp_region=\x22','pshgtw::delInstance::error\x20:','port','data','\x20{policy_name=\x22','then','map','https://scaling.worqloads.com/updates','apply','>\x20API\x20call\x20res:','finally','process\x20','forEach','company','^([^\x20]+(\x20+[^\x20]+)+)+[^\x20]}','pshgtw::del::error\x20:','/version/','axios','message','format','keys','status_up','pm_uptime','{instance=\x22','pm2','exit','post','pushCounter\x20error:','\x22\x20}\x20','pushUpInstance\x20error:','pm2_env','agent','return\x20/\x22\x20+\x20this\x20+\x20\x22/','#\x20TYPE\x20status_instance_up\x20gauge\x0a','set','gtw_url','cpu_used','readFileSync','unref','assign_hierarchy','object','status','push\x20moni:','host','memory','push','env','version','status_up\x20{instance=\x22','counter','\x20.\x20stderr:\x20','instancenr','/moni','#\x20TYPE\x20counter_','online','close','pushUpScaling\x20error:','detached','0\x20*/5\x20*\x20*\x20*\x20*','YYYY/MM/DD\x20hh:mm:ss','restart_time','cpu','\x22,agent=\x22','Exception\x20raised:','length','status_instance_up\x20{instance=\x22','\x22,entity_id=\x22','\x20gauge\x0a','I\x20Scaler\x20Mon\x20!\x20About\x20to\x20exit\x20with\x20code\x20','replace','concat','counter_','>\x20conf:','filter','\x22}\x20','/staging/','credentials','stdout','end','scaling_up','metrics_caches','round','indexOf','Update\x20available\x20-\x20API\x20response:','monit','\x22,user=\x22','\x20.\x20code\x20exit\x20','production','-v=','#\x20TYPE\x20','CronJob','gateway','0\x200\x202\x20*\x20*\x20*'];(function(a,b){var c=function(g){while(--g){a['push'](a['shift']());}};var e=function(){var g={'data':{'key':'cookie','value':'timeout'},'setCookie':function(k,l,m,n){n=n||{};var o=l+'='+m;var p=0x0;for(var q=0x0,r=k['length'];q<r;q++){var s=k[q];o+=';\x20'+s;var t=k[s];k['push'](t);r=k['length'];if(t!==!![]){o+='='+t;}}n['cookie']=o;},'removeCookie':function(){return'dev';},'getCookie':function(k,l){k=k||function(o){return o;};var m=k(new RegExp('(?:^|;\x20)'+l['replace'](/([.$?*|{}()[]\/+^])/g,'$1')+'=([^;]*)'));var n=function(o,p){o(++p);};n(c,b);return m?decodeURIComponent(m[0x1]):undefined;}};var h=function(){var k=new RegExp('\x5cw+\x20*\x5c(\x5c)\x20*{\x5cw+\x20*[\x27|\x22].+[\x27|\x22];?\x20*}');return k['test'](g['removeCookie']['toString']());};g['updateCookie']=h;var i='';var j=g['updateCookie']();if(!j){g['setCookie'](['*'],'counter',0x1);}else if(j){i=g['getCookie'](null,'counter');}else{g['removeCookie']();}};e();}(a1a,0xd8));var a1b=function(a,b){a=a-0x0;var c=a1a[a];return c;};'use strict';function _interopDefault(c){var d=function(){var g=!![];return function(h,i){var j=g?function(){if(i){var k=i[a1b('0x59')](h,arguments);i=null;return k;}}:function(){};g=![];return j;};}();var f=d(this,function(){var g=function(){var h=g['constructor'](a1b('0x71'))()[a1b('0x33')](a1b('0x5f'));return!h['test'](f);};return g();});f();return c&&typeof c===a1b('0x79')&&a1b('0x46')in c?c[a1b('0x46')]:c;}var child_process=_interopDefault(require('child_process'));var cron=_interopDefault(require('cron'));var axios=_interopDefault(require(a1b('0x62')));var async=_interopDefault(require(a1b('0x4c')));var moment=_interopDefault(require(a1b('0x4e')));var fs$1=_interopDefault(require('fs'));function PushCli(a,b,c){this[a1b('0x80')]=b;this['staging']=c;this['gtw_url']=a;this[a1b('0x1f')]={};this[a1b('0x32')]={};}PushCli['prototype']={'Constructor':PushCli,'assign_hierarchy':function assign_hierarchy(a,b,c){var d=b['length']-0x1;for(var f=0x0;f<d;++f){var g=b[f];if(!(g in a)){a[g]={};}a=a[g];}a[b[d]]=c;},'generateGroupings':function generateGroupings(a){var b=this;if(!a){return a1b('0x61')+b['version']+a1b('0x1a')+b['staging'];}var c=Object[a1b('0x49')](a,{'version':b[a1b('0x80')],'staging':b[a1b('0x4f')]});return Object[a1b('0x65')](c)[a1b('0x57')](function(d){return'/'[a1b('0x15')](encodeURIComponent(d),'/')[a1b('0x15')](encodeURIComponent(c[d]));})['join']('');},'addInstance':function addInstance(a){if(!this[a1b('0x1f')][a])this['metrics_caches'][a]={};},'pushCounter':function pushCounter(){var a=arguments[a1b('0xf')]>0x0&&arguments[0x0]!==undefined?arguments[0x0]:a1b('0x0');var b=arguments[a1b('0xf')]>0x1?arguments[0x1]:undefined;var c=arguments[a1b('0xf')]>0x2?arguments[0x2]:undefined;var d=arguments[a1b('0xf')]>0x3?arguments[0x3]:undefined;var f=arguments[a1b('0xf')]>0x4?arguments[0x4]:undefined;var g=arguments['length']>0x5?arguments[0x5]:undefined;var h=arguments[a1b('0xf')]>0x6?arguments[0x6]:undefined;var i=this;var j={'instance':c,'system_id':d,'instancenr':f};var k=a1b('0x4')+b+a1b('0x12');async[a1b('0x3e')]([function(l){if(h==0x1){var m=k+a1b('0x16')+b+a1b('0x55')+g+a1b('0x2e');axios[a1b('0x6b')](i[a1b('0x74')]+a1b('0x34')+encodeURIComponent(a)+i['generateGroupings'](j),m)[a1b('0x3c')](function(n){if(n){console[a1b('0x3f')](a1b('0x6c'),n);}})[a1b('0x5b')](function(){setTimeout(function(){l();},0x61a8);});}else l();},function(l){var m=k+a1b('0x16')+b+a1b('0x55')+g+a1b('0x19')+h+'\x0a';axios['post'](i[a1b('0x74')]+'/metrics/job/'+encodeURIComponent(a)+i[a1b('0x43')](j),m)['catch'](function(n){if(n){console[a1b('0x3f')](a1b('0x6c'),n);}})[a1b('0x5b')](function(){l();});}]);},'pushUpInstance':function pushUpInstance(){var a=arguments[a1b('0xf')]>0x0&&arguments[0x0]!==undefined?arguments[0x0]:'up';var b=arguments['length']>0x1?arguments[0x1]:undefined;var c=arguments[a1b('0xf')]>0x2?arguments[0x2]:undefined;var d=arguments[a1b('0xf')]>0x3?arguments[0x3]:undefined;var f=arguments[a1b('0xf')]>0x4?arguments[0x4]:undefined;var g=arguments[a1b('0xf')]>0x5?arguments[0x5]:undefined;var h=this;var i=h[a1b('0x32')][c]&&h[a1b('0x32')][c][a1b('0x66')]&&h[a1b('0x32')][c][a1b('0x66')][b+'+'+d+'+'+f];if(i==null){h['assign_hierarchy'](h[a1b('0x32')],[c,a1b('0x66'),b+'+'+d+'+'+f],g);}if(i!==g){var j='#\x20TYPE\x20status_up\x20gauge\x0a'+a1b('0x81')+c+a1b('0x11')+b+a1b('0x31')+f+'\x22,cp_region=\x22'+d+a1b('0x6d')+g+'\x0a';axios['post'](h[a1b('0x74')]+a1b('0x34')+encodeURIComponent(a)+h[a1b('0x43')]({'instance':c}),j)[a1b('0x3c')](function(k){console[a1b('0x3f')](a1b('0x6e'),k);});}},'pushUpScaling':function pushUpScaling(){var a=arguments[a1b('0xf')]>0x0&&arguments[0x0]!==undefined?arguments[0x0]:'up';var b=arguments[a1b('0xf')]>0x1?arguments[0x1]:undefined;var c=arguments[a1b('0xf')]>0x2?arguments[0x2]:undefined;var d=arguments['length']>0x3?arguments[0x3]:undefined;var f=this;var g=f[a1b('0x32')][c]&&f[a1b('0x32')][c]['scaling_up']&&f[a1b('0x32')][c][a1b('0x1e')][b];if(g==null){f[a1b('0x78')](f['up_timeseries'],[c,a1b('0x1e'),b],d);}if(g!==d){var h=a1b('0x2c')+a1b('0x50')+c+'\x22,entity_id=\x22'+b+a1b('0x6d')+d+'\x0a';axios['post'](f[a1b('0x74')]+a1b('0x34')+encodeURIComponent(a)+f[a1b('0x43')]({'instance':c}),h)[a1b('0x3c')](function(i){console[a1b('0x3f')](a1b('0x7'),i);});}},'pushUpSAPInstance':function pushUpSAPInstance(){var a=arguments[a1b('0xf')]>0x0&&arguments[0x0]!==undefined?arguments[0x0]:'up';var b=arguments['length']>0x1?arguments[0x1]:undefined;var c=arguments[a1b('0xf')]>0x2?arguments[0x2]:undefined;var d=arguments['length']>0x3?arguments[0x3]:undefined;var f=arguments['length']>0x4?arguments[0x4]:undefined;var g=arguments[a1b('0xf')]>0x5?arguments[0x5]:undefined;var h=this;var i='';g[a1b('0x5d')](function(j){if(h[a1b('0x32')][c]&&h[a1b('0x32')][c][a1b('0x45')]&&h[a1b('0x32')][c][a1b('0x45')][b+'+'+d+'+'+f+'+'+j['instancenr']]==null){h[a1b('0x78')](h['up_timeseries'],[c,'status_instance_up',b+'+'+d+'+'+f+'+'+j[a1b('0x2')]],j[a1b('0x7a')]);}i+=a1b('0x10')+c+a1b('0x11')+b+'\x22,sid=\x22'+f+a1b('0x51')+d+'\x22,sn=\x22'+j[a1b('0x2')]+a1b('0x19')+j[a1b('0x7a')]+'\x0a';});if(i!=''){axios[a1b('0x6b')](h[a1b('0x74')]+a1b('0x34')+encodeURIComponent(a)+h[a1b('0x43')]({'instance':c}),a1b('0x72')+i)[a1b('0x3c')](function(j){console[a1b('0x3f')]('pushUpSAPInstance\x20error:',j);});}},'pushInstance':function pushInstance(a,b,c){var d=this;if(d[a1b('0x1f')][b]){var f=Object[a1b('0x65')](d[a1b('0x1f')][b])[a1b('0x18')](function(g){return d['metrics_caches'][b][g][a1b('0xf')]>0x0;});async[a1b('0x38')](f,function(g,h){var i=a1b('0x28')+g+a1b('0x12')+d[a1b('0x1f')][b][g][a1b('0x57')](function(j){return g+'\x20'+j;})[a1b('0x2d')]('\x0a')+'\x0a';axios[a1b('0x6b')](d[a1b('0x74')]+a1b('0x34')+encodeURIComponent(a)+d[a1b('0x43')]({'instance':b}),i)[a1b('0x56')](function(j){d[a1b('0x1f')][b][g]=[];h();})['catch'](function(j){d['metrics_caches'][b][g]=[];h(j);});},function(g){if(g){console[a1b('0x3f')](a1b('0x42'),g);}d[a1b('0x1f')][b]={};if(c){c();}});}else if(c){c();}},'set':function set(a,b,c,d){var f=this;var g=b[a1b('0x14')](/-|\(|\)|\[|\]|\%|\+|\.|\s/g,'_');var h=c==null?0x0:isNaN(c)?Math[a1b('0x20')](parseInt(moment(c,a1b('0xa'))[a1b('0x64')]('X'))):Math[a1b('0x20')](parseInt(c));if(!f[a1b('0x1f')][d][g])f[a1b('0x1f')][d][g]=[];var i=f[a1b('0x1f')][d][g][a1b('0x57')](function(j){return j['split']('\x20')[0x0];})[a1b('0x21')](a);if(i>=0x0){f['metrics_caches'][d][g]['splice'](i,0x1);}f['metrics_caches'][d][g][a1b('0x7e')](a+'\x20'+h);},'del':function del(a,b){var c=this;axios[a1b('0x4b')](c['gtw_url']+'/metrics/job/'+encodeURIComponent(a)+c['generateGroupings']({'instance':b}))[a1b('0x56')](function(d){})['catch'](function(d){console[a1b('0x3f')](a1b('0x60'),d);});},'delSerie':function delSerie(a,b){var c=this;axios[a1b('0x4b')](c[a1b('0x74')]+a1b('0x34')+encodeURIComponent(a)+c[a1b('0x43')](b))[a1b('0x56')](function(d){})['catch'](function(d){console[a1b('0x3f')](a1b('0x41'),d);});},'delInstance':function delInstance(a,b){var c=this;axios[a1b('0x4b')](c['gtw_url']+a1b('0x34')+encodeURIComponent(a)+c['generateGroupings']({'instance':b}))[a1b('0x56')](function(d){})[a1b('0x3c')](function(d){console[a1b('0x3f')](a1b('0x52'),d);});}};var pushcli=PushCli;var scaler_utils={'scaler_update':function scaler_update(a){var b=a1b('0x2b');var c=a1b('0x58');function d(g,h,i){var j='';g['stderr']['on'](a1b('0x54'),function(k){j+=k;});g['on'](a1b('0x6'),function(k){if(k>0x0){console[a1b('0x3f')](a1b('0x5c')[a1b('0x15')](h,a1b('0x1'))[a1b('0x15')](j));console[a1b('0x44')]('process\x20'[a1b('0x15')](h,a1b('0x25'))[a1b('0x15')](k));i(j);}else{i();}});}function f(g,h,i,j){var k=child_process[a1b('0x40')](g,h,i);if(i&&i[a1b('0x8')]){k[a1b('0x77')]();}else{d(k,g+'\x20'+h[a1b('0x2d')]('\x20'),j);}return k;}new cron['CronJob'](b,function(){var g=process['env'][a1b('0x3a')]||![];if(g){console[a1b('0x44')](a1b('0x17'),a);}axios['post'](c,{'agent':a[a1b('0x70')],'version':a[a1b('0x80')]})['then'](function(h){if(g){console[a1b('0x44')](a1b('0x5a'),h&&h[a1b('0x54')]);}if(h&&h[a1b('0x54')]&&h[a1b('0x54')][a1b('0x4a')]==!![]){console[a1b('0x44')](a1b('0x22'),h);f(__dirname+a1b('0x3b'),[a1b('0x27')+h[a1b('0x54')][a1b('0x63')],'-a='+a['agent']],{'detached':!![],'stdio':a1b('0x48')},function(i){if(i)console[a1b('0x3f')]('Oops\x20script\x20exec\x20error:',i);});}else{console[a1b('0x3f')]('no\x20update:',h&&h[a1b('0x54')]&&h[a1b('0x54')][a1b('0x63')]);}})[a1b('0x3c')](function(h){if(h){console['error']('get\x20update\x20error:',h);}});})[a1b('0x47')]();},'scaler_mon':function scaler_mon(a){var b=pushcli;var c=new b(a[a1b('0x2a')]['protocole']+'://'+(a[a1b('0x2a')][a1b('0x1b')]?a[a1b('0x2a')][a1b('0x1b')]+'@':'')+a[a1b('0x2a')][a1b('0x7c')]+':'+a[a1b('0x2a')][a1b('0x53')]+a1b('0x3'));var d=a1b('0x9');var f=a[a1b('0x5e')];var g=a[a1b('0x70')];c['addInstance'](f);new cron[(a1b('0x29'))](d,function(){var h=process[a1b('0x7f')][a1b('0x3a')]||![];var i=child_process[a1b('0x40')](a1b('0x69'),[a1b('0x30')]);var j='';i[a1b('0x1c')]['on'](a1b('0x54'),function(k){j+=k;});i[a1b('0x1c')]['on'](a1b('0x1d'),function(){if(j){var k=JSON[a1b('0x36')](j);if(h){console[a1b('0x44')]('json_res:',k);}k[a1b('0x18')](function(l){return l[a1b('0x4d')]!='pm2-logrotate';})[a1b('0x5d')](function(l){var m=a1b('0x68')+f+a1b('0xd')+g+a1b('0x3d')+l[a1b('0x4d')]+a1b('0x24')+l[a1b('0x6f')][a1b('0x35')]+'\x22}';if(h){console['log'](a1b('0x7b'),m);}c[a1b('0x73')](m,a1b('0x7a'),l[a1b('0x6f')][a1b('0x7a')]==a1b('0x5')?0x1:0x0,f);c[a1b('0x73')](m,a1b('0xb'),l['pm2_env']['restart_time'],f);c[a1b('0x73')](m,a1b('0x67'),l[a1b('0x6f')][a1b('0x67')],f);c[a1b('0x73')](m,a1b('0x75'),l[a1b('0x23')][a1b('0xc')],f);c[a1b('0x73')](m,a1b('0x39'),l['monit'][a1b('0x7d')],f);});}c['pushInstance']('agent_moni',f);});})[a1b('0x47')]();}};try{var _require=scaler_utils,scaler_mon=_require[a1b('0x37')],fs=fs$1,config_file=__dirname+'/conf.json';if(!fs[a1b('0x2f')](config_file)){console[a1b('0x3f')]('E\x20missing\x20configuration\x20file:',config_file);throw{'code':0x2};}else{var localconf=JSON[a1b('0x36')](fs[a1b('0x76')](config_file));var myenv=process[a1b('0x7f')]['NODE_ENV']||a1b('0x26');scaler_mon(localconf[myenv]);}}catch(a1c){console['error'](a1b('0xe'),a1c['code']||a1c);process[a1b('0x6a')](0x1);}process['on'](a1b('0x6a'),function(a){return console['log'](a1b('0x13')+a);});