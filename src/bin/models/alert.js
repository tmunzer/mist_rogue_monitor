const mongoose = require('mongoose');

const AlertSchema = new mongoose.Schema({
    to_emails: { type: [String], default: [] },
    min_age: { type: Number, required: false, default: 1 },
    enabled: { type: Boolean, default: false },
    configured: { type: Boolean, default: false }
});

if (global.config.mongo.encKey && global.config.mongo.sigKey) {
    const encrypt = require('mongoose-encryption');
    AlertSchema.plugin(encrypt, { encryptionKey: global.config.mongo.encKey, signingKey: global.config.mongo.sigKey });
}

const Alerting = mongoose.model('Alert', AlertSchema);


module.exports = Alerting;