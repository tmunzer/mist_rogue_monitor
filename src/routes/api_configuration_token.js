/*================================================================
ADMIN:
- ACS Oauth (to authenticate administrators)
- Display Admin Web page
 ================================================================*/
const express = require('express');
const router = express.Router();
const Account = require('../bin/models/account');
const Token = require('../bin/models/token');
const mist_token = require("../bin/mist_token");
const logger = require("./../logger");
const rbac = require("../bin/mist_check_rbac");
/*================================================================
 TOKEN FUNCTIONS
================================================================*/
function createAccountAndToken(new_account, new_token, cb) {
    Account(new_account).save((err, saved_account) => {
        if (err) {
            logger.error(err)
            cb(500, err)
        } else createToken(saved_account, new_token, cb)
    })
}

function createToken(account, new_token, cb) {
    Token(new_token).save((err, saved_token) => {
        if (err) {
            logger.error(err)
            cb(500, err)
        } else {
            account._token = saved_token;
            account.save((err) => {
                if (err) {
                    logger.error(err)
                    cb(500, err)
                } else cb(200, { created_by: new_token.created_by, auto_mode: new_token.apitoken_id != "manual_token" })
            })
        }
    })
}

function updateToken(account, new_token, cb) {
    result = { status: 200, data: null }
    Token.findOne({ _id: account._token }, (err, data) => {
        for (const [key, value] of Object.entries(new_token)) {
            if (!key.startsWith("_")) {
                data[key] = new_token[key]
            }
        }
        data.save((err) => {
            if (err) {
                logger.error(err)
                cb(500, err)
            } else cb(200, { created_by: new_token.created_by, auto_mode: new_token.apitoken_id != "manual_token" })
        })
    })
}

function saveNewToken(req, res, err, data) {
    // if not able to generate the token
    if (err) {
        // deepcode ignore ServerLeak: returning error code from Mist
        res.status(err.code).send(err.error)
            // if the token has been generated
    } else {
        new_token = {
                apitoken: data.key,
                apitoken_id: data.id,
                scope: req.body.scope,
                created_by: req.session.self.email
            }
            //try to find the account in the DB
        Account.findOne({
                host: req.session.mist.host,
                org_id: req.session.mist.org_id
            })
            .populate("_token")
            .exec((err, account) => {
                if (err) {
                    logger.error(err)
                    res.status(500).send()
                        // if the account already exists, create or update the token
                } else if (account) {
                    // if the account already has a token, update it
                    if (account._token) updateToken(account, new_token, (status, data) => res.status(status).json(data))
                        // otherwise, create the token entry in the DB for the account
                    else createToken(account, new_token, (status, data) => res.status(status).json(data))
                        // if the account does not exists, create the account and the token                    
                } else {
                    new_account = {
                        host: req.session.mist.host,
                        org_id: req.session.mist.org_id,
                        org_name: req.session.mist.org_name,
                    }
                    createAccountAndToken(new_account, new_token, (status, data) => { res.status(status).json(data) })
                }
            })
    }
}

/*================================================================
 TOKEN ENTRYPOINT
================================================================*/

router.get('/:org_id', (req, res) => {
    rbac.check_org_access(req, res, (err, req) => {
        if (err) err.send()
        else {
            data = {
                configured: false,
                created_by: null,
                scope: null,
                auto_mode: true,
                can_delete: false
            }
            Account.findOne({ org_id: req.session.mist.org_id, host: req.session.mist.host })
                .populate("_token")
                .exec((err, account) => {
                    if (err) {
                        logger.error(err)
                        res.status(500).send()
                    } else if (account && account._token) {
                        data.token.configured = true
                        data.token.created_by = account._token.created_by
                        data.token.scope = account._token.scope
                        if (account._token.apitoken_id == "manual_token") {
                            data.token.auto_mode = false
                        }
                        if ((account._token.scope == "user" && account._token.created_by == req.session.self.email) ||
                            (account._token.scope == "org" && req.session.mist.privilege == "admin")) {
                            data.token.can_delete = true
                        }
                        res.json(data)
                    } else res.send(data)
                })
        }
    })
})

router.post("/:org_id", (req, res) => {
    rbac.check_org_access(req, res, (err, req) => {
        if (err) err.send()
        else {
            if (req.body.scope) {
                if (req.body.scope == "user") {
                    mist_token.generate(req.session.mist, "user", (err, data) => saveNewToken(req, res, err, data))
                } else if (req.body.scope == "org") {
                    mist_token.generate(req.session.mist, "org", (err, data) => saveNewToken(req, res, err, data))
                }
            } else if (req.body.apitoken) {
                new_token = {
                    id: 'manual_token',
                    key: req.body.apitoken,
                }
                saveNewToken(req, res, null, new_token)
            } else res.status(400).send("missing scope")
        }
    })
})

router.delete("/:org_id", (req, res) => {
    rbac.check_org_access(req, res, (err, req) => {
        if (err) err.send()
        else {
            Account.findOne({ host: req.session.mist.host, org_id: req.session.mist.org_id })
                .populate("_token")
                .exec((err, db_account) => {
                    if (db_account && db_account._token) {
                        db_token = db_account._token
                        mist_token.delete(req.session.mist, db_token, (err, data) => {
                            if (err) {
                                logger.error(err)
                                    // deepcode ignore ServerLeak: returning error code from Mist
                                res.status(err.code).send(err.error)
                            } else {
                                Token.findByIdAndRemove(db_token._id, (err) => {
                                    Account.findOneAndUpdate({ _id: db_account._id },   { $unset: { _token: 1 } }).exec()
                                    res.json(null)
                                })
                            }
                        })
                    } else {
                        res.status(400).send("Account of Token not found")
                    }
                })
        }
    })
})


module.exports = router;