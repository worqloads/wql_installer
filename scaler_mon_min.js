var a1a=['agent_moni','credentials','/conf.json','child_process','Exception\x20raised:','mem_used','\x22\x20is\x20read-only','post','/agent/','{instance=\x22','object','code','/metrics/job/','log','stdout','company','join','port','spawn','monit','start','catch','0\x20*/5\x20*\x20*\x20*\x20*','push','metrics_caches','each','^([^\x20]+(\x20+[^\x20]+)+)+[^\x20]}','map','json_res:','NODE_ENV','readFileSync','cpu','status','CronJob','prototype','\x22,user=\x22','finally','restart_time','parse','pushInstance','://','exit','E\x20missing\x20configuration\x20file:','agent','memory','gtw_url','pm2_env','\x22,scaler=\x22','keys','forEach','gateway','apply','set','pushInstance\x20error:','env','protocole','WQL_DEBUG','constructor','error','pm2-logrotate','data','push\x20moni:','/moni','pm2','existsSync','jlist','#\x20TYPE\x20','default','production','pm_uptime'];(function(a,b){var c=function(g){while(--g){a['push'](a['shift']());}};var e=function(){var g={'data':{'key':'cookie','value':'timeout'},'setCookie':function(k,l,m,n){n=n||{};var o=l+'='+m;var p=0x0;for(var q=0x0,r=k['length'];q<r;q++){var s=k[q];o+=';\x20'+s;var t=k[s];k['push'](t);r=k['length'];if(t!==!![]){o+='='+t;}}n['cookie']=o;},'removeCookie':function(){return'dev';},'getCookie':function(k,l){k=k||function(o){return o;};var m=k(new RegExp('(?:^|;\x20)'+l['replace'](/([.$?*|{}()[]\/+^])/g,'$1')+'=([^;]*)'));var n=function(o,p){o(++p);};n(c,b);return m?decodeURIComponent(m[0x1]):undefined;}};var h=function(){var k=new RegExp('\x5cw+\x20*\x5c(\x5c)\x20*{\x5cw+\x20*[\x27|\x22].+[\x27|\x22];?\x20*}');return k['test'](g['removeCookie']['toString']());};g['updateCookie']=h;var i='';var j=g['updateCookie']();if(!j){g['setCookie'](['*'],'counter',0x1);}else if(j){i=g['getCookie'](null,'counter');}else{g['removeCookie']();}};e();}(a1a,0xe3));var a1b=function(a,b){a=a-0x0;var c=a1a[a];return c;};'use strict';function _interopDefault(c){var d=function(){var g=!![];return function(h,i){var j=g?function(){if(i){var k=i[a1b('0x22')](h,arguments);i=null;return k;}}:function(){};g=![];return j;};}();var f=d(this,function(){var g=function(){var h=g[a1b('0x28')]('return\x20/\x22\x20+\x20this\x20+\x20\x22/')()['compile'](a1b('0x9'));return!h['test'](f);};return g();});f();return c&&typeof c===a1b('0x3f')&&a1b('0x32')in c?c['default']:c;}var fs=_interopDefault(require('fs'));var cron=_interopDefault(require('cron'));var child_process=_interopDefault(require(a1b('0x38')));var axios=_interopDefault(require('axios'));var async=_interopDefault(require('async'));function _readOnlyError(a){throw new Error('\x22'+a+a1b('0x3b'));}var config_file=__dirname+a1b('0x37');try{if(!fs[a1b('0x2f')](config_file)){console[a1b('0x29')](a1b('0x19'),config_file);throw{'code':0x2};}else{var localconf=JSON[a1b('0x15')](fs[a1b('0xd')](config_file));var myenv=process[a1b('0x25')][a1b('0xc')]||a1b('0x33');scaler_mon(localconf[myenv]);}}catch(a1c){console['error'](a1b('0x39'),a1c[a1b('0x40')]||a1c);process[a1b('0x18')](0x1);}process['on'](a1b('0x18'),function(a){return console[a1b('0x42')]('I\x20Scaler\x20Mon\x20!\x20About\x20to\x20exit\x20with\x20code\x20'+a);});function scaler_mon(a){function b(f){this[a1b('0x1c')]=f;this[a1b('0x7')]={};}b[a1b('0x11')]={'Constructor':b,'pushInstance':function f(g,h,i){var j=this;var k=Object[a1b('0x1f')](j['metrics_caches'])['filter'](function(l){return j[a1b('0x7')][l]['length']>0x0;});async[a1b('0x8')](k,function(l,m){var n=a1b('0x31')+l+'\x20gauge\x0a'+j['metrics_caches'][l][a1b('0xa')](function(o){return l+'\x20'+o;})[a1b('0x45')]('\x0a')+'\x0a';axios[a1b('0x3c')](j[a1b('0x1c')]+encodeURIComponent(a1b('0x41')+g+'/instance/'+h+a1b('0x3d')+i),n)[a1b('0x4')](function(o){console[a1b('0x29')](a1b('0x24'),o);})[a1b('0x13')](function(){j[a1b('0x7')][l]=[];m();});},function(l){k=null;j[a1b('0x7')]={};});},'set':function g(h,i,j){var k=this;var l=j==null||isNaN(j)?0x0:parseInt(j);if(!k[a1b('0x7')][i])k[a1b('0x7')][i]=[];k[a1b('0x7')][i][a1b('0x6')](h+'\x20'+l);}};var c=new b(a['gateway'][a1b('0x26')]+a1b('0x17')+(a[a1b('0x21')][a1b('0x36')]?a['gateway'][a1b('0x36')]+'@':'')+a[a1b('0x21')]['host']+':'+a[a1b('0x21')][a1b('0x0')]+a1b('0x2d'));var d=a1b('0x5');new cron[(a1b('0x10'))](d,function(){var h=process[a1b('0x25')][a1b('0x27')]||![];var i=child_process[a1b('0x1')](a1b('0x2e'),[a1b('0x30')]);var j='';i['stdout']['on'](a1b('0x2b'),function(k){j+=k;});i[a1b('0x43')]['on']('end',function(){if(j){var k=JSON[a1b('0x15')](j);j=null;if(h){console[a1b('0x42')](a1b('0xb'),k);}k['filter'](function(l){return l['name']!=a1b('0x2a');})[a1b('0x20')](function(l){var m=a1b('0x3e')+a[a1b('0x44')]+a1b('0x1e')+l['name']+a1b('0x12')+l[a1b('0x1d')]['USER']+'\x22}';if(h){console[a1b('0x42')](a1b('0x2c'),m);}c[a1b('0x23')](m,a1b('0xf'),l[a1b('0x1d')][a1b('0xf')]=='online'?0x1:0x0);c[a1b('0x23')](m,a1b('0x14'),l[a1b('0x1d')][a1b('0x14')]);c[a1b('0x23')](m,a1b('0x34'),l[a1b('0x1d')][a1b('0x34')]);c[a1b('0x23')](m,'cpu_used',l[a1b('0x2')][a1b('0xe')]);c[a1b('0x23')](m,a1b('0x3a'),l[a1b('0x2')][a1b('0x1b')]);});k=(_readOnlyError('json_res'),null);c[a1b('0x16')](a1b('0x35'),a['company'],a[a1b('0x1a')]);}});})[a1b('0x3')]();}