/*================================================================
ADMIN:
- Display Admin Web page
 ================================================================*/
var express = require('express');
var router = express.Router();
var Account = require('../bin/models/account');
var mist_login = require("../bin/mist_login");
var mist_site = require("../bin/mist_site");

const rbac = require("../bin/mist_check_rbac")

/*================================================================
 LOG IN
 ================================================================*/

router.post("/login", (req, res) => {
    if (req.body.host) var mist = { host: req.body["host"] };
    else return res.send({ "error": "missing host" });
    if (req.body.host) var username = req.body["username"];
    else return res.send({ "error": "missing host" });
    if (req.body.host) var password = req.body["password"];
    else return res.send({ "error": "missing host" });
    var two_factor_code = req.body["two_factor_code"];

    req.session.mist = { host: mist.host };
    req.session.username = username;
    mist_login.login(mist, username, password, two_factor_code, (err, data) => {
        if (err) res.status(err.code).send(err.error);
        else if (data.self.two_factor_required && !data.self.two_factor_passed) res.json({ "result": "two_factor_required" });
        else {
            req.session.self = data.self;
            req.session.mist = data.mist;
            res.json({ "result": "success" });
        }
    })
});

/*================================================================
 ORGS
 ================================================================*/

function compare(a, b) {
    // Use toUpperCase() to ignore character casing
    const nameA = a.name.toUpperCase();
    const nameB = b.name.toUpperCase();

    let comparison = 0;
    if (nameA > nameB) {
        comparison = 1;
    } else if (nameA < nameB) {
        comparison = -1;
    }
    return comparison;
}

router.get("/orgs", (req, res) => {
    if (!req.session || !req.session.self) res.status(401).send();
    else {
        var orgs = [];
        var org_ids = [];
        for (var i in req.session.self.privileges) {
            var entry = req.session.self.privileges[i];
            var tmp = null;
            if (entry.role == "write" || entry.role == "admin") {
                if (entry.scope == "org") {
                    tmp = { "name": entry.name, "org_id": entry.org_id };
                } else if (entry.scope == "site") {
                    tmp = { "name": entry.org_name, "org_id": entry.org_id };
                }
                if (tmp && org_ids.indexOf(tmp.org_id) < 0) {
                    org_ids.push(tmp.org_id);
                    orgs.push(tmp);
                }
            }
        }
        orgs.sort(compare);
        res.json(orgs);
    }
})

router.post("/orgs/:org_id", (req, res) => {
    rbac.check_org_access(req, res, (err, req) => {
        if (err) err.send();
        else {
            for (var i in req.session.self.privileges) {
                var entry = req.session.self.privileges[i];
                if (entry.role == "write" || entry.role == "admin") {
                    if (entry.org_id == req.session.mist.org_id) {
                        req.session.mist.org_name = req.body.org.name;
                        req.session.mist.privilege = entry.role;
                        return res.send();
                    }
                }
            }
            res.status(400).json({ error: "org_id " + org_id + " not found" });
        }
    })
})

/*================================================================
 SITES
 ================================================================*/

router.get("/sites/:org_id", (req, res) => {
    rbac.check_org_access(req, res, (err, req) => {
        if (err) err.send();
        else {
            var sites = [];
            mist_site.getSites(req.session.mist, (err, data) => {
                if (err) {
                    console.error(err);
                    res.status(500).json({ err: err });
                } else if (data) {
                    data.forEach(site => {
                        sites.push({ name: site.name, id: site.id });
                    })
                    sites.sort(compare);
                    res.json(sites);
                }
            })
        } 
    })
})

/*================================================================
 CONFIG 
 ================================================================*/
router.get('/config/:org_id', (req, res) => {
    rbac.check_org_access(req, res, (err, req) => {
        if (err) err.send()
        else {
            data = {
                privilege: req.session.mist.privilege,
                account_created: false,
                config: {
                    sites: {
                        all_sites: false,
                        site_ids: [],
                        configured: false
                    },
                    token: {
                        configured: false,
                        scope: null,
                        auto_mode: true,
                        can_delete: false
                    },
                    alert: {
                        configured: false,
                        enabled: false,
                        neighbors: false,
                        to_emails: [],
                        min_age: 1
                    }
                }
            }
            Account.findOne({ org_id: req.session.mist.org_id, host: req.session.mist.host })
                .populate("_token")
                .populate("_site")
                .populate("_alert")
                .exec((err, account) => {
                    if (err) {
                        console.error(err);
                        res.status(500).send(err);
                    } else if (!account) res.send(data)
                    else {
                        req.session.account_id = account._id;
                        data.account_created = true;
                        // site
                        if (account._site) {
                            data.config.sites.configured = account._site.configured;
                            data.config.sites.all_sites = account._site.all_sites;
                            data.config.sites.site_ids = account._site.site_ids;
                        }
                        //token                        
                        if (account._token) {
                            data.config.token.configured = true;
                            data.config.token.created_by = account._token.created_by;
                            data.config.token.scope = account._token.scope;
                            if (account._token.apitoken_id == "manual_token") {
                                data.config.token.auto_mode = false;
                            }
                            if (account._token.scope == "user" && account._token.created_by == req.session.self.email) {
                                data.config.token.can_delete = true;
                            } else if (account._token.scope == "org" && req.session.mist.privilege == "admin") {
                                data.config.token.can_delete = true;
                            }
                        }
                        // alerting
                        if (account._alert) {
                            data.config.alert.configured = account._alert.configured;
                            data.config.alert.enabled = account._alert.enabled;
                            data.config.alert.neighbors = account._alert.neighbors;
                            data.config.alert.to_emails = account._alert.to_emails;
                            data.config.alert.min_age = account._alert.min_age;
                        }
                        res.json(data);
                    }
                })
        }
    })
})

/*================================================================
 DISCLAIMER
 ================================================================*/
router.get('/disclaimer', (req, res) => {
    let data = {}
    if (global.config.login.disclaimer) data["disclaimer"] = global.config.login.disclaimer;
    if (global.config.login.github_url) data["github_url"] = global.config.login.github_url;
    if (global.config.login.docker_url) data["docker_url"] = global.config.login.docker_url;
    res.json(data);
})

module.exports = router;