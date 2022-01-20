const Sites = require("./mist_site")
const Rogues_Collections = require("./models/rogue")
const Accounts = require("./models/account")
var api = require("./req");


function _logError(message, err) {
    console.error(message);
    console.error(err);

}

/**
 * Function to update the rogues than have not been seen during the last check
 * @param {*} rogues_collection 
 * @param {*} site_id 
 * @param {*} date 
 */
function _updateRoguesNotSeen(rogues_collection, site_id, date) {
    // for all the rogues not detected anymore, saving the data in the history
    rogues_collection
        .find({ site_id: site_id, updated_at: { $lt: date } })
        .exec((err, rogues) => {
            if (err) console.log(err)
            if (rogues) {
                rogues.forEach(rogue_from_db => {

                    rogue_from_db.first_seen = 0;
                    rogue_from_db.updated_at = date;

                    rogue_from_db.save((err, rogue_saved) => {
                        if (err) console.log(err);
                        //console.log(rogue_saved)
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
function _updateRogue(rogue_type, rogue_from_db, rogue_from_mist, date) {
    // because the some ap can be seen as a rogue, spoof, ... at the same time, check if the ap has 
    // already been updated during this turn
    if (rogue_from_db.updated_at != date) {
        if (rogue_from_db.first_seen == 0) {
            rogue_from_db.first_seen = date;
        }
        rogue_from_db.last_seen = date;
        rogue_from_db.rogue_type[rogue_type] = true;

        rogue_from_db.ssid.push({ ts: date, value: rogue_from_mist.ssid })
        while (rogue_from_db.ssid.length > 30) { rogue_from_db.ssid.shift() }

        //rogue_from_db.ap_mac.push({ts: date, value: rogue_from_mist.ap_mac})
        //while (rogue_from_db.ap_mac.length > 30) {rogue_from_db.ap_mac.shift()}

        rogue_from_db.channel.push({ ts: date, value: rogue_from_mist.channel })
        while (rogue_from_db.channel.length > 30) { rogue_from_db.channel.shift() }

        rogue_from_db.avg_rssi.push({ ts: date, value: rogue_from_mist.avg_rssi })
        while (rogue_from_db.avg_rssi.length > 30) { rogue_from_db.avg_rssi.shift() }

        rogue_from_db.num_aps.push({ ts: date, value: rogue_from_mist.num_aps })
        while (rogue_from_db.num_aps.length > 30) { rogue_from_db.num_aps.shift() }

        rogue_from_db.delta_x.push({ ts: date, value: rogue_from_mist.delta_x })
        while (rogue_from_db.delta_x.length > 30) { rogue_from_db.delta_x.shift() }

        rogue_from_db.delta_y.push({ ts: date, value: rogue_from_mist.delta_y })
        while (rogue_from_db.delta_y.length > 30) { rogue_from_db.delta_y.shift() }

    } else {
        rogue_from_db.rogue_type[rogue_type] = true;
    }

    rogue_from_db.updated_at = date;
    rogue_from_db.save((err, rogue_saved) => {
        if (err) console.log(err);
        //console.log(rogue_saved)
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
function _createRogue(site_id, rogue_type, rogue_from_mist, date, rogues_collection) {
    new_rogue = {
        site_id: site_id,
        rogue_type: {
            lan: false,
            honeypot: false,
            spoof: false,
            others: false
        },
        //ap_mac: rogue_from_mist["ap_mac"],
        bssid: rogue_from_mist["bssid"],
        ssid: [{ ts: date, value: rogue_from_mist["ssid"] }],
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

    rogues_collection(new_rogue).save((err, rogue_saved) => {
        if (err) console.log(err);
        //console.log(rogue_saved)
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
function _processSites(mist, site_id, date, rogues_collection) {
    const rogue_types = ["honeypot", "others", "lan", "spoof"];
    rogue_types.forEach((rogue_type) => {
        const path = "/api/v1/sites/" + site_id + "/insights/rogues?type=" + rogue_type;
        _getRogues(mist, path, (err, rogues) => {
            if (err) {
                _logError("Unable to retrieve rogues from " + mist.host + " for site " + site_id, err);
            } else if (rogues) {
                rogues.forEach(rogue_from_mist => {
                    rogues_collection
                        .findOne({ site_id: site_id, bssid: rogue_from_mist["bssid"] })
                        .exec((err, rogue_from_db) => {
                            if (err) {
                                _logError("Unable to retrieve rogue " + rogue["bssid"] + " (site " + site_id + ") from DB", err);
                            } else if (rogue_from_db) {
                                _updateRogue(rogue_type, rogue_from_db, rogue_from_mist, date);
                            } else {
                                _createRogue(site_id, rogue_type, rogue_from_mist, date, rogues_collection);
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
function _cleanRogues(date, rogues_collection) {
    var deadline = new Date().setDate(date.getDate() - global.config.history.max_age)
    rogues_collection
        .find({ last_seen: { $lt: deadline } })
        .exec((err, rogues) => {
            if (err) console.log(err)
            else if (rogues.length > 0) {
                rogues.forEach(rogue => {
                    rogue.remove();
                })
            }
        })
}


/**
 * Allows one to query the collection of user groups given query parameters as input
 * @param {Object} mist - API credentials
 * @param {String} mist.host - Mist Cloud to request
 * @param {String} mist.token - Mist API Token
 * @param {String} mist.org_id - Mist Org Id
 * @param {String} site_ids - List of Mist Site ID, or "all" for all the sites
 *  */
function _refreshRogues(mist, date, site_ids = [], all_sites = false) {
    const org_id = mist.org_id;
    const rogues_collection = Rogues_Collections(org_id)
    if (all_sites) {
        Sites.getSites(mist, (err, sites) => {
            if (err) {
                _logError("Unable to retrieve sites from " + mist.host + " for org " + mist.org_id, err);
            } else if (sites) {
                sites.forEach(site => {
                    _processSites(mist, site["id"], date, rogues_collection);
                    _updateRoguesNotSeen(rogues_collection, site["id"], date);
                })
            }
        })
    } else if (site_ids.length > 0) {
        site_ids.forEach(site_id => {
            _processSites(mist, site_id, date, rogues_collection)
            _updateRoguesNotSeen(rogues_collection, site_id, date);
        });
    }
    _cleanRogues(date, rogues_collection)
}



module.exports.run = function(hour) {
    const date = new Date();
    console.log(date)
    var hours = date.getUTCHours();
    var minutes = date.getUTCMinutes();
    // TODO: 
    //Accounts.find({ update_hour: hour, disabled: false })
    Accounts.find({ disabled: false, sync_time_utc: { hours: hours, minutes: minutes } })
        .populate("_token")
        .populate("_site")
        .exec((err, accounts) => {
            if (err) {
                _logError("Error when retriving the accounts during the new turn", err)
            } else if (accounts.length > 0) {
                accounts.forEach(account => {
                    if (!account._token || !account._token.apitoken) {
                        console.log('no token')
                            // TODO: disable site
                    } else if (!account._site || !account._site.configured) {
                        console.log('no site')
                            // TODO: disable site
                    } else if (account.disabled) {
                        console.log('disable')
                            // TODO: disable site
                    } else {
                        console.log('go')
                        const mist = {
                            host: account.host,
                            org_id: account.org_id,
                            token: account._token.apitoken
                        }
                        _refreshRogues(mist, date, account._site.site_ids, account._site.all_sites)
                        account.last_rogue_process = date;
                        account.save((err, account) => {
                            if (err) _logError("unable to update the last_rogue_process", err)
                        })
                    }
                })
            }
        })
}