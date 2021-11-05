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
        ssid: { type: String, required: false },
        bssid: { type: String, required: true },
        channel: { type: Number, required: true },
        avg_rssi: { type: Number, required: true },
        num_aps: { type: Number, required: true },
        delta_x: { type: Number, required: false },
        delta_y: { type: Number, required: false },
        first_seen: { type: Number, required: true },
        last_seen: { type: Number, required: true },
        last_updated: { type: Number, required: true },
        history: [{
            from: { type: Number, required: true },
            to: { type: Number, required: true },
            rogue_type: {
                lan: { type: Boolean, default: false },
                honeypot: { type: Boolean, default: false },
                spoof: { type: Boolean, default: false },
                others: { type: Boolean, default: false },
            },
            ssid: { type: String, required: false },
            channel: { type: Number, required: false },
            avg_rssi: { type: Number, required: false },
            num_aps: { type: Number, required: false },
            delta_x: { type: Number, required: false },
            delta_y: { type: Number, required: false }
        }]
    });
    // if (global.config.mongo.encKey && global.config.mongo.sigKey) {
    //     const encrypt = require('mongoose-encryption');
    //     RogueSchema.plugin(encrypt, { encryptionKey: global.config.mongo.encKey, signingKey: global.config.mongo.sigKey });
    // }
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