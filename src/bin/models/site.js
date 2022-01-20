const mongoose = require('mongoose');

const SiteSchema = new mongoose.Schema({
    all_sites: { type: Boolean, default: false },
    site_ids: [{ type: String }],
    configured: { type: Boolean, default: false }
});

if (global.config.mongo.encKey && global.config.mongo.sigKey) {
    const encrypt = require('mongoose-encryption');
    SiteSchema.plugin(encrypt, { encryptionKey: global.config.mongo.encKey, signingKey: global.config.mongo.sigKey });
}

const Site = mongoose.model('Site', SiteSchema);


module.exports = Site;