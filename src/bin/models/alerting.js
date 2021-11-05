const mongoose = require('mongoose');

const AlertingSchema = new mongoose.Schema({
    to_email: [{ type: String }],
    min_age: { type: Number, required: false, default: 1 },
    min_rssi: { type: Number, required: false, default: -75 }
});

// if (global.config.mongo.encKey && global.config.mongo.sigKey) {
//     const encrypt = require('mongoose-encryption');
//     AlertingSchema.plugin(encrypt, { encryptionKey: global.config.mongo.encKey, signingKey: global.config.mongo.sigKey });
// }

const Alerting = mongoose.model('Alerting', AlertingSchema);


module.exports = Alerting;