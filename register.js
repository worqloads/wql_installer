var prompt = require('prompt')
    , axios = require('axios')
    , crypto = require('crypto')
    , fs = require('fs')
    , os = require('os')
    , async = require('async')
    , invalid_mails = require('./mails.js')
    , child = require('child_process')
    , AWS = require('aws-sdk')

// TODO next version
// ----------------------------------------------------------------------------
// 
// checks for cloud access conf (AWS)
// save inputs for quickier retries (steps saved: accound registered, cloud provider api saved, cloud provider api validate)
// stronger inputs validation (ascii char)
// logs in file

// Configuration
// ----------------------------------------------------------------------------
// var myenv = process.env.NODE_ENV || 'production'
// Errors handling
const __DEBUG__ = process.env.WQL_DBG || false
const __ERROR_INTEGRITY = 1
const __ERROR_API = 2
const __ERROR_ACCOUNT = 3
const __ERROR_API_ACCOUNT = 4
// External integration
const login_url = 'https://app.worqloads.com/'
const support_email = 'support@worqloads.com'
const wql_gateway = 'https://app.worqloads.com'
const wql_cred = 'https://cred.worqloads.com'
const wql_user = 'credmngr'
const wql_pass = 'zHFJiNP2jTcpwvKVuyK9'
const conf_file = 'conf.json'
const agent = get_agent()
const version = process.argv[2]

