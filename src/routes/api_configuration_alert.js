/*================================================================
ADMIN:
- ACS Oauth (to authenticate administrators)
- Display Admin Web page
 ================================================================*/
const express = require('express');
const router = express.Router();
const Account = require('../bin/models/account');
const Alert = require('../bin/models/alert');
const logger = require("./../logger");
const rbac = require("../bin/mist_check_rbac")

/*================================================================
 ALERT FUNCTIONS
================================================================*/
function createAlert(account, new_alert, cb) {
    Alert(new_alert).save((err, saved_alert) => {
        if (err) {
            logger.error(err)
            cb(500, err)
        } else {
            account._alert = saved_alert;
            account.save((err) => {
                if (err) {
                    logger.error(err)
                    cb(500, err)
                } else cb(200, saved_alert)
            })
        }
    })
}

function updateAlert(account, new_alert, cb) {
    result = { status: 200, data: null }
    Alert.findOne({ _id: account._alert }, (err, data) => {
        for (const [key, value] of Object.entries(new_alert)) {
            if (!key.startsWith("_")) {
                data[key] = new_alert[key]
            }
        }
        data.save((err, saved_alert) => {
            if (err) {
                logger.error(err)
                cb(500, err)
            } else cb(200, saved_alert)
        })
    })
}

function saveNewAlert(req, res) {
    new_alert = {
        to_emails: req.body.to_emails,
        min_age: req.body.min_age,
        enabled: req.body.enabled,
        neighbors: req.body.neighbors,
        configured: true
    };

    //try to find the account in the DB
    Account.findOne({
            host: req.session.mist.host,
            org_id: req.session.mist.org_id
        })
        .populate("_alert")
        .exec((err, account) => {
            if (err) {
                logger.error(err)
                res.status(500).send()
                    // if the account already exists, create or update the Site
            } else if (account) {
                // if the account already has a Site, update it
                if (account._alert) updateAlert(account, new_alert, (status, data) => res.status(status).json(data))
                    // otherwise, create the Site entry in the DB for the account
                else createAlert(account, new_alert, (status, data) => res.status(status).json(data))
                    // if the account does not exists, create the account and the Site                    
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
        else saveNewAlert(req, res)
    })
})

module.exports = router;