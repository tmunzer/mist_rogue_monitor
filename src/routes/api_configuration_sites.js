/*================================================================
ADMIN:
- ACS Oauth (to authenticate administrators)
- Display Admin Web page
 ================================================================*/
var express = require('express');
var router = express.Router();
var Account = require('../bin/models/account');
var Site = require('../bin/models/site');


/*================================================================
 SITE FUNCTIONS
================================================================*/
function createSite(account, new_site, cb) {
    Site(new_site).save((err, saved_site) => {
        if (err) {
            console.error(err)
            cb(500, err)
        } else {
            account._site = saved_site;
            account.save((err) => {
                if (err) {
                    console.error(err)
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
                console.error(err)
                cb(500, err)
            } else cb(200, saved_site)
        })
    })
}

function saveNewSite(req, res) {
    new_site = {
        all_sites: req.body.all_sites,
        site_ids: req.body.site_ids,
        configured: true
    };

    //try to find the account in the DB
    Account.findOne({
            host: req.session.mist.host,
            org_id: req.session.mist.org_id
        })
        .populate("_site")
        .exec((err, account) => {
            if (err) {
                console.error(err)
                res.status(500).send(err)
                    // if the account already exists, create or update the Site
            } else if (account) {
                // if the account already has a Site, update it
                if (account._site) updateSite(account, new_site, (status, data) => res.status(status).json(data))
                    // otherwise, create the Site entry in the DB for the account
                else createSite(account, new_site, (status, data) => res.status(status).json(data))
                    // if the account does not exists, create the account and the Site                    
            } else {
                res.status(500).json({ "error": "Account not found..." })
            }
        })
}

/*================================================================
 SITE ENTRYPOINT
================================================================*/

router.post("/", (req, res) => {
    if (req.session && req.session.mist) {
        saveNewSite(req, res)
    } else res.status(401).send()
})

module.exports = router;