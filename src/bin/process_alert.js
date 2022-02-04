const nodemailer = require("nodemailer")
const fs = require('fs')
const Rogue_Collections = require("./models/rogue")
const mist_site = require("./mist_site")
const logger = require("./../logger")

function _generateTable(sites, host, org_id, rogues, rogue_type, duration_text) {
    const rogue_name = {
        "lan": "Rogue",
        "honeypot": "Honeypot",
        "spoof": "Spoof",
        "others": "Neighbor"
    }
    var table = `<tr>
                    <td colspan="3" style="text-align: left; height: 3em; vertical-align: bottom;">
                        <b>{ap_string}</b> have been detected for more than {duration}:
                    </td>
                </tr>
                <tr style="border: 1px solid black">
                    <th style="padding-top: 1em; text-align: start; width: 6em; border-bottom: 1px solid;">
                        Site
                    </th>
                    <th style="padding-top: 1em; text-align: start; width: 6em; border-bottom: 1px solid;">
                        SSID
                    </th>
                    <th style="padding-top: 1em; text-align: start; width: 6em; border-bottom: 1px solid;">
                        BSSID
                    </th>
                </tr>`
    const temp = `
    <tr style="border: 1px solid black">
        <td style="padding-right: 1em; border-bottom: 1px solid;"><a href="{url}" taget="_blank">{site}</a></td>
        <td style="padding-right: 1em; border-bottom: 1px solid;">{ssid}</td>
        <td style="padding-right: 1em; border-bottom: 1px solid;">{bssid}</td>
    </tr>`;
    var count = 0;
    rogues.forEach(rogue => {
        if (rogue.rogue_type[rogue_type]) {
            count += 1;
            var site = sites[rogue["site_id"]]
            var url = "https://" + host.replace("api", "manage") + "/admin/?org_id=" + org_id + "#!security/" + rogue["site_id"]
            var ssids = [];
            rogue.ssid.forEach(ssid => {
                if (ssid.value && ssids.indexOf(ssid.value) < 0) {
                    ssids.push(ssid.value)
                }
            })
            table += temp
                .replace("{url}", url)
                .replace("{site}", site)
                .replace("{ssid}", ssids.join(", "))
                .replace("{bssid}", rogue["bssid"])
        }
    })
    if (count == 0) {
        return "";
    } else if (count == 1) {
        var ap_string = count + " " + rogue_name[rogue_type] + " AP";
    } else {
        var ap_string = count + " " + rogue_name[rogue_type] + " APs";
    }

    table = table
        .replace("{ap_string}", ap_string)
        .replace("{duration}", duration_text);

    return table;
}

function _generateEmail(duration, rogues, sites, host, org_name, org_id, cb) {
    logger.info("account " + org_id + " - email generation started")
    var duration_text = ""
    var table = ""

    if (duration <= 1) duration_text = duration + " day"
    else duration_text = duration + " days"

    table += _generateTable(sites, host, org_id, rogues, "lan", duration_text)
    table += _generateTable(sites, host, org_id, rogues, "honeypot", duration_text)
    table += _generateTable(sites, host, org_id, rogues, "spoof", duration_text)
    table += _generateTable(sites, host, org_id, rogues, "others", duration_text)

    fs.readFile(global.appPath + '/template.html', (err, data) => {
        if (err) {
            logger.error(err)
            cb(err)
        } else {
            data = data.toString()
                .replace("{title}", global.config.smtp.subject)
                .replace("{logo}", config.smtp.logo_url)
                .replace("{org_name}", org_name)
                .replace("{org_id}", org_id)
                .replace("{rogue_tables}", table)
            logger.info("account " + org_id + " - email generation done")
            cb(null, data)
        }
    })

}

function _send(to_emails, duration, rogues, sites, host, org_name, org_id, cb) {
    var smtp = nodemailer.createTransport({
        host: global.config.smtp.host,
        port: global.config.smtp.port,
        secure: global.config.smtp.secure,
        auth: global.config.smtp.auth,
        tls: global.config.smtp.tls
    });

    _generateEmail(duration, rogues, sites, host, org_name, org_id, (err, html) => {
        if (html) {
            var message = {
                from: global.config.smtp.from_name + " <" + global.config.smtp.from_email + ">",
                to: to_emails,
                subject: global.config.smtp.subject,
                html: html
            };
            logger.info("account " + org_id + " - email is goind to be sent")
            smtp.sendMail(message, cb)
        }
    })
};

function _get_new_rogue_list(neighbors, org_id, min_age, cb) {
    logger.info("account " + org_id + " - retrieving rogues newly detected")
    var rogue_list = [];
    const date = new Date().setDate(new Date().getDate() - min_age);
    const rogues_collection = Rogue_Collections(org_id);
    rogues_collection
        .find({ first_seen: { $gt: 0, $lte: date }, email_sent: 0 })
        .exec((err, rogues) => {
            if (err) {
                logger.error("account " + org_id + " - unable to retrieve the list of rogues");
                logger.error(err);
                cb(err);
            } else if (!rogues) {
                logger.info("account " + org_id + " - no rogues retrieved")
                cb();
            } else {
                if (neighbors) {
                    rogue_list = rogues
                } else {
                    rogues.forEach(rogue => {
                        if (rogue.rogue_type.lan || rogue.rogue_type.honeypot || rogue.rogue_type.spoof) {
                            rogue_list.push(rogue)
                        }
                    })
                }
                logger.info("account " + org_id + " - got " + rogue_list.length + " rogues");
                cb(null, rogue_list)
            }
        })
}

function _get_sites_names(mist, cb) {
    logger.info("account " + mist.org_id + " - retrieving site names for email generation")
    var sites_dict = {}
    mist_site.getSites(mist, (err, sites) => {
        if (err) {
            logger.error("account " + mist.org_id + " - unable to retrieve site names for email generation");
            logger.error(err);
            cb(err);
        } else if (!sites || sites.length == 0) {
            logger.warning("account " + mist.org_id + " - no site retrieved")
            cb();
        } else {
            logger.info("account " + mist.org_id + " - got " + sites.length + " sites");
            sites.forEach(site => {
                sites_dict[site["id"]] = site["name"];
            })
            cb(null, sites_dict)
        }
    })
}

function _update_rogues(rogues) {
    const date = Date.now()
    rogues.forEach(rogue => {
        rogue.email_sent = date;
        rogue.save(err => {
            if (err) logger.error(err)
        })
    })
}

module.exports.run = function(account) {
    _get_new_rogue_list(account._alert.neighbors, account.org_id, account._alert.min_age, (err, rogues) => {
        if (err) logger.error(err)
        else if (rogues && rogues.length > 0) {
            _get_sites_names({ host: account.host, token: account._token.apitoken, org_id: account.org_id }, (err, sites) => {
                if (err) logger.error(err)
                else if (sites) _send(account._alert.to_emails, account._alert.min_age, rogues, sites, account.host, account.org_name, account.org_id, err => {
                    if (err) logger.errorg(err)
                    else {
                        logger.info("account " + account.org_id + " - email sent to " + account._alert.to_emails);
                        _update_rogues(rogues)
                    }
                })
            })
        }
    })
}