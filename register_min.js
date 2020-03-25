"use strict";function e(e){return e&&"object"==typeof e&&"default"in e?e.default:e}var a=e(require("prompt")),r=e(require("axios")),c=e(require("redis")),o=e(require("crypto")),n=e(require("fs")),d=e(require("os")),t=e(require("async")),s=e(require("aws-sdk")),i={APPEND:"r32efa73bcdf4efd261c9",ASKING:"r53eebe4bcfc8e4e11765",AUTH:"r59166c85971605a74b9e",BGREWRITEAOF:"r977f34a23a4c7dafd711",BGSAVE:"r8fbddd3ad25e66b66d75",BITCOUNT:"rf831452f1b8c742fead0",BITFIELD:"re8eece2435bbe0e78f2b",BITOP:"rc70c916b6592c27704df",BITPOS:"rddf7c86738135cc9feba",BLPOP:"r8a385ea327ece206db01",BRPOP:"r8bc260d6056d562c74a7",BRPOPLPUSH:"r4cedfdedff04f42371a3",BZPOPMAX:"r6c05150afc9c97508dea",BZPOPMIN:"raceb1f507d73610d4985",CLIENT:"re2a09ccb04375117069c",CLUSTER:"rfc57ce1d5fc7792fcebe",COMMAND:"raa9c88633a52a77fde21",CONFIG:"r690921766564cc95c40e",DBSIZE:"rcbeb52e1c23cbce73346",DEBUG:"r792c05a3f02afc263c5a",DECR:"r5d395572d2daf94d0ee2",DECRBY:"rdae4b6632805cde75d91",DEL:"r332cd69dadab050c7e03",DISCARD:"re59cb5e280e1e0b44c4a",DUMP:"rd1e8793e1e910c6d0f9c",ECHO:"r5fa62eac76fca09570cb",EVAL:"r6cd6ed29c886ed30605c",EVALSHA:"r590bf147ef64eeafadb3",EXEC:"r50e64b10cdf172df702f",EXISTS:"r190450cc6f31a91a63d9",EXPIRE:"r361b458eef37bcfd1026",EXPIREAT:"r9d9e6e7398c8824e81b3",FLUSHALL:"r2b778d94531380c958ef",FLUSHDB:"r7ac5719dddcd6cfe5f47",GEOADD:"rb05c9f7bc67b56220cd1",GEODIST:"r03fc230a0569c81dd3b9",GEOHASH:"r5f50370755f8497cd69c",GEOPOS:"rb4ef150604770a802c7d",GEORADIUS:"rb6e830dd1ea871ad8899",GEORADIUS_RO:"r81ab714c7e51fc02a633",GEORADIUSBYMEMBER:"r9bae614fb830de88a71d",GEORADIUSBYMEMBER_RO:"r657cbd37fc1f0469a93f",GET:"r99d13cf3716dbb9bec98",GETBIT:"r3da7e567487bbe4f3fa4",GETRANGE:"r82088db4b59f4aaea8b5",GETSET:"r35ec33085df5762700a0",HDEL:"rb038a9a2c15d45bbcb04",HEXISTS:"re920bcf404cb8d2e36f2",HGET:"rbcf42cf954a8b1ab485b",HGETALL:"rffadbacb14fad0388ee5",HINCRBY:"r327ab1a623b81f16bb28",HINCRBYFLOAT:"r7cefea74fb6a6b3ba2fe",HKEYS:"r53b4eb6eeef131884a85",HLEN:"r44515715af21b234f6e9",HMGET:"r82c436ecec51222acaee",HMSET:"r6271d85d7ea5c2016537","HOST:":"r1fcaba9bdf50c7f3ffae",HSCAN:"r27823c02ac78c807f5de",HSET:"raf8f5c1c0382364207d5",HSETNX:"rcf1d727056f77b00d328",HSTRLEN:"r9870d5e052ce6f50f908",HVALS:"re9c03ba5a6cf356f87c9",INCR:"rdbf17cc155ced91fa2c0",INCRBY:"rd81305f10db800bfa71f",INCRBYFLOAT:"rf0fe0a692443ce6dcc3d",INFO:"r6a775f58d6096e8f3fee",KEYS:"r7c58fc41ca7901f7d01e",LASTSAVE:"r8b0e6f19ee35972b7bac",LATENCY:"r42cda9d2b8d1e2ca5c5b",LINDEX:"r265a148ef5bd3d04ca07",LINSERT:"rc435f687bffdc6d17d11",LLEN:"r9c3618e5fb721740773c",LOLWUT:"r90958e8cf18c41945d6b",LPOP:"rc5429e6293709c0143b6",LPUSH:"r4162b7460866dd16e593",LPUSHX:"r92cae2d1732a92c30110",LRANGE:"r734f34a9c8d198a1765c",LREM:"rbb0a9b910059520d314a",LSET:"r55bee04c50e70d63d98d",LTRIM:"ra636956dad6e6dd5e5c9",MEMORY:"r83341d366fbbd3dd725e",MGET:"r963139d81e76a1db74a4",MIGRATE:"r0818532768d5ac4c862b",MODULE:"re7c8da36761c7429a194",MONITOR:"rd8d5b640eea865041c93",MOVE:"r5130ec262e8001c71b63",MSET:"r37e0b9632995c39bb6dd",MSETNX:"rb7a007dae35fc36db7f0",MULTI:"r0ea46cead6ed2044d5e6",OBJECT:"r1de45da792a8697130be",PERSIST:"ra08cadce511ff197b26d",PEXPIRE:"rfb5df2a2440192201d3f",PEXPIREAT:"r57a0a2089cded3b4fff7",PFADD:"rbfe1f1651b51d67bc74b",PFCOUNT:"rd0074482b0529cb32e0f",PFDEBUG:"rce36a026a223ead06904",PFMERGE:"r2939bbb672a85e65a35a",PFSELFTEST:"r8f375412da87e131abcb",PING:"r8e880d60fadc492c52d0",POST:"rce0128b3a37d805eed4a",PSETEX:"rd0b5a0532e73176b6ec2",PSUBSCRIBE:"ra3febaf705f0b3e94b08",PSYNC:"r709dfa29ed094128337b",PTTL:"r82f51da34fd4e64cd7d2",PUBLISH:"r652fea692b19d3b13951",PUBSUB:"r3e122758d5252afdf301",PUNSUBSCRIBE:"rc1636d9b64ba1c7d299a",RANDOMKEY:"r12a38cb3bcb8143e656b",READONLY:"r22cc19f9bd86c420755c",READWRITE:"rce322cd74d5847a2a37f",RENAME:"r9066a7800a292a1904c6",RENAMENX:"r2dcb924dc3c52eaf4326",REPLCONF:"rfbbd3f86069568d629ad",REPLICAOF:"re43358b5f71bf7b9b33a",RESTORE:"r5c35935afbc4ecb59f54","RESTORE-ASKING":"r0491b9fc7fc0c1ed612a",ROLE:"r59f9520cfd70ae9f2dac",RPOP:"rbbdd4ae591afa6c96866",RPOPLPUSH:"r63a325a6fc9cd7455ee7",RPUSH:"r4b45792fb7e0ea8585f8",RPUSHX:"r5507a87adb9a843814b8",SADD:"r91342b9fa4eab746dc3c",SAVE:"ra1be4ede3f473d907098",SCAN:"r569298b21c9637769832",SCARD:"r4c77e11f61d1fde79248",SCRIPT:"rce153ab447ff78bb63bd",SDIFF:"r0c3af3d708a2987a660b",SDIFFSTORE:"r5192532048d831a95037",SELECT:"r1a2fb16f5a163921d090",SET:"r1474d7fbb9a7324bfe8b",SETBIT:"rbbee446c0ca0e678607a",SETEX:"r46e57e1c52332b5a5a99",SETNX:"r0f6b51f5c3e0dc6a5333",SETRANGE:"rab56e993495f87e82568",SHUTDOWN:"rd28064b1b6a02e83d69f",SINTER:"r040dab23af4510e7149f",SINTERSTORE:"r345da673d33003cbcd34",SISMEMBER:"re9edaf9af49dedd76dc0",SLAVEOF:"r72fd174d37c08265e5c1",SLOWLOG:"r437d51923772d10e4f97",SMEMBERS:"r1edcd9984a6482302f84",SMOVE:"rb012f694f06baded5843",SORT:"rd52fed8963807907af5b",SPOP:"r7296cee0472b5c42a056",SRANDMEMBER:"r4834b22bf2e167eec413",SREM:"r45b2cebbd4d7206037ff",SSCAN:"r0337b93f18e636174af5",STRLEN:"r3731b868ab6a189fad20",SUBSCRIBE:"re1cbdcb73780e3bdfb36",SUBSTR:"r210d71a176f50c7d0d0d",SUNION:"r7d72640cccaa75eaf713",SUNIONSTORE:"r7cb8a66e6f7d1a2d81dc",SWAPDB:"r8115b24806a99207caa4",SYNC:"r28ac155def5413926a04",TIME:"r4a905c628adb036f5ebc",TOUCH:"r436d44a1adf050f0b97e",TTL:"r083b2fc6cba07dbf4688",TYPE:"rbceb4ef80d4607215929",UNLINK:"r4c95fa093bc7d290fced",UNSUBSCRIBE:"r421bbad7bcce86124109",UNWATCH:"r27ba8feb2c4c546a4152",WAIT:"rf80e88ba805e079b3e78",WATCH:"r84e26868c42700105908",XACK:"r03ee55b42ebdc2c18a81",XADD:"r23bee686be5fda753179",XCLAIM:"r77e4c1a01c6c040cd3ca",XDEL:"r50623b529d52cc31023e",XGROUP:"r4fb8652508296ac45931",XINFO:"r5edea82e53e6ce3cb66d",XLEN:"r841df2001c1ae836aaaa",XPENDING:"r529f3a179b1611ff66ca",XRANGE:"re231794108ea049c510b",XREAD:"rac4f2bb8c900b7a4588b",XREADGROUP:"rd2da0178505f01ac6a56",XREVRANGE:"r6bb54153c3cd0e34ef79",XSETID:"rf041428ca117772f3c65",XTRIM:"ra63c6d1f016107b0abcf",ZADD:"rb5336953a9773c4fdc85",ZCARD:"rd4fcf8328ecbd58596b0",ZCOUNT:"rf9db5f6d644bd379ea77",ZINCRBY:"r763956de8cf90a3cf1a8",ZINTERSTORE:"r9f9daf2c0f512192f12e",ZLEXCOUNT:"r335ac0fada359dc2a168",ZPOPMAX:"ref0b5cdf20e3d8e2c56f",ZPOPMIN:"r4ff46d82c7ee5abddf08",ZRANGE:"r3dd3add7a10f8e1a3fd5",ZRANGEBYLEX:"r66c704c25f2db6ac805c",ZRANGEBYSCORE:"r85011b7d9cfd9bfc465c",ZRANK:"r2443efd44b6a1ed32cea",ZREM:"raa23ccab68c12c7d94ed",ZREMRANGEBYLEX:"r23d9446a001853d37fc1",ZREMRANGEBYRANK:"r9092c8b2288a642d30a8",ZREMRANGEBYSCORE:"r991f6fd4cdd5c01d11ee",ZREVRANGE:"r46a607ebca2880de70b9",ZREVRANGEBYLEX:"rfc2f355901f83dbc6f32",ZREVRANGEBYSCORE:"re3911909956e43ffcbb7",ZREVRANK:"r10377ca91782901d471c",ZSCAN:"rcd25f69d8b71238c4f89",ZSCORE:"r07b493479fe344b5cf11",ZUNIONSTORE:"r3582a8e329efcb4b3c35"};const f=process.env.WQL_DBG||!1,[l,b,u,g,E]=[1,2,3,4,5],p="https://scaling.worqloads.com";var m=null,S={},R="",y="",_=[],A=!0;const T={instanceid:n.readFileSync("./.aws_instanceid").toString(),instancetype:n.readFileSync("./.aws_instancetype").toString(),hostname:n.readFileSync("./.aws_hostname").toString(),ip_internal:n.readFileSync("./.aws_ip").toString(),region:n.readFileSync("./.aws_region").toString()};a.message="WQL",a.delimiter=" | ";const O={pattern:/^[a-zA-ZÀ-ú0-9_\-\']+$/,message:"Value must be only letters, digits, simple quote, underscores, and dashes"},I={pattern:/(?:[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*|"(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21\x23-\x5b\x5d-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])*")@(?:(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?|\[(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?|[a-z0-9-]*[a-z0-9]:(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21-\x5a\x53-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])+)\])/,message:"Valid email must provided"},N={pattern:/^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!-@#\$%\^&\*\_])(?=.{8,})/,message:"Password must contains at least:\n - 1 lowercase,\n - 1 uppercase alphabetical character,\n - 1 numeric character,\n - 1 special character among: -@#$%^&*_ "};try{f&&(console.log("D wql_gateway:"+p),console.log("D agent:",T)),function(){const e=o.createHash("md5").update(n.readFileSync("./register_min.js")).digest("hex"),a=n.readFileSync("./.check.conf").toString().replace(/\s/gm,"");e!=a&&(console.error(""),console.error("This registration script has been corrupted."),console.error("Please re-download it from Worqloads."),console.error(""),process.exit(l))}(),process.argv.length<4||!/^v\d+\.\d+\.\d+$/.test(process.argv[2])||["dev","test","beta","production"].indexOf(process.argv[3])<0?(console.error(""),console.error("Internal error: invalid parameters provided."),console.error(""),process.exit(b)):(R=process.argv[2],y=process.argv[3]),console.log(""),console.log(""),console.log("////////////////////////////////////////////////////////////////////////////////"),console.log("                                     |                              |         "),console.log(" . . .    ,---.    ,---.    ,---.    |        ,---.    ,---.    ,---|    ,---."),console.log(" | | |    |   |    |        |   |    |        |   |    ,---|    |   |    `---."),console.log(" `-'-'    `---'    `        `---|    `---'    `---'    `---^    `---'    `---'"),console.log("                                |                                            "),console.log("////////////////////////////////////////////////////////////////////////////////"),console.log(""),console.log(""),console.log("Please provide your Company & User account information to register a new "),console.log("agent for https://scaling.worqloads.com."),console.log(""),console.log("If you have not yet registered, go to Worqloads Smartscaler product page at "),console.log("Amazon Marketplace: http://aws.amazon.com/marketplace/pp/B085Y2CMQQ "),console.log(""),console.log("Before starting, make sure you have created AWS Access Keys for API access."),console.log("In case of difficulties to complete your installation, please reach out to:"),console.log("support.scaling@worqloads.com"),console.log(""),console.log("                                                         >> Press Ctrl+D to quit"),console.log("--------------------------------------------------------------------------------"),a.start(),function e(){t.waterfall([e=>{var r;r=e,a.get([Object.assign({name:"company_id",description:"AWS Customer Identifier",required:!0},O),Object.assign({name:"entity_name",description:"Entity name (sub organization within the company)",required:!0},O),Object.assign({name:"email",description:"Admin user corporate email (identifier)",required:!0},I),Object.assign({name:"password",description:"Admin user (complex) password",hidden:!0,required:!0},N),{name:"aws_api_key",description:"AWS API key",required:!0,conform:function(e){return new RegExp("[A-Z0-9]{20,}").test(e)}},{name:"aws_api_secret",description:"AWS API secret",required:!0,conform:function(e){return new RegExp("[A-Za-z0-9/+=]{40,}").test(e)}}],r)},(e,r)=>{!function(e,r){console.log("Please confirm  the information provided:"),Object.keys(e).filter(e=>"password"!=e).forEach(a=>{console.log("  > "+a+": ",e[a])}),a.get({name:"yesno",message:"Is the information correct? (yes or no)",validator:/yes|no/,warning:"Answer by 'yes' or 'no'",default:"no"},(function(a,c){a||"yes"!=c.yesno?r("Restart and correct your(s) error(s)"):(console.log(""),console.log("Please wait for processing..."),console.log(""),r(null,e))}))}(e,r)}],(a,l)=>{var b;a?(console.error("An error occured:",a,".\nPlease retry."),e()):(b=l,P(()=>A,"."),t.waterfall([function(e){var a,c;f&&console.log("D get_company_info:",{aws_customer_id:b.company_id,admin_email:b.email,admin_entity:b.entity_name}),a={aws_customer_id:b.company_id,admin_email:b.email,admin_pwd:b.password,admin_entity:b.entity_name.trim().toLowerCase()},c=e,r.post(p+"/registration/aws_to_company",a,{timeout:6e4}).then((function(e){f&&console.log("D get_company_info res:",e&&e.data),e.error?(f&&console.error("get_company_info:",e.error),_.push("100. "+e.error),c(2)):c(null,e.data)})).catch((function(e){e&&(f&&console.error("get_company_info:",e),_.push("100. "+e),c(2))}))},function(e,a){if(e&&e.error)f&&console.log("D gen conf+cred:",e.error),_.push("010. "+e.error),a(2);else{const r=D(10),n=D(10),d=o.randomBytes(16),t=e.obj_id.substring(0,40);S.CompanyGlobal=e.company_id,S.Credentials=e.company_uuid;const s=i;(m=c.createClient({host:"scaling.worqloads.com",port:3333,password:t,db:3,options:{rename_commands:s}})).on("error",(function(e){console.error("Oops client error:"+e.code+" - "+e.command+" - "+e.origin)})),a(null,{conf:{gateway_user:r,gateway_pass:r,dbkey:C(t,e.company_id+r+n,d),company_id:e.company_id},more:{company_uuid:e.company_uuid,entity_id:e.entity_id,redis_auth:t}})}},function(e,a){t.parallel({local:a=>{f&&console.log("D create_local_conf:",e.conf),function(e){try{n.writeFileSync(__dirname+"/conf.json",'{ "production": { "gateway": { "protocole" : "https", "credentials" : "'+e.gateway_user+":"+e.gateway_pass+'", "host" : "scaling.worqloads.com", "port" : "443" }, "db": { "host": "scaling.worqloads.com", "port": 3333, "key": "'+e.dbkey+'"}, "nb_workers": 10,  "version": "'+R+'", "staging": "'+y+'", "company": "'+e.company+'" } }',{encoding:"utf8",flag:"w"})}catch(e){e&&(console.error("E error creating conf file:",e),_.push("300. "+e))}}(e.conf),a()},remote:a=>{f&&console.log("D send_conf:",e.conf),h({company_id:e.conf.company_id,payload:{cmd:["add_nginx","sync_receiver","add_credmngr"],uuid:e.more.company_uuid,user:e.conf.gateway_user,pass:e.conf.gateway_pass}}),a()}},()=>{a(null,e)})},function(e,a){!function(e,a,c){const o=e.more.entity_id,i=d.homedir()+"/.aws";var l,b;n.existsSync(i)||n.mkdirSync(i),n.writeFileSync(i+"/credentials",(l=a.aws_api_key,b=a.aws_api_secret,"[default]\naws_access_key_id = "+l+"\naws_secret_access_key = "+b+"\n"),{encoding:"utf8",flag:"w"});const u=new s.EC2({apiVersion:"2016-11-15",region:T.region});t.waterfall([function(e){s.config.getCredentials((function(a){a?(f&&console.error(a.stack),e(a.stack),_.push("400. AWS credentials not verified")):(f&&console.log("D valid_api getCredentials OK"),e())}))},function(e){f&&console.log("D valid_api describeInstanceStatus call:"+T.instanceid),console.log("... checking your AWS instance "+T.instanceid),t.parallel([e=>{u.describeInstanceStatus({InstanceIds:[T.instanceid],DryRun:!0,IncludeAllInstances:!0},(a,r)=>{console.log(" describeInstanceStatus executed:",a,r),console.log(" describeInstanceStatus stack:",a.stack),e("describeInstanceStatus","DryRunOperation"!=a.code&&"Request would have succeeded, but DryRun flag is set."!=a.message&&"Missing AWS authorizations")})},e=>{setTimeout(()=>{e("timeout","Timeout checking your AWS instance")},6e4)}],(a,r)=>{f&&console.log(a+" stopped first"),e(r)})},function(e){r.post(p+"/registration/confirm_cpcred",{entity:o},{timeout:6e4}).then((function(a){f&&console.log("D valid_api response.data confirm_cpcred:",a.data),a.data&&a.data.error?(_.push("500. AWS credentials confirmation failed "+a.data.error.errmsg),e(a.data.error&&a.data.error.errmsg)):e()})).catch((function(a){a&&(f&&console.log("D valid_api response.data confirm_cpcred exception:",a),e(a),_.push("500. AWS credentials confirmation failed"))}))},function(e){r.post(p+"/registration/confirm_cpagent",{entity:o,agent:T},{timeout:6e4}).then((function(a){f&&console.log("D valid_api response.data confirm_cpagent:",a.data),a.data&&a.data.error?(_.push("600. Agent registration failed "+a.data.error.errmsg),e(a.data.error&&a.data.error.errmsg)):e()})).catch((function(a){a&&(_.push("600. Agent registration failed"),e(a))}))}],(function(a){try{a?(console.error("E valid_api error:",a.response?a.response.status+":"+a.response.statusText:a),c(1)):(f&&console.log("D valid_api OK",a),h({company_id:e.conf.company_id,payload:{cmd:["start_scheduler"]}}),c())}catch(e){console.log("catched!")}}))}(e,b,a)}],e=>{if(null!=e)try{1==e?(A=!1,a=w,c=!0,A=!1,P(()=>c,"<"),t.parallel([e=>{const a=d.homedir()+"/.aws";n.unlink(a+"/credentials",(function(a){a&&f&&console.error("unlink creds:",a),e()}))},e=>{S.CompanyGlobal?(r.post(p+"/registration/rollback",{company_id:S.CompanyGlobal,uuid:S.Credentials},{timeout:6e4}).then((function(e){f&&console.log("D rollback response.data:",e.data)})).catch((function(e){e&&f&&console.error("registration/rollback:",e)})),e()):e()},e=>{h({company_id:S.CompanyGlobal,payload:{cmd:["remove_nginx"]}}),e()},e=>{n.unlink(__dirname+"/conf.json",(function(a){a&&f&&console.error("unlink conf:",a),e()}))}],()=>{c=!1,f&&console.log("Rollback completed"),a()})):w()}catch(e){f&&console.log(e),process.exit(1)}else A=!1,m&&m.quit(),console.log(""),console.log("Thank you. The registration is now completed. You can now logon at :"),console.log("https://scaling.worqloads.com/"),console.log(""),process.exit(0);var a,c}))})}()}catch(e){console.error("E exception raised:",e)}function h(e){m.set(e.company_id,JSON.stringify(e.payload),e=>{e&&(console.error("Oops client error:"+e),_.push("200. "+e))})}function P(e,a){e()&&setTimeout(()=>{process.stdout.write(a),P(e,a)},3e3)}function w(e){m&&m.quit(),console.log(""),console.log("Thank you for registering. Unfortunately an error occured during the process."),console.log("Contact us at support.scaling@worqloads.com to assist you in this process."),console.log(""),console.log("Please share the error below for quicker resolution:"),console.log(""),_.forEach(e=>{console.log(" - Error :"+e)}),console.log(""),console.log(""),process.exit(1)}function D(e){let a=Math.ceil(e/13);return new Array(a).fill((function(){return Math.random().toString(16).substring(2,15)})).reduce((e,a)=>e+a(),"").substring(0,e)}function C(e,a,r){let c=o.createCipheriv("aes-256-cbc",Buffer.from(a.substring(0,32)),r),n=c.update(e);return n=Buffer.concat([n,c.final()]),"d8"+n.toString("hex")+r.toString("hex")+o.randomBytes(7).toString("hex")}
