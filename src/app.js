const express = require('express');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const MongoDBStore = require('connect-mongodb-session')(session);
const path = require('path');
const cron = require('node-cron');
const logger = require("./logger");
const default_mist_hosts = { "Global 01 - manage.mist.com": "api.mist.com", "Global 02 - manage.gc1.mist.com": "api.gc1.mist.com", "Global 03 - manage.ac2.mist.com": "api.ac2.mist.com", "Global 04 - manage.gc2.mist.com": "api.gc2.mist.com", "Europe 01 - manage.eu.mist.com": "api.eu.mist.com" }

/*================================================================
 LOAD APP SETTINGS
 ================================================================*/
function stringToBool(val, def_val) {
    if (val) {
        val = val.toLowerCase();
        if (val == "true" || val == "1") return true;
        else if (val == "false" || val == "0") return false;
    }
    return def_val
}

var config = {}
try {
    config = require("./config");
    logger.info("Config file found!")
} catch (e) {
    logger.info("No Config file. Using ENV variables!")
    config = {
        appServer: {
            vhost: process.env.NODE_HOSTNAME || null,
            httpPort: process.env.NODE_PORT || 3000,
            enableHttps: stringToBool(process.env.NODE_HTTPS, false),
            httpsPort: process.env.NODE_PORT_HTTPS || 3443,
            httpsCertificate: process.env.NODE_HTTPS_CERT || null,
            httpsKey: process.env.NODE_HTTPS_KEY || null,
            disable_server_role: stringToBool(process.env.NODE_DISABLE_SERVER_ROLE, false),
            disable_sync_role: stringToBool(process.env.NODE_DISABLE_SYNC_ROLE, false)
        },
        mongo: {
            host: process.env.MONGO_HOSTNAME || null,
            base: process.env.MONGO_DB || "mrm",
            user: process.env.MONGO_USER || null,
            password: process.env.MONGO_PASSWORD || null,
            encKey: process.env.MONGO_ENC_KEY || null,
            sigKey: process.env.MONGO_SIG_KEY || null
        },
        smtp: {
            host: process.env.SMTP_HOSTNAME || null,
            port: process.env.SMTP_PORT || 25,
            secure: stringToBool(process.env.SMTP_SECURE, false), // upgrade later with STARTTLS
            tls: {
                // do not fail on invalid certs
                rejectUnauthorized: stringToBool(process.env.SMTP_REJECT_UNAUTHORIZED, true)
            },
            auth: {
                user: process.env.SMTP_USER || null,
                pass: process.env.SMTP_PASSWORD || null
            },
            from_name: process.env.SMTP_FROM_NAME || "Wi-Fi Access",
            from_email: process.env.SMTP_FROM_EMAIL || "wi-fi@corp.org",
            subject: process.env.SMTP_SUBJECT || "Your Personal Wi-Fi access code",
            logo_url: process.env.SMTP_LOGO || "https://cdn.mist.com/wp-content/uploads/logo.png"
        },
        history: {
            max_age: process.env.MAX_AGE || 30
        },
        login: {
            disclaimer: process.env.APP_DISCLAIMER || "",
            github_url: process.env.APP_GITHUB_URL || "",
            docker_url: process.env.APP_DOCKER_URL || ""
        },
        mist_hosts: process.env.MIST_HOSTS || null
    }
} finally {
    if (typeof(config.mist_hosts) == 'string') {
        try {
            config.mist_hosts = JSON.parse(config.mist_hosts)
        } catch {
            config.mist_hosts = default_mist_hosts;
        }
    } else if (!config.mist_hosts || typeof(config.mist_hosts != "object")) config.mist_hosts = default_mist_hosts;
    logger.info("Config loaded!")
    global.config = config;
}

global.appPath = path.dirname(require.main.filename).replace(new RegExp('/bin$'), "");

/*================================================================
 EXPRESS
 ================================================================*/
var app = express();
// remove http header
app.disable('x-powered-by');
// log http request
//using the logger and its configured transports, to save the logs created by Morgan
const myStream = {
    write: (text) => {
        logger.info(text);
    }
}
app.use(morgan('combined', { stream: myStream }));
// app.use(morgan('\x1b[32minfo\x1b[0m: :remote-addr - :remote-user [:date[clf]] ":method :url HTTP/:http-version" :status :res[content-length]', {
//     skip: function(req, res) { return res.statusCode < 400 && req.originalUrl != "/"; }
// }));

