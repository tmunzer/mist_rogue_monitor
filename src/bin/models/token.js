const mongoose = require('mongoose');

const TokenSchema = new mongoose.Schema({
    apitoken_id: { type: String, required: false },
    apitoken: { type: String, required: true },
    scope: { type: String, required: false },
    created_by: { type: String, required: false }
});

if (global.config.mongo.encKey && global.config.mongo.sigKey) {
    const encrypt = require('mongoose-encryption');
    TokenSchema.plugin(encrypt, { encryptionKey: global.config.mongo.encKey, signingKey: global.config.mongo.sigKey });
}

const Token = mongoose.model('Token', TokenSchema);


module.exports = Token;