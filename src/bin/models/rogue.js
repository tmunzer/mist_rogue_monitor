var mongoose = require('mongoose');

function dynamicSchema(org_id) {
    var RogueSchema = new mongoose.Schema({
        site_id: { type: String, required: true },
        rogue_type: {
            lan: { type: Boolean, default: false },
            honeypot: { type: Boolean, default: false },
            spoof: { type: Boolean, default: false },
            others: { type: Boolean, default: false },
        },
        bssid: { type: String, required: true },
        ssid: [{ ts: Number, value: String }],
        ap_mac: [{ ts: Number, value: String }],
        channel: [{ ts: Number, value: Number }],
        avg_rssi: [{ ts: Number, value: Number }],
        num_aps: [{ ts: Number, value: Number }],
        delta_x: [{ ts: Number, value: Number }],
        delta_y: [{ ts: Number, value: Number }],
        first_seen: { type: Number, required: true },
        last_seen: { type: Number, required: true },
        created_at: { type: Number, required: true },
        updated_at: { type: Number, required: true },
        email_sent: { type: Number, required: false, default: 0 }
    });
    if (global.config.mongo.encKey && global.config.mongo.sigKey) {
        const encrypt = require('mongoose-encryption');
        RogueSchema.plugin(encrypt, { encryptionKey: global.config.mongo.encKey, signingKey: global.config.mongo.sigKey, excludeFromEncryption: ['site_id', 'bssid', 'email_sent', 'first_seen', 'last_seen', 'created_at', 'updated_at', 'missed_checks'] });
    }
    return mongoose.model('org.' + org_id, RogueSchema);
}

rogue_collections = {};

function get_rogue_collection(org_id) {
    if (!(org_id in this.rogue_collections)) {
        this.rogue_collections[org_id] = dynamicSchema(org_id);
    }
    return this.rogue_collections[org_id];
}

module.exports = get_rogue_collection;