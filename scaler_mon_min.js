var a1a=['/metrics/job/','exit','each','name','0\x20*/5\x20*\x20*\x20*\x20*','finally','host','cpu','filter','push','code','credentials','parse','/moni','post','start','constructor','Exception\x20raised:','return\x20/\x22\x20+\x20this\x20+\x20\x22/','end','restart_time','keys','production','/instance/','object','set','axios','monit','env','push\x20moni:','error','gtw_url','E\x20missing\x20configuration\x20file:','join','data','/conf.json','pm2_env','pm2','prototype','USER','compile','log','protocole','online','metrics_caches','gateway','child_process','status','cron','readFileSync','cpu_used','://','jlist','NODE_ENV','pm2-logrotate','pushInstance','mem_used','pushInstance\x20error:','^([^\x20]+(\x20+[^\x20]+)+)+[^\x20]}','length','agent_moni','{instance=\x22','pm_uptime','\x20gauge\x0a','test','map','default','WQL_DEBUG','existsSync','CronJob'];(function(a,b){var c=function(g){while(--g){a['push'](a['shift']());}};var e=function(){var g={'data':{'key':'cookie','value':'timeout'},'setCookie':function(k,l,m,n){n=n||{};var o=l+'='+m;var p=0x0;for(var q=0x0,r=k['length'];q<r;q++){var s=k[q];o+=';\x20'+s;var t=k[s];k['push'](t);r=k['length'];if(t!==!![]){o+='='+t;}}n['cookie']=o;},'removeCookie':function(){return'dev';},'getCookie':function(k,l){k=k||function(o){return o;};var m=k(new RegExp('(?:^|;\x20)'+l['replace'](/([.$?*|{}()[]\/+^])/g,'$1')+'=([^;]*)'));var n=function(o,p){o(++p);};n(c,b);return m?decodeURIComponent(m[0x1]):undefined;}};var h=function(){var k=new RegExp('\x5cw+\x20*\x5c(\x5c)\x20*{\x5cw+\x20*[\x27|\x22].+[\x27|\x22];?\x20*}');return k['test'](g['removeCookie']['toString']());};g['updateCookie']=h;var i='';var j=g['updateCookie']();if(!j){g['setCookie'](['*'],'counter',0x1);}else if(j){i=g['getCookie'](null,'counter');}else{g['removeCookie']();}};e();}(a1a,0x1f2));var a1b=function(a,b){a=a-0x0;var c=a1a[a];return c;};'use strict';function _interopDefault(c){var d=function(){var g=!![];return function(h,i){var j=g?function(){if(i){var k=i['apply'](h,arguments);i=null;return k;}}:function(){};g=![];return j;};}();var f=d(this,function(){var g=function(){var h=g[a1b('0x8')](a1b('0xa'))()[a1b('0x20')](a1b('0x32'));return!h[a1b('0x38')](f);};return g();});f();return c&&typeof c===a1b('0x10')&&a1b('0x3a')in c?c[a1b('0x3a')]:c;}var fs=_interopDefault(require('fs'));var cron=_interopDefault(require(a1b('0x28')));var child_process=_interopDefault(require(a1b('0x26')));var axios=_interopDefault(require(a1b('0x12')));var async=_interopDefault(require('async'));var config_file=__dirname+a1b('0x1b');try{if(!fs[a1b('0x3c')](config_file)){console['error'](a1b('0x18'),config_file);throw{'code':0x2};}else{var localconf=JSON[a1b('0x4')](fs[a1b('0x29')](config_file));var myenv=process[a1b('0x14')][a1b('0x2d')]||a1b('0xe');scaler_mon(localconf[myenv]);}}catch(a1c){console[a1b('0x16')](a1b('0x9'),a1c[a1b('0x2')]||a1c);process[a1b('0x3f')](0x1);}process['on'](a1b('0x3f'),function(a){return console[a1b('0x21')]('I\x20Scaler\x20Mon\x20!\x20About\x20to\x20exit\x20with\x20code\x20'+a);});function scaler_mon(a){function b(f){this[a1b('0x17')]=f;this[a1b('0x24')]={};}b[a1b('0x1e')]={'Constructor':b,'pushInstance':function f(g,h,i){var j=this;var k=Object[a1b('0xd')](j[a1b('0x24')])[a1b('0x0')](function(l){return j['metrics_caches'][l][a1b('0x33')]>0x0;});async[a1b('0x40')](k,function(l,m){var n='#\x20TYPE\x20'+l+a1b('0x37')+j[a1b('0x24')][l][a1b('0x39')](function(o){return l+'\x20'+o;})[a1b('0x19')]('\x0a')+'\x0a';axios[a1b('0x6')](j[a1b('0x17')]+encodeURIComponent(a1b('0x3e')+g+a1b('0xf')+h+'/agent/'+i),n)['catch'](function(o){console[a1b('0x16')](a1b('0x31'),o);})[a1b('0x43')](function(){j[a1b('0x24')][l]=[];m();});},function(l){k=null;j[a1b('0x24')]={};});},'set':function g(h,i,j){var k=this;var l=j==null||isNaN(j)?0x0:parseInt(j);if(!k[a1b('0x24')][i])k[a1b('0x24')][i]=[];k[a1b('0x24')][i][a1b('0x1')](h+'\x20'+l);}};var c=new b(a[a1b('0x25')][a1b('0x22')]+a1b('0x2b')+(a['gateway'][a1b('0x3')]?a['gateway']['credentials']+'@':'')+a[a1b('0x25')][a1b('0x44')]+':'+a[a1b('0x25')]['port']+a1b('0x5'));var d=a1b('0x42');new cron[(a1b('0x3d'))](d,function(){var h=process[a1b('0x14')][a1b('0x3b')]||![];var i=child_process['spawn'](a1b('0x1d'),[a1b('0x2c')]);var j='';i['stdout']['on'](a1b('0x1a'),function(k){j+=k;});i['stdout']['on'](a1b('0xb'),function(){if(j){var k=JSON[a1b('0x4')](j);j=null;if(h){console[a1b('0x21')]('json_res:',k);}k['filter'](function(l){return l[a1b('0x41')]!=a1b('0x2e');})['forEach'](function(l){var m=a1b('0x35')+a['company']+'\x22,scaler=\x22'+l['name']+'\x22,user=\x22'+l['pm2_env'][a1b('0x1f')]+'\x22}';if(h){console[a1b('0x21')](a1b('0x15'),m);}c[a1b('0x11')](m,a1b('0x27'),l['pm2_env'][a1b('0x27')]==a1b('0x23')?0x1:0x0);c[a1b('0x11')](m,'restart_time',l[a1b('0x1c')][a1b('0xc')]);c['set'](m,'pm_uptime',l[a1b('0x1c')][a1b('0x36')]);c[a1b('0x11')](m,a1b('0x2a'),l[a1b('0x13')][a1b('0x45')]);c['set'](m,a1b('0x30'),l[a1b('0x13')]['memory']);});k=null;c[a1b('0x2f')](a1b('0x34'),a['company'],a['agent']);}});})[a1b('0x7')]();}