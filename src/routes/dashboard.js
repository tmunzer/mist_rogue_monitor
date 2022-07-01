/*================================================================
LOGIN:
Generate the generic or unique login page based on the URL params
================================================================*/
const express = require('express');
const router = express.Router();

/*================================================================
ROUTES
================================================================*/
// when the user load the unique login page
router.get("/", (_req, res) => {
    res.sendFile(global.appPath + '/views/index.html');
});
router.get("/login", (_req, res) => {
    res.sendFile(global.appPath + '/views/index.html');
});
router.get("/orgs", (_req, res) => {
    res.sendFile(global.appPath + '/views/index.html');
});
router.get("/orgs/:org_id", (_req, res) => {
    res.sendFile(global.appPath + '/views/index.html');
});
router.get("/orgs/:org_id/dashboard", (_req, res) => {
    res.sendFile(global.appPath + '/views/index.html');
});
router.get("/orgs/:org_id/config", (_req, res) => {
    res.sendFile(global.appPath + '/views/index.html');
});

module.exports = router;