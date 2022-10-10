"use strict";
const express = require("express");
let router = express.Router();

router
  .route("/auth/google'")
  .get('/auth/google',
  passport.authenticate('google', { scope : ['profile', 'email', 'https://www.googleapis.com/auth/drive'] }))
  .post((req, res) => {});

router
  .route("/google/callback")
  .get((req, res) => { // Successful authentication, redirect success.
    console.log(req.session.passport);
    res.redirect('/success');})

module.exports = router;
