const nodemailer = require("nodemailer")
const fs = require('fs')
const Account = require("./models/account")
const Rogue_Collections = require("./models/rogue")
const mist_site = require("./mist_site")

function generateEmail(duration, rogues, sites, host, org_name, org_id, cb) {
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
        table = table + temp
            .replace("{url}", url)
            .replace("{site}", site)
            .replace("{ssid}", rogue["ssid"])
            .replace("{bssid}", rogue["bssid"])
            .replace("{lan}", rogue["rogue_type"]["lan"])
            .replace("{honeypot}", rogue["rogue_type"]["honeypot"])
            .replace("{spoof}", rogue["rogue_type"]["spoof"])

    })
    fs.readFile(global.appPath + '/template.html', (err, data) => {
        if (err) {
            console.error(err)
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

function send(to_emails, duration, rogues, sites, host, org_name, org_id, cb) {
    var smtp = nodemailer.createTransport({
        host: global.config.smtp.host,
        port: global.config.smtp.port,
        secure: global.config.smtp.secure,
        auth: global.config.smtp.auth,
        tls: global.config.smtp.tls
    });

    generateEmail(duration, rogues, sites, host, org_name, org_id, (err, html) => {
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

function get_new_rogue_list(org_id, min_age, cb) {
    var rogue_list = [];
    const date = new Date().setDate(new Date().getDate() - min_age);
    const rogues_collection = Rogue_Collections(org_id);
    rogues_collection
        .find({ first_seen: { $lte: date }, email_sent: 0 })
        .exec((err, rogues) => {
            if (err) cb(err)
            else if (!rogues) cb()
            else {
                rogues.forEach(rogue => {
                    if (rogue.rogue_type.lan || rogue.rogue_type.honeypot || rogue.rogue_type.spoof) {
                        rogue_list.push(rogue)
                    }
                })
                cb(null, rogue_list)
            }
        })
}

function get_sites_names(mist, cb) {
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

function update_rogues(rogues) {
    const date = Date.now()
    rogues.forEach(rogue => {
        rogue.email_sent = date;
        rogue.save(err => {
            if (err) console.log(err)
        })
    })
}

module.exports.run = function() {
    Account
        .find({ disabled: false, _token: { $ne: null }, _alert: { $ne: null } })
        .populate("_alert")
        .populate("_token")
        .exec((err, accounts) => {
            if (err) console.log(err)
            else if (accounts) {
                accounts.forEach(account => {
                    if (account._alert.enabled && account._alert.to_emails.length > 0) {
                        get_new_rogue_list(account.org_id, account._alert.min_age, (err, rogues) => {
                            if (err) console.log(err)
                            else if (rogues && rogues.length > 0) {
                                get_sites_names({ host: account.host, token: account._token.apitoken, org_id: account.org_id }, (err, sites) => {
                                    if (err) console.log(err)
                                    else if (sites) send(account._alert.to_emails, account._alert.min_age, rogues, sites, account.host, account.org_name, account.org_id, err => {
                                        if (err) console.log(err)
                                        else {
                                            console.log("EMAIL SENT TO " + account._alert.to_emails)
                                            update_rogues(rogues)
                                        }
                                    })
                                })
                            }
                        })
                    }
                })
            }
        })
}