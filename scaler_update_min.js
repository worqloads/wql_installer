var a4a=['WQL_DEBUG','no\x20update:','code','E\x20missing\x20configuration\x20file:','message','Update\x20available\x20-\x20API\x20response:','default','/.update_new.sh','apply','axios','unref','error','>\x20API\x20call\x20res:','concat','stderr','I\x20Scaler\x20Update\x20!\x20About\x20to\x20exit\x20with\x20code\x20','data','then','log','close','^([^\x20]+(\x20+[^\x20]+)+)+[^\x20]}','Cannot\x20update\x20update.sh\x20script\x20from\x20new\x20version','0\x200\x202\x20*\x20*\x20*','env','/update.sh','NODE_ENV','\x20.\x20code\x20exit\x20','rename','join','exit','ignore','test','get\x20update\x20error:','post','process\x20','cron','child_process','agent','update','Exception\x20raised:','CronJob','detached','>\x20conf:','production','Oops\x20script\x20exec\x20error:','existsSync','parse'];(function(a,b){var c=function(g){while(--g){a['push'](a['shift']());}};var e=function(){var g={'data':{'key':'cookie','value':'timeout'},'setCookie':function(k,l,m,n){n=n||{};var o=l+'='+m;var p=0x0;for(var q=0x0,r=k['length'];q<r;q++){var s=k[q];o+=';\x20'+s;var t=k[s];k['push'](t);r=k['length'];if(t!==!![]){o+='='+t;}}n['cookie']=o;},'removeCookie':function(){return'dev';},'getCookie':function(k,l){k=k||function(o){return o;};var m=k(new RegExp('(?:^|;\x20)'+l['replace'](/([.$?*|{}()[]\/+^])/g,'$1')+'=([^;]*)'));var n=function(o,p){o(++p);};n(c,b);return m?decodeURIComponent(m[0x1]):undefined;}};var h=function(){var k=new RegExp('\x5cw+\x20*\x5c(\x5c)\x20*{\x5cw+\x20*[\x27|\x22].+[\x27|\x22];?\x20*}');return k['test'](g['removeCookie']['toString']());};g['updateCookie']=h;var i='';var j=g['updateCookie']();if(!j){g['setCookie'](['*'],'counter',0x1);}else if(j){i=g['getCookie'](null,'counter');}else{g['removeCookie']();}};e();}(a4a,0x1b7));var a4b=function(a,b){a=a-0x0;var c=a4a[a];return c;};'use strict';function _interopDefault(c){var d=function(){var g=!![];return function(h,i){var j=g?function(){if(i){var k=i[a4b('0x27')](h,arguments);i=null;return k;}}:function(){};g=![];return j;};}();var f=d(this,function(){var g=function(){var h=g['constructor']('return\x20/\x22\x20+\x20this\x20+\x20\x22/')()['compile'](a4b('0x4'));return!h[a4b('0xf')](f);};return g();});f();return c&&typeof c==='object'&&a4b('0x25')in c?c[a4b('0x25')]:c;}var fs=_interopDefault(require('fs'));var cron=_interopDefault(require(a4b('0x13')));var axios=_interopDefault(require(a4b('0x28')));var child_process=_interopDefault(require(a4b('0x14')));var config_file=__dirname+'/conf.json';try{if(!fs[a4b('0x1d')](config_file)){console['error'](a4b('0x22'),config_file);throw{'code':0x2};}else{var localconf=JSON[a4b('0x1e')](fs['readFileSync'](config_file));var myenv=process['env'][a4b('0x9')]||a4b('0x1b');scaler_update(localconf[myenv]);}}catch(a4c){console['error'](a4b('0x17'),a4c[a4b('0x21')]||a4c);process['exit'](0x1);}process['on'](a4b('0xd'),function(a){return console[a4b('0x2')](a4b('0x2e')+a);});function scaler_update(a){var b=a4b('0x6');var c='https://scaling.worqloads.com/updates';function d(h,i,j){var k='';h[a4b('0x2d')]['on'](a4b('0x0'),function(l){k+=l;});h['on'](a4b('0x3'),function(l){if(l>0x0){console[a4b('0x2a')]('process\x20'[a4b('0x2c')](i,'\x20.\x20stderr:\x20')[a4b('0x2c')](k));console['log'](a4b('0x12')[a4b('0x2c')](i,a4b('0xa'))[a4b('0x2c')](l));j(k);}else{j();}});}function f(h,i,j,k){var l=child_process['spawn'](h,i,j);if(j&&j[a4b('0x19')]){l[a4b('0x29')]();}else{d(l,h+'\x20'+i[a4b('0xc')]('\x20'),k);}return l;}function g(h,i,j){if(fs[a4b('0x1d')](i)){fs[a4b('0xb')](i,h,function(k){if(k){j(a4b('0x5'));}else{fs['chmod'](h,0x1c0,function(l){if(l){j('Cannot\x20set\x20execution\x20permission\x20for\x20new\x20update.sh\x20script');}else j();});}});}else j();}new cron[(a4b('0x18'))](b,function(){var h=process[a4b('0x7')][a4b('0x1f')]||![];if(h){console[a4b('0x2')](a4b('0x1a'),a);}axios[a4b('0x11')](c,{'agent':a[a4b('0x15')],'version':a['version']})[a4b('0x1')](function(i){if(h){console[a4b('0x2')](a4b('0x2b'),i&&i[a4b('0x0')]);}if(i&&i[a4b('0x0')]&&i[a4b('0x0')][a4b('0x16')]==!![]){console[a4b('0x2')](a4b('0x24'),i);g(__dirname+a4b('0x8'),__dirname+a4b('0x26'),function(j){if(j){console['error'](a4b('0x1c'),j);}else{f(__dirname+a4b('0x8'),['-v='+i['data'][a4b('0x23')],'-a='+a[a4b('0x15')]],{'detached':!![],'stdio':a4b('0xe')},function(k){if(k)console[a4b('0x2a')](a4b('0x1c'),k);});}});}else{console[a4b('0x2a')](a4b('0x20'),i&&i['data']&&i[a4b('0x0')][a4b('0x23')]);}})['catch'](function(i){if(i){console[a4b('0x2a')](a4b('0x10'),i);}});})['start']();}