// Prompt configuration
prompt.message = "WQL"
prompt.delimiter = " | "
const prompt_company_validation = {
    pattern: /^[a-zA-Z0-9\s\-]+$/,
    message: 'Value must be only letters, digits, spaces, or dashes',
}
const prompt_user_validation = {
    pattern: /^[a-zA-Z\s]+$/,
    message: 'Value must be only letters, spaces',
}
const prompt_email_validation = {
    pattern: /(?:[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*|"(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21\x23-\x5b\x5d-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])*")@(?:(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?|\[(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?|[a-z0-9-]*[a-z0-9]:(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21-\x5a\x53-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])+)\])/,
    message: 'Valid email must provided',
}

// Main
// ----------------------------------------------------------------------------

try {
    if (__DEBUG__) {
        console.log('D wql_gateway:' + wql_gateway)
        console.log('D wql_cred:' + wql_cred)
        console.log('D agent:' + agent)
    }

    // make sure the script has not been changed
    integrity_check()
    welcome_msg()
    prompt.start()
    // restore previous registration
    start( restore_existing_registration() )
} catch (e) {
    console.error('E exception raised:', e)
}

// Prompts function definition
// ----------------------------------------------------------------------------
function start( already_registered ) {
    async.waterfall([
        (waterfall_cb) => {
            // if (already_registered != null) {
            //     waterfall_cb(null, already_registered.data)
            // } else {
            //     get_inputs(waterfall_cb)
            // }
            get_inputs(waterfall_cb)
        },
        (result, waterfall_cb) => {
            confirm_inputs(result, waterfall_cb)
        },
    ], (err, res) => {
        if (err) {
            console.error('An error occured:', err, '.\nPlease retry.')
            start()
        } else {
            process_inputs(res)
        }
    })
}

function get_inputs(cb) {
    prompt.get([
        Object.assign({
            name: 'company_name',
            description: 'Company name',
            required: true
        }, prompt_company_validation),
        Object.assign({
            name: 'entity_name',
            description: 'Entity name (sub organization within the company)',
            required: true
        }, prompt_company_validation),
        Object.assign({
            name: 'firstname',
            description: 'Admin user first name',
            required: true
        }, prompt_user_validation),
        Object.assign({
            name: 'lastname',
            description: 'Admin user last name',
            required: true
        }, prompt_user_validation),
        Object.assign({
            name: 'email',
            description: 'Admin user corporate email (identifier)',
            required: true,
            conform: function (value) {
                const corporate_name = value.split('@')[1]
                return (invalid_mails.indexOf(corporate_name) < 0)
            }
        }, prompt_email_validation),
        {
            name: 'password',
            description: 'Admin user (complex) password',
            hidden: true,
            message: 'Password must contains at least:\n - 1 lowercase,\n - 1 uppercase alphabetical character,\n - 1 numeric character,\n - 1 special character among: \-@#\$%\^&\*\_ ',
            required: true,
            // todo 
            conform: function (value) {
                const strongRegex = new RegExp("^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!-@#\$%\^&\*\_])(?=.{8,})");
                return strongRegex.test(value)
            }
        },
        {
            name: 'aws_api_key',
            description: 'AWS API key',
            required: true,
            conform: function(value) {
                return (new RegExp("[A-Z0-9]{20,}")).test(value)
            }
        },
        {
            name: 'aws_api_secret',
            description: 'AWS API secret',
            required: true,
            conform: function(value) {
                return (new RegExp("[A-Za-z0-9/+=]{40,}")).test(value)
            }
        }
    ], cb)
}

function confirm_inputs(result, cb) {
    // Confirm the inputs
    console.log('Please confirm  the information provided:')
    Object.keys(result).filter(x => x != 'password').forEach(prop => {
        console.log('  > ' + prop + ': ', result[prop])
    })
    prompt.get({
        name: 'yesno',
        message: 'Is the information correct? (yes or no)',
        validator: /yes|no/,
        warning: 'Answer by \'yes\' or \'no\'',
        default: 'no'
    }, function (err, yesno_res) {
        if (err || yesno_res.yesno != 'yes') {
            cb('Restart and correct your(s) error(s)')
        } else {
            console.log('')
            console.log('Please wait for processing...')
            console.log('')
            cb(null, result)
        }
    })
}

function process_inputs(user_inputs) {

    async.waterfall([
        // send inputs for creation. and get company_id
        function (waterfall_cb) {
            if (__DEBUG__) console.log('D send_inputs with:', user_inputs)
            send_inputs(user_inputs, waterfall_cb)
        },
        // get UUID and passwords
        function (company_id, waterfall_cb) {
            if (__DEBUG__) console.log('D get_cred:', company_id)
            get_cred(company_id, waterfall_cb)
        },
        // create local conf in with company_id
        // data: { company:, uuid:, gateway_user:, gateway_pass:, .dbkey: }
        function (data, waterfall_cb) {
            if (__DEBUG__) console.log('D create_local_conf:', data)
            create_local_conf(data, waterfall_cb)
        },
        // valid uuid and update company with uuid
        function (result, waterfall_cb) {
            if (__DEBUG__) console.log('D valid_cred:', result)
            valid_cred(result, waterfall_cb)
        },
        function (entity_id, waterfall_cb) {
            valid_api(entity_id, user_inputs, waterfall_cb)
        }
    ], (err) => {
        if (err) registration_failed(err)
        else registration_completed()

        // if (res.account) registration_failed(res.account)
        // if (res.api) api_failed(res.api)
        // if (res.account && res.api) process.exit(__ERROR_API_ACCOUNT)
        // if (res.account) process.exit(__ERROR_ACCOUNT)
        // if (res.api) process.exit(__ERROR_API)
        // process.exit(0)

    })

}

// Processing functions
// ----------------------------------------------------------------------------

// inputs are sent for processing, once completed:
// company and user must be created at DB level, 
// accesses must be setup at exposed components
function send_inputs(data, callback) {
    axios.post(
        wql_gateway + '/registration/new_company',
        data,
        {
            timeout: 60000 // 1min
        })
        .then(function (response) {
            if (__DEBUG__) console.log('D send_inputs response.data:', response.data)
            callback(null, response.data.company_id)
        })
        .catch(function (error) {
            if (error) callback(error)
        })
}

// data = { "uuid":"c47c1274-da2b-4268-924c-7b4580ceb8ff","gateway":{"user":"e465b8493e","pass":"6c6e5fcbc8"},"rdsdb":"ad15537b059a96defca7","__v":0}
function create_local_conf(data, callback) {

    function _close_spawn_process(p, name, cb) {
        var stderr = ''
        var stdout = ''
        p.stderr.on('data', (data) => {
            stderr += data
        })
        p.stdout.on('data', (data) => {
            stdout += data
        })
        p.on('close', (code) => {
            if (__DEBUG__) console.log('D stdout of '+name+':', stdout)
            if (code > 0) {
                console.error(`process ${name} . stderr: ${stderr}`)
                console.log(`process ${name} . code exit ${code}`)
                cb(stderr)
            } else {
                cb()
            }
        })
    }

    function _spawn(cmd, params, cb) {
        var process = child.spawn(cmd, params);
        _close_spawn_process(process, cmd + ' ' + params.join(' '), cb)
        return process
    }

    try {

        fs.writeFileSync(__dirname + '/' + conf_file, '{ "production": { "gateway": { "protocole" : "https", "credentials" : "__gateway_cred__", "host" : "app.worqloads.com", "port" : "443" }, "db": { "host": "app.worqloads.com", "port": 3333, "auth": "__db_key__", "db": 0, "options": { } }, "nb_workers": 10, "version": "__version__", "company": "__company__" } }', { encoding: 'utf8', flag: 'w' })

        async.series([
            function (series_cb) {
                _spawn('sed', ['-i', 's/__gateway_cred__/' + data.gateway_user + '@' + data.gateway_pass + '/', __dirname + '/' + conf_file], (err) => {
                    if (err) {
                        console.error('Error updating file:' + conf_file, err)
                    }
                    series_cb(err)
                })
            },
            function (series_cb) {
                _spawn('sed', ['-i', 's/__db_key__/' + data.dbkey + '/', __dirname + '/' + conf_file], (err) => {
                    if (err) {
                        console.error('Error updating file:' + conf_file, err)
                    }
                    series_cb(err)
                })
            },
            function (series_cb) {
                _spawn('sed', ['-i', 's/__company__/' + data.company + '/', __dirname + '/' + conf_file], (err) => {
                    if (err) {
                        console.error('Error updating file:' + conf_file, err)
                    }
                    series_cb(err)
                })
            },
            function (series_cb) {
                _spawn('sed', ['-i', 's/__version__/' + version + '/', __dirname + '/' + conf_file], (err) => {
                    if (err) {
                        console.error('Error updating file:' + conf_file, err)
                    }
                    series_cb(err)
                })
            }
        ], function (err) {
            callback(err, Object.assign(data, { ok: !err }))
        })
    } catch (err) {
        console.error('E error creating conf file:', err)
        throw callback(err)
    }
}

function get_cred(company_id, callback) {
    axios
        .post(wql_cred + '/gen', {}, {
            auth: {
                username: wql_user,
                password: wql_pass
            },
            timeout: 30000 // 30sec
        })
        .then(function (response) {
            if (response && response.data) {
                if (__DEBUG__) console.log('D get_cred response:', response.data)
                callback(null, Object.assign(response.data, { company: company_id }))
            } else {
                callback('No credentials')
            }
        })
        .catch(function (error) {
            if (error) {
                if (__DEBUG__) console.log('E get_cred error:', error)
                callback(error)
            }
        })
}

function valid_cred(result, callback) {
    if (result.ok) {
        async.parallel({
            cred: function(parallel_cb) {
                axios
                    .post(
                        wql_cred + '/validate',
                        { uuid: result.uuid },
                        {
                            auth: {
                                username: wql_user,
                                password: wql_pass
                            },
                            timeout: 30000, // 30sec,
                        }
                    )
                    .then(function (res) {
                        if (__DEBUG__) console.log('E cred validate ok:', res)
                        parallel_cb()
                    })
                    .catch(function (error) {
                        if (error) console.error('E valid_cred cred error:', error)
                        parallel_cb()
                    })
            },
            company: function(parallel_cb) {
                axios
                    .post(wql_gateway + '/registration/confirm_company', result,
                        // data: { uuid: result.uuid, company: result.company }
                        {
                            timeout: 30000, // 30sec,
                        })
                    .then(function (data) {
                        parallel_cb(null, data)
                    })
                    .catch(function (error) {
                        if (error) console.error('E valid_cred cred company:', error)
                        parallel_cb()
                    })
            }
        }, (err, res) => callback(err, res && res.company && res.company.data && res.company.data.data._id))
    } else {
        callback('error')
    }
}

function valid_api(entity_id, user_inputs, callback) {
    // save keys in file ~/.aws/credentials
    const aws_dir = os.homedir()+'/.aws'
    if (!fs.existsSync(aws_dir)){
        fs.mkdirSync(aws_dir)
    }
    fs.writeFileSync(aws_dir + '/credentials', credentials_content(user_inputs.aws_api_key, user_inputs.aws_api_secret), { encoding: 'utf8', flag: 'w' })

    // check against AWS
    const ec2_cli = new AWS.EC2({apiVersion: '2016-11-15', region: agent.region})

    async.waterfall([
        // load credentials
        function(waterfall_cb2) {
            AWS.config.getCredentials(function(err) {
                if (err) {
                    console.log(err.stack)
                    waterfall_cb2(err.stack)
                // credentials not loaded
                } else {
                    console.log("Access key:", AWS.config.credentials.accessKeyId)
                    console.log("Secret access key:", AWS.config.credentials.secretAccessKey)
                    waterfall_cb2()
                }
            })
        },
        // validate credentials
        function(waterfall_cb2) {
            // https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/EC2.html#describeInstanceStatus-property
            ec2_cli.describeInstanceStatus({ InstanceIds: [ agent.instanceid ]}, waterfall_cb2)                    
        },
        // update cloud provider cred in DB
        function (res, waterfall_cb2) {
            axios.post(
                wql_gateway + '/registration/confirm_cpcred',
                { entity: entity_id },
                {
                    timeout: 60000 // 1min
                })
                .then(function (response) {
                    if (__DEBUG__) console.log('D valid_api response.data:', response.data)
                    waterfall_cb2()
                })
                .catch(function (error) {
                    if (error) waterfall_cb2(error)
                })              
        },
        // add cloud agent and rel
        function (res, waterfall_cb2) {
            axios.post(
                wql_gateway + '/registration/confirm_cpagent', { 
                    entity: entity_id,
                    agent: agent
                },
                {
                    timeout: 60000 // 1min
                })
                .then(function (response) {
                    if (__DEBUG__) console.log('D valid_api response.data:', response.data)
                    waterfall_cb2()
                })
                .catch(function (error) {
                    if (error) waterfall_cb2(error)
                })
        }
    ], function(err) {
        if (err) {
            console.error('E valid_api error:', err)
            callback(err)
        }
    })
}

function get_agent(){
    return { 
        'instanceid': fs.readFileSync('./.aws_instanceid').toString(),
        'instancetype': fs.readFileSync('./.aws_instancetype').toString(),
        'hostname': fs.readFileSync('./.aws_hostname').toString(),
        'ip_internal': fs.readFileSync('./.aws_ip').toString(),
        'region': fs.readFileSync('./.aws_region').toString()
    }
}

function credentials_content(aws_api_key, aws_api_secret) {
    return '[default]\naws_access_key_id = '+aws_api_key+'\naws_secret_access_key = '+aws_api_secret+'\n'
}

// Helpers
// ----------------------------------------------------------------------------
function welcome_msg() {
    console.log('')
    console.log('')
    console.log('////////////////////////////////////////////////////////////////////////////////')
    console.log("                                     |                              |         ")
    console.log(" . . .    ,---.    ,---.    ,---.    |        ,---.    ,---.    ,---|    ,---.")
    console.log(" | | |    |   |    |        |   |    |        |   |    ,---|    |   |    `---.")
    console.log(" `-'-'    `---'    `        `---|    `---'    `---'    `---^    `---'    `---'")
    console.log("                                |                                            ")
    console.log('////////////////////////////////////////////////////////////////////////////////')
    console.log('')
    console.log('')
    console.log('Please fill out this questionary to register an enterprise account at')
    console.log('https://app.worqloads.com')
    console.log('')
    console.log('Before starting, make sure you have created AWS Access Keys for API access.')
    console.log('')
    console.log('                                                            Press Ctrl+D to quit')
    console.log('--------------------------------------------------------------------------------')
}

function registration_completed() {
    console.log('')
    console.log('Thank you. The registration is now completed. You can now logon at :')
    console.log(login_url)
    console.log('')
    process.exit(0)
}

function registration_failed(err) {
    console.log('')
    console.log('Thank you for registering. Unfortunately an error occured during the process.')
    console.log('Contact us at ' + support_email + ' to assist you in this process.')
    console.log('')
    console.log('Please share the error below for quicker resolution:')
    console.log('')
    // console.log(' - Error:' , Object.keys(err).join(' !! '))
    if (err.response) {
        console.log(' - Status code:' + err.response.status + ' ' + err.response.statusText)
        console.log(' - Error :' + err.response.data)
    } else {
        console.log(' - Error :', err)
    }
    console.log('')
    console.log('')
}

function api_failed(err) {
    console.log('')
    console.log('Thank you for providing the AWS key/secret pair but unfortunately they cannot be validated.')
    console.log('')
    console.log('Please check and provide a corrected information with required authorizations.')
    console.log('')
    console.log(' - Error :', err)
    console.log('')
    console.log('')
}

// make sure the min script has not been modified. 
function integrity_check() {
    const a = crypto.createHash('md5').update(fs.readFileSync('./register_min.js')).digest("hex")
    const b = fs.readFileSync('./.check.conf').toString().replace(/\s/gm, '')
    if (a != b) {
        console.error('')
        console.error('This registration script has been corrupted.')
        console.error('Please re-download it from Worqloads.')
        console.error('')
        process.exit(__ERROR_INTEGRITY)
    }
    if (process.argv.length < 3 || !/^v[0-9]+.[0-9]+.[0-9]+$/.test(process.argv[2])) {
        console.error('')
        console.error('Missing version argument.')
        console.error('')
    }
}

// todo
function restore_existing_registration() {
    return null
}