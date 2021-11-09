/**
 * 
 * @param {*} req 
 * @param {*} res 
 * @param {*} cb 
 */
module.exports.check_org_access = function(req, res, cb) {
    done = false;
    if (!req.session || !req.session.mist) {
        done = true;
        cb(res.status(401), null);
    } else if (!req.session.self || !req.session.self.privileges || req.session.self.privileges.length == 0) {
        done = true;
        cb(res.status(403), null);
    } else {
        req.session.self.privileges.forEach(privilege => {
            if (privilege.scope == "org" && privilege.org_id == req.params.org_id) {
                req.session.mist.org_id = req.params.org_id;
                done = true
                cb(null, req)
            }
        })
    }
    if (!done) cb(res.status(403), null)
}