var prompt = require('prompt')
    , axios = require('axios')
    , http = require('http')
    , https = require('https')
    , crypto = require('crypto')
    , fs = require('fs')
    , async = require('async')
    , wqlconf = require('./wqlconf.js')
    , invalid_mails = require('./mails.js')
    , child = require('child_process')

// TODO next version
// ----------------------------------------------------------------------------
// 
// save a copy of original script for restauration if corruption
// save inputs for quickier retries
// stronger inputs validation (ascii char)
// logs in file

// Configuration
// ----------------------------------------------------------------------------
var myenv = process.env.NODE_ENV || 'production'
const __DEBUG__ = process.env.WQL_DBG || false
const login_url = wqlconf[myenv].login_url
const support_email = wqlconf[myenv].support_email
const wql_gateway = 'https://' + wqlconf[myenv].wql_host
const wql_cred = 'https://' + wqlconf[myenv].cred_host
const conf_file = 'conf.json'

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
    }

    // make sure the invalid email list is not changed
    // integrity_check()
    welcome_msg()
    // prompt.start()
    start()
} catch (e) {
    console.error('E exception raised:', e)
}


// Prompts function definition
// ----------------------------------------------------------------------------
function start() {
    async.waterfall([
        (waterfall_cb) => {
            // get_inputs(waterfall_cb)
            let radom13chars = function () {
                return Math.random().toString(16).substring(2, 15)
            }
            waterfall_cb({
                'company_name': radom13chars(),
                'entity_name': radom13chars(),
                'firstname': radom13chars(),
                'lastname': radom13chars(),
                'email': radom13chars()+'@'+radom13chars()+'.com',
                'password': 'Test1234_-',
            })
        },
        (result, waterfall_cb) => {
            // confirm_inputs(result, waterfall_cb)
            waterfall_cb(null, result)
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
        }, prompt_email_validation), {
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
    }
    )
}

function process_inputs(result) {
    async.waterfall([
        // send inputs for creation. and get company_id
        function (waterfall_cb) {
            if (__DEBUG__) console.log('D send_inputs with:', result)
            send_inputs(result, waterfall_cb)
        },
        // get UUID and passwords
        function (company_id, waterfall_cb) {
            if (__DEBUG__) console.log('D get_cred:', company_id)
            get_cred(company_id, waterfall_cb)
        },
        // create local conf in with company_id
        function (data, waterfall_cb) {
            if (__DEBUG__) console.log('D create_local_conf:', data)
            create_local_conf(data, waterfall_cb)
        },
        // valid uuid and update company with uuid
        function (result, waterfall_cb) {
            if (__DEBUG__) console.log('D valid_cred:', result)
            valid_cred(result, waterfall_cb)
        }
    ], (err) => {
        if (err) registration_failed(err)
        else registration_completed()
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
            timeout: 60000, // 1min
            httpAgent: new http.Agent({ keepAlive: true }),
            httpsAgent: new https.Agent({ keepAlive: true })
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

        fs.writeFileSync(__dirname + '/' + conf_file, '{ "production": { "gateway": { "protocole" : "https", "credentials" : "__gateway_cred__", "host" : "app.worqloads.com", "port" : "443" }, "db": { "host": "app.worqloads.com", "port": 3333, "auth": "__db_key__", "db": 0, "options": { } }, "nb_workers": 10, "company": "__company__" } }', { encoding: 'utf8', flag: 'w' })

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
            function(parallel_cb) {
                axios
                    .post(
                        wql_cred + '/validate',
                        { uuid: result.uuid },
                        {
                            timeout: 30000, // 30sec,
                        }
                    )
                    .then(function (res) {
                        if (__DEBUG__) console.log('E cred validate ok:', res)
                        parallel_cb()
                    })
                    .catch(function (error) {
                        if (error) parallel_cb(error)
                    })
            },
            function(parallel_cb) {
                axios
                    .post(wql_gateway + '/registration/confirm_company', result,
                        // data: { uuid: result.uuid, company: result.company }
                        {
                            timeout: 30000, // 30sec,
                        })
                    .then(function () {
                        parallel_cb()
                    })
                    .catch(function (error) {
                        if (error) parallel_cb(error)
                    })
            }
        }, (err) => callback(err))
    } else {
        callback('error')
    }
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
    process.exit(1)
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
        process.exit(2)
    }
}
