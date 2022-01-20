const mongoose = require('mongoose');

const AccountSchema = new mongoose.Schema({
    host: { type: String, required: true },
    org_id: { type: String, required: true },
    org_name: { type: String, required: true },
    last_rogue_process: { type: Number, required: false },
    disabled: { type: Boolean, default: false },
    sync_time_utc: {
        hours: { type: Number },
        minutes: { type: Number }
    },
    _token: { type: mongoose.Schema.ObjectId, ref: "Token" },
    _site: { type: mongoose.Schema.ObjectId, ref: "Site" },
    _alert: { type: mongoose.Schema.ObjectId, ref: "Alert" }
});


const Account = mongoose.model('Account', AccountSchema);


module.exports = Account;