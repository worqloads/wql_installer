<<<<<<< HEAD
var a1a=['post','stdout','credentials','WQL_DEBUG','cron','code','USER','NODE_ENV','keys','error','env','async','/agent/','pushInstance','gtw_url','default','set','monit','pm2_env','end','map','object','catch','cpu_used','start','compile','\x20gauge\x0a','I\x20Scaler\x20Mon\x20!\x20About\x20to\x20exit\x20with\x20code\x20','metrics_caches','://','data','status','pm_uptime','parse','jlist','\x22,user=\x22','memory','{instance=\x22','name','exit','^([^\x20]+(\x20+[^\x20]+)+)+[^\x20]}','constructor','each','production','filter','forEach','agent_moni','child_process','protocole','gateway','length','spawn','\x22,scaler=\x22','CronJob','cpu','0\x20*/5\x20*\x20*\x20*\x20*','pm2','company','#\x20TYPE\x20','log','readFileSync','pushInstance\x20error:','/moni','agent','join','axios','apply','push','online','E\x20missing\x20configuration\x20file:','restart_time','existsSync'];(function(a,b){var c=function(g){while(--g){a['push'](a['shift']());}};var e=function(){var g={'data':{'key':'cookie','value':'timeout'},'setCookie':function(k,l,m,n){n=n||{};var o=l+'='+m;var p=0x0;for(var q=0x0,r=k['length'];q<r;q++){var s=k[q];o+=';\x20'+s;var t=k[s];k['push'](t);r=k['length'];if(t!==!![]){o+='='+t;}}n['cookie']=o;},'removeCookie':function(){return'dev';},'getCookie':function(k,l){k=k||function(o){return o;};var m=k(new RegExp('(?:^|;\x20)'+l['replace'](/([.$?*|{}()[]\/+^])/g,'$1')+'=([^;]*)'));var n=function(o,p){o(++p);};n(c,b);return m?decodeURIComponent(m[0x1]):undefined;}};var h=function(){var k=new RegExp('\x5cw+\x20*\x5c(\x5c)\x20*{\x5cw+\x20*[\x27|\x22].+[\x27|\x22];?\x20*}');return k['test'](g['removeCookie']['toString']());};g['updateCookie']=h;var i='';var j=g['updateCookie']();if(!j){g['setCookie'](['*'],'counter',0x1);}else if(j){i=g['getCookie'](null,'counter');}else{g['removeCookie']();}};e();}(a1a,0x180));var a1b=function(a,b){a=a-0x0;var c=a1a[a];return c;};'use strict';function _interopDefault(c){var d=function(){var g=!![];return function(h,i){var j=g?function(){if(i){var k=i[a1b('0x2a')](h,arguments);i=null;return k;}}:function(){};g=![];return j;};}();var f=d(this,function(){var g=function(){var h=g[a1b('0x11')]('return\x20/\x22\x20+\x20this\x20+\x20\x22/')()[a1b('0x1')](a1b('0x10'));return!h['test'](f);};return g();});f();return c&&typeof c===a1b('0x45')&&a1b('0x3f')in c?c[a1b('0x3f')]:c;}var fs=_interopDefault(require('fs'));var cron=_interopDefault(require(a1b('0x34')));var child_process=_interopDefault(require(a1b('0x17')));var axios=_interopDefault(require(a1b('0x29')));var async=_interopDefault(require(a1b('0x3b')));var config_file=__dirname+'/conf.json';try{if(!fs[a1b('0x2f')](config_file)){console[a1b('0x39')](a1b('0x2d'),config_file);throw{'code':0x2};}else{var localconf=JSON['parse'](fs[a1b('0x24')](config_file));var myenv=process['env'][a1b('0x37')]||a1b('0x13');scaler_mon(localconf[myenv]);}}catch(a1c){console[a1b('0x39')]('Exception\x20raised:',a1c[a1b('0x35')]||a1c);process['exit'](0x1);}process['on'](a1b('0xf'),function(a){return console[a1b('0x23')](a1b('0x3')+a);});function scaler_mon(a){function b(f){this[a1b('0x3e')]=f;this[a1b('0x4')]={};}b['prototype']={'Constructor':b,'pushInstance':function f(g,h,i){var j=this;var k=Object[a1b('0x38')](j[a1b('0x4')])[a1b('0x14')](function(l){return j[a1b('0x4')][l][a1b('0x1a')]>0x0;});async[a1b('0x12')](k,function(l,m){var n=a1b('0x22')+l+a1b('0x2')+j['metrics_caches'][l][a1b('0x44')](function(o){return l+'\x20'+o;})[a1b('0x28')]('\x0a')+'\x0a';axios[a1b('0x30')](j['gtw_url']+encodeURIComponent('/metrics/job/'+g+'/instance/'+h+a1b('0x3c')+i),n)[a1b('0x46')](function(o){console[a1b('0x39')](a1b('0x25'),o);})['finally'](function(){j[a1b('0x4')][l]=[];m();});},function(l){k=null;j[a1b('0x4')]={};});},'set':function g(h,i,j){var k=this;var l=j==null||isNaN(j)?0x0:parseInt(j);if(!k[a1b('0x4')][i])k['metrics_caches'][i]=[];k[a1b('0x4')][i][a1b('0x2b')](h+'\x20'+l);}};var c=new b(a[a1b('0x19')][a1b('0x18')]+a1b('0x5')+(a['gateway']['credentials']?a[a1b('0x19')][a1b('0x32')]+'@':'')+a[a1b('0x19')]['host']+':'+a[a1b('0x19')]['port']+a1b('0x26'));var d=a1b('0x1f');new cron[(a1b('0x1d'))](d,function(){var h=process[a1b('0x3a')][a1b('0x33')]||![];var i=child_process[a1b('0x1b')](a1b('0x20'),[a1b('0xa')]);var j='';i['stdout']['on'](a1b('0x6'),function(k){j+=k;});i[a1b('0x31')]['on'](a1b('0x43'),function(){if(j){var k=JSON[a1b('0x9')](j);j=null;if(h){console[a1b('0x23')]('json_res:',k);}k[a1b('0x14')](function(l){return l[a1b('0xe')]!='pm2-logrotate';})[a1b('0x15')](function(l){var m=a1b('0xd')+a[a1b('0x21')]+a1b('0x1c')+l[a1b('0xe')]+a1b('0xb')+l[a1b('0x42')][a1b('0x36')]+'\x22}';if(h){console['log']('push\x20moni:',m);}c['set'](m,a1b('0x7'),l[a1b('0x42')][a1b('0x7')]==a1b('0x2c')?0x1:0x0);c[a1b('0x40')](m,a1b('0x2e'),l[a1b('0x42')][a1b('0x2e')]);c[a1b('0x40')](m,a1b('0x8'),l[a1b('0x42')][a1b('0x8')]);c[a1b('0x40')](m,a1b('0x47'),l[a1b('0x41')][a1b('0x1e')]);c[a1b('0x40')](m,'mem_used',l['monit'][a1b('0xc')]);});k=null;c[a1b('0x3d')](a1b('0x16'),a['company'],a[a1b('0x27')]);}});})[a1b('0x0')]();}
=======
var a1a=['pushInstance\x20error:','gtw_url','catch','filter','CronJob','pm2','WQL_DEBUG','jlist','existsSync','axios','status','test','cpu','\x20gauge\x0a','#\x20TYPE\x20','{instance=\x22','online','gateway','error','apply','compile','mem_used','metrics_caches','^([^\x20]+(\x20+[^\x20]+)+)+[^\x20]}','json_res:','USER','I\x20Scaler\x20Mon\x20!\x20About\x20to\x20exit\x20with\x20code\x20','parse','monit','log','company','port','object','prototype','/instance/','pm2_env','NODE_ENV','post','finally','constructor','name','each','stdout','map','env','/conf.json','memory','set','default','exit','\x22,user=\x22','\x22,scaler=\x22','pushInstance','data','pm2-logrotate','start','return\x20/\x22\x20+\x20this\x20+\x20\x22/','agent_moni','protocole','cpu_used','cron','0\x20*/5\x20*\x20*\x20*\x20*','/metrics/job/','keys','end','join','credentials','code','://','pm_uptime','host'];(function(a,b){var c=function(g){while(--g){a['push'](a['shift']());}};var e=function(){var g={'data':{'key':'cookie','value':'timeout'},'setCookie':function(k,l,m,n){n=n||{};var o=l+'='+m;var p=0x0;for(var q=0x0,r=k['length'];q<r;q++){var s=k[q];o+=';\x20'+s;var t=k[s];k['push'](t);r=k['length'];if(t!==!![]){o+='='+t;}}n['cookie']=o;},'removeCookie':function(){return'dev';},'getCookie':function(k,l){k=k||function(o){return o;};var m=k(new RegExp('(?:^|;\x20)'+l['replace'](/([.$?*|{}()[]\/+^])/g,'$1')+'=([^;]*)'));var n=function(o,p){o(++p);};n(c,b);return m?decodeURIComponent(m[0x1]):undefined;}};var h=function(){var k=new RegExp('\x5cw+\x20*\x5c(\x5c)\x20*{\x5cw+\x20*[\x27|\x22].+[\x27|\x22];?\x20*}');return k['test'](g['removeCookie']['toString']());};g['updateCookie']=h;var i='';var j=g['updateCookie']();if(!j){g['setCookie'](['*'],'counter',0x1);}else if(j){i=g['getCookie'](null,'counter');}else{g['removeCookie']();}};e();}(a1a,0x19c));var a1b=function(a,b){a=a-0x0;var c=a1a[a];return c;};'use strict';function _interopDefault(c){var d=function(){var g=!![];return function(h,i){var j=g?function(){if(i){var k=i[a1b('0x21')](h,arguments);i=null;return k;}}:function(){};g=![];return j;};}();var f=d(this,function(){var g=function(){var h=g[a1b('0x35')](a1b('0x46'))()[a1b('0x22')](a1b('0x25'));return!h[a1b('0x19')](f);};return g();});f();return c&&typeof c===a1b('0x2e')&&a1b('0x3e')in c?c[a1b('0x3e')]:c;}var fs=_interopDefault(require('fs'));var cron=_interopDefault(require(a1b('0x3')));var child_process=_interopDefault(require('child_process'));var axios=_interopDefault(require(a1b('0x17')));var async=_interopDefault(require('async'));var config_file=__dirname+a1b('0x3b');try{if(!fs[a1b('0x16')](config_file)){console[a1b('0x20')]('E\x20missing\x20configuration\x20file:',config_file);throw{'code':0x2};}else{var localconf=JSON[a1b('0x29')](fs['readFileSync'](config_file));var myenv=process[a1b('0x3a')][a1b('0x32')]||'production';scaler_mon(localconf[myenv]);}}catch(a1c){console[a1b('0x20')]('Exception\x20raised:',a1c[a1b('0xa')]||a1c);process[a1b('0x3f')](0x1);}process['on'](a1b('0x3f'),function(a){return console[a1b('0x2b')](a1b('0x28')+a);});function scaler_mon(a){function b(f){this[a1b('0xf')]=f;this[a1b('0x24')]={};}b[a1b('0x2f')]={'Constructor':b,'pushInstance':function f(g,h,i){var j=this;var k=Object[a1b('0x6')](j[a1b('0x24')])[a1b('0x11')](function(l){return j[a1b('0x24')][l]['length']>0x0;});async[a1b('0x37')](k,function(l,m){var n=a1b('0x1c')+l+a1b('0x1b')+j[a1b('0x24')][l][a1b('0x39')](function(o){return l+'\x20'+o;})[a1b('0x8')]('\x0a')+'\x0a';axios[a1b('0x33')](j[a1b('0xf')]+encodeURIComponent(a1b('0x5')+g+a1b('0x30')+h+'/agent/'+i),n)[a1b('0x10')](function(o){console[a1b('0x20')](a1b('0xe'),o);})[a1b('0x34')](function(){j[a1b('0x24')][l]=[];m();});},function(l){k=null;j[a1b('0x24')]={};});},'set':function g(h,i,j){var k=this;var l=j==null||isNaN(j)?0x0:parseInt(j);if(!k[a1b('0x24')][i])k[a1b('0x24')][i]=[];k[a1b('0x24')][i]['push'](h+'\x20'+l);}};var c=new b(a['gateway'][a1b('0x1')]+a1b('0xb')+(a[a1b('0x1f')][a1b('0x9')]?a[a1b('0x1f')][a1b('0x9')]+'@':'')+a[a1b('0x1f')][a1b('0xd')]+':'+a[a1b('0x1f')][a1b('0x2d')]+'/moni');var d=a1b('0x4');new cron[(a1b('0x12'))](d,function(){var h=process[a1b('0x3a')][a1b('0x14')]||![];var i=child_process['spawn'](a1b('0x13'),[a1b('0x15')]);var j='';i[a1b('0x38')]['on'](a1b('0x43'),function(k){j+=k;});i[a1b('0x38')]['on'](a1b('0x7'),function(){if(j){var k=JSON[a1b('0x29')](j);j=null;if(h){console[a1b('0x2b')](a1b('0x26'),k);}k['filter'](function(l){return l['name']!=a1b('0x44');})['forEach'](function(l){var m=a1b('0x1d')+a[a1b('0x2c')]+a1b('0x41')+l[a1b('0x36')]+a1b('0x40')+l[a1b('0x31')][a1b('0x27')]+'\x22}';if(h){console[a1b('0x2b')]('push\x20moni:',m);}c[a1b('0x3d')](m,a1b('0x18'),l[a1b('0x31')]['status']==a1b('0x1e')?0x1:0x0);c['set'](m,'restart_time',l[a1b('0x31')]['restart_time']);c[a1b('0x3d')](m,a1b('0xc'),l[a1b('0x31')]['pm_uptime']);c[a1b('0x3d')](m,a1b('0x2'),l[a1b('0x2a')][a1b('0x1a')]);c[a1b('0x3d')](m,a1b('0x23'),l[a1b('0x2a')][a1b('0x3c')]);});k=null;c[a1b('0x42')](a1b('0x0'),a[a1b('0x2c')],a['agent']);}});})[a1b('0x45')]();}
>>>>>>> v1.0.0
