var mongoose = require('mongoose');

const RogueSchema = new mongoose.Schema({
    site_id: { type: String, required: true },
    rogue_type: { type: String, required: true },
    ssid: { type: String, required: false },
    bssid: { type: String, required: true },
    channel: { type: Number, required: true },
    avg_rssi: { type: Number, required: true },
    num_aps: { type: Number, required: true },
    delta_x: { type: Number, required: false },
    delta_y: { type: Number, required: false },
    first_seen: { type: Number, required: true },
    last_seen: { type: Number, required: true },
    history: [{
        update: { type: Number, required: true },
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
const models = {};
module.exports.getModel = function(org_id) {
    if (!(collectionName in models)) {
        models[org_id] = mongoose.model('org.' + org_id, RogueSchema);

    }
    return models[collectionName];
};