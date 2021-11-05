var Account = require("../bin/models/account");



/*================================================================
FUNCTION
================================================================*/
module.exports.getAccount = function(org_id, cb) {
    // retrieve the account in the DB based on the req params 
    Account
        .findOne({ org_id: org_id })
        .populate("_token")
        .exec((err, account) => {
            if (err) return cb({ code: 500, error: err })
            else if (account) {
                // store the usefull data in the user session
                mist = {
                    host: account.host,
                    org_id: account.org_id
                }
                if (account._token) {
                    mist.token = account._token.apitoken
                } else {
                    failure = true;
                    return cb({ code: 400, error: "Account API Token not configured" });
                }
                return cb(null, mist)
            } else
                return cb({ code: 404, error: "Page Not Found" })
        });
}