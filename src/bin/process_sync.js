const Sites = require("./mist_site")
const Rogues_Collections = require("./models/rogue")
const Accounts = require("./models/account")
var api = require("./req");
const logger = require("./../logger")


function _logError(message, err) {
    logger.error(message);
    logger.error(err);

}


/**
 * Function to update the rogues than have not been seen during the last check
 * @param {*} rogues_collection 
 * @param {*} site_id 
 * @param {*} date 
 */
function _updateRoguesNotSeen(rogues_collection, date) {
    // for all the rogues not detected anymore, saving the data in the history
    rogues_collection
        .find({ updated_at: { $lt: date } })
        .exec((err, rogues) => {
            if (err) logger.error(err)
            if (rogues) {
                rogues.forEach(rogue_from_db => {

                    rogue_from_db.first_seen = 0;
                    rogue_from_db.email_sent = 0;
                    rogue_from_db.updated_at = date;

                    rogue_from_db.save((err) => {
                        if (err) logger.error(err);
                    })
                })
            }
        })
}

/**
 * Function to update the entry in the DB
 * @param {*} rogue_type 
 * @param {*} rogue_from_db 
 * @param {*} rogue_from_mist 
 * @param {*} date 
 */
function _updateRogue(rogue_type, rogue_from_db, rogue_from_mist, date, cb) {
    // because the some ap can be seen as a rogue, spoof, ... at the same time, check if the ap has 
    // already been updated during this turn
    if (rogue_from_db.updated_at != date) {
        if (rogue_from_db.first_seen == 0) {
            rogue_from_db.first_seen = date;
        }
        rogue_from_db.last_seen = date;
        rogue_from_db.rogue_type[rogue_type] = true;

        rogue_from_db.ssid.push({ ts: date, value: rogue_from_mist.ssid })
        while (rogue_from_db.ssid.length > global.config.history.max_age) { rogue_from_db.ssid.shift() }

        rogue_from_db.ap_mac.push({ ts: date, value: rogue_from_mist.ap_mac })
        while (rogue_from_db.ap_mac.length > global.config.history.max_age) { rogue_from_db.ap_mac.shift() }

        rogue_from_db.channel.push({ ts: date, value: rogue_from_mist.channel })
        while (rogue_from_db.channel.length > global.config.history.max_age) { rogue_from_db.channel.shift() }

        rogue_from_db.avg_rssi.push({ ts: date, value: rogue_from_mist.avg_rssi })
        while (rogue_from_db.avg_rssi.length > global.config.history.max_age) { rogue_from_db.avg_rssi.shift() }

        rogue_from_db.num_aps.push({ ts: date, value: rogue_from_mist.num_aps })
        while (rogue_from_db.num_aps.length > global.config.history.max_age) { rogue_from_db.num_aps.shift() }

        rogue_from_db.delta_x.push({ ts: date, value: rogue_from_mist.delta_x })
        while (rogue_from_db.delta_x.length > global.config.history.max_age) { rogue_from_db.delta_x.shift() }

        rogue_from_db.delta_y.push({ ts: date, value: rogue_from_mist.delta_y })
        while (rogue_from_db.delta_y.length > global.config.history.max_age) { rogue_from_db.delta_y.shift() }

    } else {
        rogue_from_db.rogue_type[rogue_type] = true;
    }

    rogue_from_db.updated_at = date;
    rogue_from_db.save((err) => {
        if (err) logger.error(err);
        cb()
    })
}

/**
 * Function to create the entry in the DB
 * @param {*} site_id 
 * @param {*} rogue_type 
 * @param {*} rogue_from_mist 
 * @param {*} date 
 * @param {*} Rogues_collection 
 */
function _createRogue(site_id, rogue_type, rogue_from_mist, date, rogues_collection, cb) {
    new_rogue = {
        site_id: site_id,
        rogue_type: {
            lan: false,
            honeypot: false,
            spoof: false,
            others: false
        },
        bssid: rogue_from_mist["bssid"],
        ssid: [{ ts: date, value: rogue_from_mist["ssid"] }],
        ap_mac: [{ ts: date, value: rogue_from_mist["ap_mac"] }],
        channel: [{ ts: date, value: rogue_from_mist["channel"] }],
        avg_rssi: [{ ts: date, value: rogue_from_mist["avg_rssi"] }],
        num_aps: [{ ts: date, value: rogue_from_mist["num_aps"] }],
        delta_x: [{ ts: date, value: rogue_from_mist["delta_x"] }],
        delta_y: [{ ts: date, value: rogue_from_mist["delta_y"] }],
        first_seen: date,
        last_seen: date,
        updated_at: date,
        created_at: date
    }
    new_rogue.rogue_type[rogue_type] = true;

    rogues_collection(new_rogue).save((err) => {
        if (err) logger.error(err);
        cb()
    })
}

/**
 * Function to get the rogue list form Mist
 * @param {*} mist 
 * @param {String} site_id 
 * @param {*} rogue_type 
 * @param {*} callback 
 */
function _getRogues(mist, path, cb, rogues = []) {
    api.GET(mist, path, (err, data) => {
        if (err) cb(err)
        else if (data && "results" in data) {
            rogues = rogues.concat(data["results"])
            if ("next" in data) {
                _getRogues(mist, data["next"], cb, rogues)
            } else cb(null, rogues)
        } else cb(err, rogues)
    });
};

