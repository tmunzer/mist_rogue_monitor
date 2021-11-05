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

/*================================================================
 LOG IN
 ================================================================*/

router.get("/account", (req, res) => {
    if (!req.session || !req.session.mist) { res.status(401).send() } else {
        Account
            .findOne({ org_id: req.session.mist.org_id, host: req.session.mist.host })
            .exec((err, account) => {
                if (err) { res.status(500).json(err) } else if (account) {
                    data = {
                        last_rogue_process: account.last_rogue_process,
                        errors: account.errors,
                        disabled: account.disabled
                    }
                    res.json(data)
                }
            })
    }
});

router.get("/stats", (req, res) => {
    if (!req.session || !req.session.mist) { res.status(401).send() } else {
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
                                const dates_array = ["now_minus_7d", "now_minus_6d", "now_minus_5d", "now_minus_4d", "now_minus_3d", "now_minus_2d", "now_minus_1d"]
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
                                    // If the AP has been seen during last check
                                    if (rogue.last_seen == account.last_rogue_process) {
                                        // add it on the list
                                        data.rogues.push({
                                            site_id: rogue.site_id,
                                            ssid: rogue.ssid,
                                            bssid: rogue.bssid,
                                            channel: rogue.channel,
                                            avg_rssi: rogue.avg_rssi,
                                            duration: rogue.last_seen - rogue.first_seen,
                                            first_seen: rogue.first_seen,
                                            rogue_type: rogue.rogue_type
                                        })
                                        rogue_types.forEach(rogue_type => {
                                            if (rogue.rogue_type[rogue_type]) {
                                                datasets[rogue_type][datasets[rogue_type].length - 1] = datasets[rogue_type][datasets[rogue_type].length - 1] + 1;
                                            }
                                        })
                                    }

                                    // for all the APs (even the APs not seen during the last check) add the AP in the last days counters
                                    rogue_types.forEach(rogue_type => {
                                        if (rogue.rogue_type[rogue_type]) {
                                            for (var i = 0; i <= 30; i++) {
                                                var d = data.labels[i]
                                                if (rogue.first_seen < d && rogue.last_seen > d) {
                                                    datasets[rogue_type][i] = datasets[rogue_type][i] + 1;
                                                }
                                            }
                                        }
                                    })
                                })

                                // put all the data into the response dict
                                rogue_types.forEach(rogue_type => {
                                    data[rogue_type]['now'] = datasets[rogue_type][datasets[rogue_type].length - 1]
                                    data[rogue_type]['last_week'] = datasets[rogue_type][datasets[rogue_type].length - 8]
                                    data.datasets.push({ label: rogue_type, data: datasets[rogue_type], backgroundColor: "rgba(0,0,0,0)", pointBackgroundColor: colors[rogue_type], borderColor: colors[rogue_type], pointBorderColor: colors[rogue_type] })
                                })
                                res.json(data)
                            }
                        })
                }
            })

    }
});

router.get("/sites", (req, res) => {
    if (!req.session || !req.session.mist) { res.status(401).send() } else {
        Account
            .findOne({ host: req.session.mist.host, org_id: req.session.mist.org_id })
            .populate("_token")
            .exec((err, account) => {
                if (err) res.status(500).json({ error: err })
                else if (!account) es.status(400).json({ err: "Account not found" })
                else {
                    if (!account._token) res.status(400).json({ err: "Account not configured" })
                    else if (!account._token.apitoken) res.status(400).json({ err: "API Token not configured" })
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

module.exports = router;