/*================================================================
ADMIN:
- ACS Oauth (to authenticate administrators)
- Display Admin Web page
 ================================================================*/
const express = require('express');
const router = express.Router();
const Account = require('../bin/models/account');
const Token = require('../bin/models/token');
const Alerting = require('../bin/models/alerting');

function delete_account(doc_id, cb) {
    Account.findByIdAndRemove(doc_id, (err) => { cb(err) })
}


function delete_token(doc_id) {
    Token.findByIdAndRemove(doc_id, (err) => { console.error(err) })
}

function delete_alerting(org_id) {
    Alerting.findOneAndDelete({ org_id: org_id }, (err) => { console.error(err) })
}


function process_delete(org_id, cb) {
    Account.findOne({ org_id: org_id })
        .exec((err, account) => {
            if (err) cb({ status: 500, message: err })
            else if (account) {
                if (account._token) delete_token(account._token)
                if (account._alerting) delete_alerting(org_id)
                delete_account(account._id, (err) => {
                    if (err) {
                        console.error(err)
                        cb({ status: 500, message: err })
                    } else cb()
                })
            } else cb({ status: 403, message: "Account not found" })
        })
}
/*================================================================
 TOKEN ENTRYPOINT
================================================================*/

router.delete('/', (req, res) => {
    if (req.session && req.session.mist && req.session.mist.org_id) {
        process_delete(req.session.mist.org_id, (err) => {
            if (err) res.status(err.status).send(err.message)
            else res.send()
        })
    } else res.status(401).send()
})




module.exports = router;