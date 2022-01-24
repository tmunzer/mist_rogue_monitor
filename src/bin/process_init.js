const Accounts = require("./models/account")
const process_sync = require("./process_sync")
const process_alert = require("./process_alert")
const logger = require("./../logger")


module.exports.run = function() {
    const date = new Date();
    var hours = date.getUTCHours();
    var minutes = date.getUTCMinutes();
    // TODO: 
    //Accounts.find({ update_hour: hour, disabled: false })
    Accounts.find({ disabled: false, sync_time_utc: { hours: hours, minutes: minutes } })
        .populate("_token")
        .populate("_site")
        .populate("_alert")
        .exec((err, accounts) => {
            if (err) {
                logger.error("Error when retriving the accounts during the new turn", err)
            } else if (accounts.length > 0) {
                accounts.forEach(account => {
                    if (!account._token || !account._token.apitoken) {
                        logger.error("account " + account._id + " - no API token configured")
                            // TODO: disable site
                    } else if (!account._site || !account._site.configured) {
                        logger.error("account " + account._id + " - no site configured")
                            // TODO: disable site
                    } else if (account.disabled) {
                        logger.error("account " + account._id + " - disabled")
                            // TODO: disable site
                    } else {
                        logger.info("account " + account._id + " - syncing started...")
                        process_sync.run(account, date, (account) => {
                            logger.info("account " + account._id + " - syncing finished...")

                            if (!account._alert || !account._alert.configured) {
                                logger.warning("account " + account._id + " - alerting not configured...")
                            } else if (!account._alert.enabled) {
                                logger.warning("account " + account._id + " - alerting disabled...")
                            } else if (account._alert.to_emails.length == 0) {
                                logger.warning("account " + account._id + " - recipients not configured...")
                            } else {
                                logger.info("account " + account._id + " - emailing in process...")
                                process_alert.run(account)
                            }
                        })
                    }
                })
            }
        })
}