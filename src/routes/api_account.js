/*================================================================
ADMIN:
- ACS Oauth (to authenticate administrators)
- Display Admin Web page
 ================================================================*/
const express = require('express');
const router = express.Router();
const Account = require('../bin/models/account');
const Token = require('../bin/models/token');
const Site = require('../bin/models/site');
const Alerting = require('../bin/models/alert');
const Rogues_Collections = require("../bin/models/rogue");
const logger = require("./../logger");
const rbac = require("../bin/mist_check_rbac");

function delete_account(doc_id, cb) {
    Account.findByIdAndRemove(doc_id, (err) => { cb(err) })
}


function delete_token(doc_id) {
    Token.findByIdAndRemove(doc_id, (err) => { logger.error(err) })
}

function delete_site(doc_id) {
    Site.findByIdAndRemove(doc_id, (err) => { logger.error(err) })
}

function delete_alerting(org_id) {
    Alerting.findOneAndDelete({ org_id: org_id }, (err) => { logger.error(err) })
}


function process_delete(org_id, cb) {
    Account.findOne({ org_id: org_id })
        .exec((err, account) => {
            if (err) cb({ status: 500, message: err })
            if (!account) cb({ status: 403, message: "Account not found" })
            else {
                const rogues_collection = Rogues_Collections(org_id)
                rogues_collection.collection.drop()
                if (account._token) delete_token(account._token)
                if (account._site) delete_site(account._site)
                if (account._alerting) delete_alerting(org_id)
                delete_account(account._id, (err) => {
                    if (err) {
                        logger.error(err)
                        cb({ status: 500, message: err })
                    } else cb()
                })
            }
        })
}
/*================================================================
 TOKEN ENTRYPOINT
================================================================*/

router.delete('/:org_id', (req, res) => {
    rbac.check_org_access(req, res, (err, req) => {
        if (err) err.send()
        else {
            process_delete(req.session.mist.org_id, (err) => {
                if (err) res.status(err.status).send(err.message)
                else res.send()
            })
        }
    })
})




module.exports = router;