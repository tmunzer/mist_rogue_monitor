/*================================================================
ADMIN:
- ACS Oauth (to authenticate administrators)
- Display Admin Web page
 ================================================================*/
const express = require('express');
const router = express.Router();
const Account = require('../bin/models/account');
const Site = require('../bin/models/site');
const logger = require("./../logger");
const rbac = require("../bin/mist_check_rbac");

/*================================================================
 SITE FUNCTIONS
================================================================*/
function createSite(account, new_site, cb) {
    Site(new_site).save((err, saved_site) => {
        if (err) {
            logger.error(err)
            cb(500, err)
        } else {
            account._site = saved_site;
            account.save((err) => {
                if (err) {
                    logger.error(err)
                    cb(500, err)
                } else cb(200, saved_site)
            })
        }
    })
}

function updateSite(account, new_site, cb) {
    result = { status: 200, data: null }
    Site.findOne({ _id: account._site }, (err, data) => {
        for (const [key, value] of Object.entries(new_site)) {
            if (!key.startsWith("_")) {
                data[key] = new_site[key]
            }
        }
        data.save((err, saved_site) => {
            if (err) {
                logger.error(err)
                cb(500, err)
            } else cb(200, saved_site)
        })
    })
}

function saveNewSite(req, res) {
    new_site = {
        all_sites: req.body.sites.all_sites,
        site_ids: req.body.sites.site_ids,
        configured: true
    };
    var sync_time_utc = req.body.sync_time_utc;

    //try to find the account in the DB
    Account.findOne({
            host: req.session.mist.host,
            org_id: req.session.mist.org_id
        })
        .populate("_site")
        .exec((err, account) => {
            if (err) {
                logger.error(err)
                res.status(500).send()
                    // if the account already exists, update the sync_time and create or update the Site
            } else if (account) {
                account.sync_time_utc = sync_time_utc;
                account.save((err, account) => {
                    if (err) logger.error(err)
                        // if the account already has a Site, update it
                    else if (account._site) updateSite(account, new_site, (status, data) => res.status(status).json({ sync_time_utc: sync_time_utc, sites: data }));
                    // otherwise, create the Site entry in the DB for the account
                    else createSite(account, new_site, (status, data) => res.status(status).json({ sync_time_utc: sync_time_utc, sites: data }));
                    // if the account does not exists, create the account and the Site                    
                })
            } else {
                res.status(500).json({ "error": "Account not found..." })
            }
        })
}

/*================================================================
 SITE ENTRYPOINT
================================================================*/

router.post("/:org_id", (req, res) => {
    rbac.check_org_access(req, res, (err, req) => {
        if (err) err.send()
        else saveNewSite(req, res)

    })
})

module.exports = router;