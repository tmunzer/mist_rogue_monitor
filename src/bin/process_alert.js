const nodemailer = require("nodemailer")
const fs = require('fs')
const Rogue_Collections = require("./models/rogue")
const mist_site = require("./mist_site")
const logger = require("./../logger")

function _generateEmail(duration, rogues, sites, host, org_name, org_id, cb) {
    var table = ""
    const temp = `
    <tr>
    <td style="padding-right: 1em;"><a href="{url}" taget="_blank">{site}</a></td>
    <td style="padding-right: 1em;">{ssid}</td>
    <td style="padding-right: 1em;">{bssid}</td>
    <td style="padding-right: 1em;">{lan}</td>
    <td style="padding-right: 1em;">{honeypot}</td>
    <td>{spoof}</td>
    </tr>
    `
    rogues.forEach(rogue => {
        var site = sites[rogue["site_id"]]
        var url = "https://" + host.replace("api", "manage") + "/admin/?org_id=" + org_id + "#!security/" + rogue["site_id"]
        var ssids = [];
        rogue.ssid.forEach(ssid => {
            if (!ssids.includes(ssid)) {
                ssids.push(ssid.value)
            }
        })
        table = table + temp
            .replace("{url}", url)
            .replace("{site}", site)
            .replace("{ssid}", ssids.join(", "))
            .replace("{bssid}", rogue["bssid"])
            .replace("{lan}", rogue["rogue_type"]["lan"])
            .replace("{honeypot}", rogue["rogue_type"]["honeypot"])
            .replace("{spoof}", rogue["rogue_type"]["spoof"])

    })
    fs.readFile(global.appPath + '/template.html', (err, data) => {
        if (err) {
            logger.error(err)
            cb(err)
        } else {
            var duration_text = ""
            if (duration <= 1) duration_text = duration + " day"
            else duration_text = duration + " days"
            data = data.toString()
                .replace("{title}", global.config.smtp.subject)
                .replace("{logo}", config.smtp.logo_url)
                .replace("{duration}", duration_text)
                .replace("{org_name}", org_name)
                .replace("{org_id}", org_id)
                .replace("{rogues}", table)
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
            smtp.sendMail(message, cb)
        }
    })
};

function _get_new_rogue_list(neighbors, org_id, min_age, cb) {
    var rogue_list = [];
    const date = new Date().setDate(new Date().getDate() - min_age);
    const rogues_collection = Rogue_Collections(org_id);
    rogues_collection
        .find({ first_seen: { $gt: 0, $lte: date }, email_sent: 0 })
        .exec((err, rogues) => {
            if (err) cb(err)
            else if (!rogues) cb()
            else {
                if (neighbors) {
                    rogue_list = rogues
                } else {
                    rogues.forEach(rogue => {
                        if (rogue.rogue_type.lan || rogue.rogue_type.honeypot || rogue.rogue_type.spoof) {
                            rogue_list.push(rogue)
                        }
                    })
                }
                cb(null, rogue_list)
            }
        })
}

function _get_sites_names(mist, cb) {
    var sites_dict = {}
    mist_site.getSites(mist, (err, sites) => {
        if (err) cb(err);
        else if (!sites) cb();
        else {
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
                        logger.info("EMAIL SENT TO " + account._alert.to_emails)
                        _update_rogues(rogues)
                    }
                })
            })
        }
    })
}