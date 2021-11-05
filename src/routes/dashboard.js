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
    res.sendFile(global.appPath + '/views/admin.html');
});
router.get("/login", (req, res) => {
    res.sendFile(global.appPath + '/views/admin.html');
});
router.get("/org", (req, res) => {
    res.sendFile(global.appPath + '/views/admin.html');
});
router.get("/config", (req, res) => {
    res.sendFile(global.appPath + '/views/admin.html');
});

module.exports = router;