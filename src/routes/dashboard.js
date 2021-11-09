/*================================================================
LOGIN:
Generate the generic or unique login page based on the URL params
================================================================*/
var express = require('express');
var router = express.Router();

/*================================================================
ROUTES
================================================================*/
// when the user load the unique login page
router.get("/", (req, res) => {
    res.sendFile(global.appPath + '/views/index.html');
});
router.get("/login", (req, res) => {
    res.sendFile(global.appPath + '/views/index.html');
});
router.get("/orgs", (req, res) => {
    res.sendFile(global.appPath + '/views/index.html');
});
router.get("/orgs/:org_id", (req, res) => {
    res.sendFile(global.appPath + '/views/index.html');
});
router.get("/orgs/:org_id/dashboard", (req, res) => {
    res.sendFile(global.appPath + '/views/index.html');
});
router.get("/orgs/:org_id/config", (req, res) => {
    res.sendFile(global.appPath + '/views/index.html');
});

module.exports = router;