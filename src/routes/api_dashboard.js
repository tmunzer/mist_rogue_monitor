/*================================================================
ADMIN:
- ACS Oauth (to authenticate administrators)
- Display Admin Web page
 ================================================================*/
var express = require('express');
var router = express.Router();
var Account = require('../bin/models/account');
var Sites = require("../bin/mist_site");
var Rogues_Collections = require('../bin/models/rogue');

const rbac = require("../bin/mist_check_rbac")
    /*================================================================
     LOG IN
     ================================================================*/

router.get("/account/:org_id", (req, res) => {
    rbac.check_org_access(req, res, (err, req) => {
        if (err) err.send()
        else {
            Account
                .findOne({ org_id: req.session.mist.org_id, host: req.session.mist.host })
                .populate("_alert")
                .populate("_site")
                .exec((err, account) => {
                    var configured = false;
                    if (err) res.status(500).json(err)
                    else if (!account) res.status(404).send()
                    else if (!account._site || !account._site.configured) res.status(404).send()
                    else if (!account._token) res.status(404).send()
                    else {
                        configured = true;
                        data = {
                            last_rogue_process: account.last_rogue_process,
                            errors: account.errors,
                            disabled: account.disabled,
                            configured: configured,
                            sync_time_utc: account.sync_time_utc,
                            min_age: 1
                        }
                        if (account._alert) data.min_age = account._alert.min_age
                        res.json(data)
                    }
                })
        }
    })
});

function checkRogue(rogue_types, rogue, datasets, data, date) {
    // If the AP has been seen during last check
    // add it on the list
    data.rogues.push({
            site_id: rogue.site_id,
            bssid: rogue.bssid,
            ssid: rogue.ssid[rogue.ssid.length - 1].value,
            channel: rogue.channel[rogue.channel.length - 1].value,
            avg_rssi: rogue.avg_rssi[rogue.avg_rssi.length - 1].value,
            duration: date - rogue.first_seen,
            first_seen: rogue.first_seen,
            last_seen: rogue.last_seen,
            rogue_type: rogue.rogue_type
        })
        // add the AP to the AP count per days
    rogue_types.forEach(rogue_type => {
        if (rogue.rogue_type[rogue_type]) {
            // test to remove the rogues from the "others" category
            if (rogue_type != "others" || (!rogue.rogue_type["lan"] && !rogue.rogue_type["honeypot"] && !rogue.rogue_type["spoof"])) {
                delta_done = [];
                rogue.avg_rssi.forEach(rssi => {
                    // How many days in the past was the ts
                    var delta = date - rssi.ts;
                    var delta_days = parseInt(delta / (3600 * 24 * 1000));
                    if (!delta_done.includes(delta_days)) {
                        // add +1 to (last entry - delta_days)                
                        datasets[rogue_type][30 - delta_days] = datasets[rogue_type][30 - delta_days] + 1;
                        delta_done.push(delta_days)
                    }
                })
            }
        }
    })
}

router.get("/stats/:org_id", (req, res) => {
    rbac.check_org_access(req, res, (err, req) => {
        if (err) err.send()
        else {
            Account
                .findOne({ org_id: req.session.mist.org_id, host: req.session.mist.host })
                .exec((err, account) => {
                    if (err) { res.status(500).json(err) } else if (account) {
                        const rogues_collection = Rogues_Collections(req.session.mist.org_id)

                        rogues_collection
                            .find({})
                            .exec((err, rogues) => {
                                if (err) { res.status(500).json(err) } else if (rogues) {
                                    const rogue_types = ["lan", "honeypot", "spoof", "others"];
                                    const colors = { "lan": "#0097a5", "honeypot": "#85b332", "spoof": "#e46b00", "others": "#aaaaaa" }

                                    const date = new Date();
                                    var data = {
                                        lan: { now: 0, last_week: 0 },
                                        honeypot: { now: 0, last_week: 0 },
                                        spoof: { now: 0, last_week: 0 },
                                        others: { now: 0, last_week: 0 },
                                        rogues: [],
                                        datasets: [],
                                        labels: []
                                    }
                                    var datasets = {
                                        lan: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
                                        honeypot: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
                                        spoof: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
                                        others: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
                                    }

                                    for (var i = 0; i <= 30; i++) {
                                        data.labels.push(new Date().setDate(date.getDate() - (30 - i)))
                                    }

                                    rogues.forEach(rogue => {
                                        checkRogue(rogue_types, rogue, datasets, data, date);
                                    })

                                    // put all the data into the response dict
                                    rogue_types.forEach(rogue_type => {
                                        data[rogue_type]['now'] = datasets[rogue_type][datasets[rogue_type].length - 1]
                                        data[rogue_type]['last_week'] = datasets[rogue_type][datasets[rogue_type].length - 8]
                                        data.datasets.push({ label: rogue_type, data: datasets[rogue_type], backgroundColor: "rgba(0,0,0,0)", pointBackgroundColor: colors[rogue_type], borderColor: colors[rogue_type], pointBorderColor: colors[rogue_type], pointHoverBorderColor: colors[rogue_type], pointHoverBackgroundColor: colors[rogue_type] })
                                    })
                                    res.json(data)
                                }
                            })
                    }
                })
        }
    })
});

router.get("/sites/:org_id", (req, res) => {
    rbac.check_org_access(req, res, (err, req) => {
        if (err) err.send()
        else {
            Account
                .findOne({ host: req.session.mist.host, org_id: req.session.mist.org_id })
                .populate("_token")
                .exec((err, account) => {
                    if (err) res.status(500).json({ error: err })
                    else if (!account) res.status(404).json({ err: "Account not found" })
                    else {
                        if (!account._token) res.status(404).json({ err: "Account not configured" })
                        else if (!account._token.apitoken) res.status(404).json({ err: "API Token not configured" })
                        else {
                            const mist = {
                                host: req.session.mist.host,
                                org_id: req.session.mist.org_id,
                                token: account._token.apitoken
                            }
                            Sites.getSites(mist, (err, sites) => {
                                if (err) res.status(500).json({ error: err })
                                else {
                                    var data = {};
                                    sites.forEach(site => {
                                        data[site.id] = site.name
                                    })
                                    res.json(data)
                                }
                            })
                        }
                    }
                })
        }
    })
})

module.exports = router;