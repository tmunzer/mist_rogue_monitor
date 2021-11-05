var express = require('express');
var morgan = require('morgan');
var cookieParser = require('cookie-parser');
var session = require('express-session');
var MongoDBStore = require('connect-mongodb-session')(session);
var path = require('path');
const cron = require('node-cron');

/*================================================================
 LOAD APP SETTINGS
 ================================================================*/
function stringToBool(val, def_val) {
    if (val) {
        val = val.toLowerCase()
        if (val == "true" || val == "1") return true
        else if (val == "false" || val == "0") return false
    }
    return def_val
}

var config = {}
try {
    config = require("./config")
} catch (e) {

    config = {
        appServer: {
            vhost: process.env.NODE_HOSTNAME || null,
            httpPort: process.env.NODE_PORT || 3000,
            enableHttps: stringToBool(process.env.NODE_HTTPS, false),
            httpsPort: process.env.NODE_PORT_HTTPS || 3443,
            httpsCertificate: process.env.NODE_HTTPS_CERT || null,
            httpsKey: process.env.NODE_HTTPS_KEY || null
        },
        mongo: {
            host: process.env.MONGO_HOSTNAME || null,
            base: process.env.MONGO_DB || "wsm",
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
            logo_url: process.env.SMTP_LOGO || "https://cdn.mist.com/wp-content/uploads/logo.png",
            enable_qrcode: stringToBool(process.env.SMTP_ENABLE_QRCODE, true)
        },
        history: {
            max_age: process.env.MAX_AGE || 365
        },
        login: {
            disclaimer: process.env.APP_DISCLAIMER || "",
            github_url: process.env.APP_GITHUB_URL || "",
            docker_url: process.env.APP_DOCKER_URL || ""
        }
    }
} finally {
    global.config = config
}

global.appPath = path.dirname(require.main.filename).replace(new RegExp('/bin$'), "");

/*================================================================
 EXPRESS
 ================================================================*/
var app = express();
// remove http header
app.disable('x-powered-by');
// log http request
app.use(morgan('\x1b[32minfo\x1b[0m: :remote-addr - :remote-user [:date[clf]] ":method :url HTTP/:http-version" :status :res[content-length]', {
    skip: function(req, res) { return res.statusCode < 400 && req.originalUrl != "/"; }
}));

/*================================================================
 MONGO
 ================================================================*/
// configure mongo database
var mongoose = require('mongoose');
mongoose.Promise = require('bluebird');
// retrieve mongodb parameters from config file
const db = mongoose.connection;

db.on('error', console.error.bind(console, '\x1b[31mERROR\x1b[0m: unable to connect to mongoDB on ' + global.config.mongo.host + ' server'));
db.once('open', function() {
    console.info("\x1b[32minfo\x1b[0m:", "Connected to mongoDB on " + global.config.mongo.host + " server");
});

// connect to mongodb
var mongo_host = global.config.mongo.host
if (global.config.mongo.user && global.config.mongo.password) mongo_host = global.config.mongo.user + ":" + encodeURI(global.config.mongo.password) + "@" + mongo_host
mongoose.connect('mongodb://' + mongo_host + '/' + global.config.mongo.base + "?authSource=admin", { useNewUrlParser: true, useUnifiedTopology: true });


/*================================================================
 CRON
 ================================================================*/
const Rogue_Check = require("./bin/mist_rogue");
cron.schedule('0 0 */1 * * *', function() {
    Rogue_Check.new_turn("*")
    Rogue_Check.new_turn(h)
});
/*================================================================
 APP
 ================================================================*/
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(express.json({ limit: '1mb' }));
// express-session parameters:
// save sessions into mongodb 
app.use(session({
    secret: 'T9QrskYinhvSyt6NUrEcCaQdgez3',
    store: new MongoDBStore({
        uri: 'mongodb://' + mongo_host + '/express-session?authSource=admin',
        collection: 'wsm'
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
//Admin Login
var admin = require('./routes/dashboard');
app.use('/dashboard', admin);
//Admin
var admin_config_token = require('./routes/api_configuration_token');
app.use('/api/config/token', admin_config_token);
//Config Sites
var admin_config_sites = require('./routes/api_configuration_sites');
app.use('/api/config/sites', admin_config_sites);
//Config Sites
var admin_dashboard = require('./routes/api_dashboard');
app.use('/api/dashboard', admin_dashboard);
//Admin
var admin_api = require('./routes/api');
app.use('/api', admin_api);

//Otherwise
app.get("*", function(req, res) {
    res.redirect("/dashboard");
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
        console.log(err);
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