/*================================================================
 MONGO
 ================================================================*/
// configure mongo database
var mongoose = require('mongoose');
mongoose.Promise = require('bluebird');
// retrieve mongodb parameters from config file
const db = mongoose.connection;

db.on('error', function() { logger.error('Unable to connect to mongoDB on ' + global.config.mongo.host + ' server') });
db.once('open', function() {
    logger.info("Connected to mongoDB on " + global.config.mongo.host + " server");
});

// connect to mongodb
var mongo_host = global.config.mongo.host;
if (global.config.mongo.user && global.config.mongo.password) mongo_host = global.config.mongo.user + ":" + encodeURI(global.config.mongo.password) + "@" + mongo_host
mongoose.connect('mongodb://' + mongo_host + '/' + global.config.mongo.base + "?authSource=admin", { useNewUrlParser: true, useUnifiedTopology: true });


/*================================================================
 CRON - SYNC ROLE
 ================================================================*/
if (!config.appServer.disable_sync_role) {
    logger.info("Starting SYNC_MODE");
    const process_init = require("./bin/process_init");
    cron.schedule('0 */1 * * * *', function() {
        process_init.run();
    });
}
/*================================================================
 APP - SERVER ROLE
 ================================================================*/
if (!config.appServer.disable_server_role) {
    logger.info("Starting SERVER_MODE");
    app.use(express.urlencoded({ extended: true, limit: '1mb' }));
    app.use(express.json({ limit: '1mb' }));
    // express-session parameters:
    // save sessions into mongodb 
    app.use(session({
        secret: 'T9QrskYinhvSyt6NUrEcCaQdgez3',
        store: new MongoDBStore({
            uri: 'mongodb://' + mongo_host + '/express-session?authSource=admin',
            collection: global.config.mongo.base
        }),
        rolling: true,
        resave: true,
        saveUninitialized: true,
        cookie: {
            maxAge: 60 * 60 * 1000 // 60 minutes
        },
        unset: "destroy"
    }));

    //===============PASSPORT=================
    // passport is used to save authentication sessions
    global.passport = require('passport');
    app.use(passport.initialize());
    app.use(passport.session());

    //================ROUTES=================
    // view engine setup
    app.set('views', path.join(__dirname, 'views'));
    app.set('view engine', 'pug');

    // uncomment after placing your favicon in /public
    //app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
    // app.use(express.json());
    // app.use(express.urlencoded({ extended: false }));
    app.use(cookieParser());
    app.use(express.static(__dirname + '/public'));
    app.use('/bower_components', express.static('../bower_components'));


    //===============ROUTES=================
    // // User Interface
    //Admin
    const admin_config_token = require('./routes/api_configuration_token');
    app.use('/api/config/token', admin_config_token);
    //Config Sites
    const admin_config_sites = require('./routes/api_configuration_sites');
    app.use('/api/config/sites', admin_config_sites);
    //Config Alerts
    const admin_config_alerts = require('./routes/api_configuration_alert');
    app.use('/api/config/alerts', admin_config_alerts);
    //Config Sites
    const admin_dashboard = require('./routes/api_dashboard');
    app.use('/api/dashboard', admin_dashboard);
    //Account
    const account_api = require('./routes/api_account');
    app.use('/api/account', account_api);
    //Rogue details
    const rogue_api = require('./routes/api_rogue');
    app.use('/api/rogues', rogue_api);
    //Admin
    const admin_api = require('./routes/api');
    app.use('/api', admin_api);
    //Dashboard
    const dashboard = require('./routes/dashboard');
    app.use('/', dashboard);

    //Otherwise
    app.get("*", function(req, res) {
        res.redirect("/");
    });

    // catch 404 and forward to error handler
    app.use(function(req, res, next) {
        var err = new Error('Not Found');
        err.status = 404;
        next(err);
    });

    // error handlers

    // development error handler
    // will print stacktrace
    if (app.get('env') === 'development') {
        app.use(function(err, req, res, next) {
            res.status(err.status || 500);
            res.redirect('error', {
                message: err.message,
                stack: err
            });
            logger.error(err);
        });
    } else {
        // production error handler
        // no stacktraces leaked to user
        app.use(function(err, req, res, next) {
            if (err.status == 404) res.redirect('/unknown');
            res.status(err.status || 500);
            res.redirect('/error');
        });
    }

    module.exports = app;
}