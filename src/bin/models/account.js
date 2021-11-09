const mongoose = require('mongoose');

const AccountSchema = new mongoose.Schema({
    host: { type: String, required: true },
    org_id: { type: String, required: true },
    org_name: { type: String, required: true },
    last_rogue_process: { type: Number, required: false },
    errors: [{
        time: { type: Number },
        message: { type: String }
    }],
    disabled: { type: Boolean, default: false },
    update_hour: { type: String },
    _token: { type: mongoose.Schema.ObjectId, ref: "Token" },
    _site: { type: mongoose.Schema.ObjectId, ref: "Site" },
    _alert: { type: mongoose.Schema.ObjectId, ref: "Alert" }
});


const Account = mongoose.model('Account', AccountSchema);


module.exports = Account;