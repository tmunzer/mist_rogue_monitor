const express = require('express');
const router = express.Router();
const api = require("../bin/req");
const logger = require("../logger")
const Rogues_Collections = require('../bin/models/rogue');
const rbac = require("../bin/mist_check_rbac");
const request = require("request")

function _getMap_id(mist, rogue, cb) {
    ap_mac = rogue.ap_mac[rogue.ap_mac.length - 1].value;
    const path = "/api/v1/sites/" + rogue.site_id + "/devices/00000000-0000-0000-1000-" + ap_mac;
    api.GET(mist, path, (err, data) => {
        if (err) {
            logger.error("unable to get the AP details");
            logger.error(err);
            cb(500, "unable to get the AP details");
        } else {
            const map_id = data.map_id;
            const ap_position = {
                x: data.x,
                y: data.y
            }
            _getMapDetails(mist, rogue, map_id, ap_position, cb);
        }
    })
}

function _getMapDetails(mist, rogue, map_id, ap_position, cb) {
    const path = "/api/v1/sites/" + rogue.site_id + "/maps/" + map_id;
    api.GET(mist, path, (err, data) => {
        if (err) {
            logger.error("unable to get the Map details");
            logger.error(err);
            cb(500, "unable to get the Map details");
        } else if (data) {
            var map_info = {
                name: data.name,
                height: 0,
                width: 0,
                origin_x: 0,
                origin_y: 0,
                url: ""
            };
            if (data.url) {
                map_info.height = data.height;
                map_info.width = data.width;
                map_info.origin_x = data.origin_x;
                map_info.origin_y = data.origin_y;
                map_info.url = data.url;
                cb(200, { rogue: rogue, ap_position: ap_position, map_info: map_info });
            } else {
                cb(200, { rogue: rogue, ap_position: ap_position, map_info: map_info });
            }
        } else {
            cb(404, 'map is not configured');
        }
    })
}

router.post("/:org_id/image", (req, res) => {
    const full_path = req.body.url;
    request.get(full_path).pipe(res);
})

router.get("/:org_id/rogue/:bssid", (req, res) => {
    rbac.check_org_access(req, res, (err, req) => {
        if (err) err.send()
        else {
            const rogues_collection = Rogues_Collections(req.session.mist.org_id);
            rogues_collection
                .find({ bssid: req.params.bssid })
                .exec((err, rogues) => {
                    if (err) {
                        logger.error("Error when trying to find bssid " + req.params.bssid + " for org_id " + req.session.mist.org_id);
                        res.status(500).send();
                    } else if (rogues.length == 0) {
                        logger.error("Not able to find bssid " + req.params.bssid + " for org_id " + req.session.mist.org_id);
                        res.status(404).send();
                    } else if (rogues.length > 1) {
                        logger.error("Too many results for bssid " + req.params.bssid + " for org_id " + req.session.mist.org_id);
                        res.status(500).send();
                    } else {
                        const mist = {
                            host: req.session.mist.host,
                            org_id: req.session.mist.org_id,
                            cookie: req.session.mist.cookie
                        }
                        _getMap_id(mist, rogues[0], (status, json) => {
                            res.status(status).json(json);
                        })
                    }
                })
        }
    })
})
module.exports = router;