/**
 * This function is retrieving all the honeypot/others/lan/spoof rogue APs, and 
 * update the DB (create or update the entry) for all the rogue currently seen 
 * @param {*} mist 
 * @param {String} site_id 
 * @param {Number} date 
 * @param {*} rogues_collection 
 */
async function _syncSite(mist, site_id, date, rogues_collection, org_id, cb) {
    logger.info("account " + org_id + "/" + site_id + " - syncing rogues")
    const rogue_types = ["honeypot", "others", "lan", "spoof"];
    var count_rogue_types = 0;
    rogue_types.forEach((rogue_type) => {
        const path = "/api/v1/sites/" + site_id + "/insights/rogues?duration=>d&type=" + rogue_type;
        _getRogues(mist, path, (err, rogues) => {
            if (err) {
                _logError("Unable to retrieve rogues from " + mist.host + " for site " + site_id, err);
                count_rogue_types++;
                if (count_rogue_types == rogue_types.length) {
                    cb();
                }
            } else if (!rogues || rogues.length == 0) {
                count_rogue_types++;
                if (count_rogue_types == rogue_types.length) {
                    cb();
                }
            } else {
                var count_rogues = 0;
                rogues.forEach(rogue_from_mist => {
                    rogues_collection
                        .findOne({ site_id: site_id, bssid: rogue_from_mist["bssid"] })
                        .exec((err, rogue_from_db) => {
                            if (err) {
                                _logError("Unable to retrieve rogue " + rogue["bssid"] + " (site " + site_id + ") from DB", err);
                                count_rogues++;
                                if (count_rogues == rogues.length) {
                                    count_rogue_types++;
                                    if (count_rogue_types == rogue_types.length) {
                                        cb();
                                    }
                                }
                            } else if (rogue_from_db) {
                                _updateRogue(rogue_type, rogue_from_db, rogue_from_mist, date, function() {
                                    count_rogues++;
                                    if (count_rogues == rogues.length) {
                                        count_rogue_types++;
                                        if (count_rogue_types == rogue_types.length) {
                                            cb();
                                        }
                                    }
                                });
                            } else {
                                _createRogue(site_id, rogue_type, rogue_from_mist, date, rogues_collection, function() {
                                    count_rogues++;
                                    if (count_rogues == rogues.length) {
                                        count_rogue_types++;
                                        if (count_rogue_types == rogue_types.length) {
                                            cb();
                                        }
                                    }
                                });
                            }
                        })
                })
            }
        })
    })
}
/**
 * Delete Rogues that are not seen for more than 30 days
 * @param {Number} date 
 * @param {*} rogues_collection 
 */
function _cleanRogues(date, rogues_collection, org_id) {
    logger.info("account " + org_id + " - cleaning rogues")
    var deadline = new Date().setDate(date.getDate() - global.config.history.max_age)
    rogues_collection
        .find({ last_seen: { $lt: deadline } })
        .exec((err, rogues) => {
            if (err) logger.error(err)
            else if (rogues.length > 0) {
                rogues.forEach(rogue => {
                    rogue.remove();
                })
            }
        })
}

async function _processSites(account, mist, site_ids, date, rogues_collection, cb) {
    var count_sites = 0;
    site_ids.forEach(site_id => {
        _syncSite(mist, site_id, date, rogues_collection, mist.org_id, function() {
            count_sites++;
            if (count_sites == site_ids.length) {
                _updateRoguesNotSeen(rogues_collection, date, mist.org_id);
                _cleanRogues(date, rogues_collection, mist.org_id);
                cb(account);
            }
        });
    });
}

/**
 * Allows one to query the collection of user groups given query parameters as input
 * @param {Object} mist - API credentials
 * @param {String} mist.host - Mist Cloud to request
 * @param {String} mist.token - Mist API Token
 * @param {String} mist.org_id - Mist Org Id
 * @param {String} site_ids - List of Mist Site ID, or "all" for all the sites
 *  */
async function _refreshRogues(mist, date, account, all_sites = false, cb) {
    site_ids = account._site.site_ids;
    const org_id = mist.org_id;
    const rogues_collection = Rogues_Collections(org_id)
    if (all_sites) {
        Sites.getSites(mist, (err, sites) => {
            if (err) {
                _logError("Unable to retrieve sites from " + mist.host + " for org " + mist.org_id, err);
            } else if (sites) {
                site_ids = [];
                sites.forEach(site => {
                    site_ids.push(site["id"])
                })
                _processSites(account, mist, site_ids, date, rogues_collection, cb)
            }
        })
    } else if (site_ids.length > 0) {
        _processSites(account, mist, site_ids, date, rogues_collection, cb)
    } else {
        cb(account);
    }

}



module.exports.run = function(account, date, cb) {
    const mist = {
        host: account.host,
        org_id: account.org_id,
        token: account._token.apitoken
    }
    _refreshRogues(mist, date, account, account._site.all_sites, cb)
    account.last_rogue_process = date;
    account.save((err, account) => {
        if (err) _logError("unable to update the last_rogue_process", err)
    })
}