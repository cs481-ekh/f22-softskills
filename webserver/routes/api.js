"use strict";
const express = require("express");
let router = express.Router();

router
  .route("/handleGetFiles")
  .get((req, res) => {})
  .post((req, res) => {});

router
  .route("/handleGetPermissions")
  .get((req, res) => {})
  .post((req, res) => {});

router
  .route("/handleDeletePermission")
  .get((req, res) => {})
  .post((req, res) => {});

router
  .route("/handleAddPermission")
  .get((req, res) => {})
  .post((req, res) => {});


module.exports = router;
