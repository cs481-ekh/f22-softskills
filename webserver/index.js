require("dotenv").config();
const DrivePermissionManager =
  require("../dist/drive-permission-manager/src/").default;
/* Express Configuration */
const port = process.env.PORT || 3000;
const express = require("express");
const app = express();
const session = require("express-session");
app.use(express.static("public")); // For custom style sheet
app.use(express.static("scripts")); // for custom typescript scripts
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

/*  PASSPORT SETUP  */
process.env.PASSPORT_SESSION_SECRET = require("crypto")
  .randomBytes(32)
  .toString("hex");
app.use(
  session({
    resave: true,
    saveUninitialized: true,
    secret: process.env.PASSPORT_SESSION_SECRET,
  })
);
const passport = require("passport");
app.use(passport.initialize());
app.use(passport.session());
app.set("view engine", "ejs");
passport.serializeUser(function (user, cb) {
  cb(null, user);
});
passport.deserializeUser(function (obj, cb) {
  cb(null, obj);
});

/*  Google AUTH  */
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;
const { authenticate } = require("@google-cloud/local-auth");
var { google } = require("googleapis"),
  OAuth2 = google.auth.OAuth2;
var oauth2Client = new OAuth2(
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  "http://localhost:3000/auth/google/callback"
);

const setOauth2ClientCredentials = (accessToken, refreshToken) => {
  oauth2Client.credentials = {
    access_token: accessToken,
    refresh_token: refreshToken,
  };
};
const GoogleStrategy = require("passport-google-oauth").OAuth2Strategy;
passport.use(
  new GoogleStrategy(
    {
      clientID: GOOGLE_CLIENT_ID,
      clientSecret: GOOGLE_CLIENT_SECRET,
      callbackURL: "http://localhost:3000/auth/google/callback",
    },
    function (accessToken, refreshToken, profile, done) {
      userProfile = profile;
      userProfile.accessToken = accessToken;
      userProfile.refreshToken = refreshToken;
      return done(null, userProfile);
    }
  )
);
let dbInitialized = false;
/* Middleware function for checking authentication / db initialization */
const checkForInit = async (req, res, next) => {
  // Check if user is authenticated to make any request
  if (req.isAuthenticated()) {
    if (!dbInitialized) {
      // Determine if this is the user account to populate the db with
      if (req.user._json.email != process.env.GDRIVE_EMAIL) {
        // Its not the right google drive account / email so redirect and let them know
        res.redirect(
          "/login?error=user-email-does-not-match-expected-initialization-email"
        );
      } else {
        setOauth2ClientCredentials(req.user.accessToken, req.user.refreshToken);
        const client = new DrivePermissionManager(oauth2Client);
        await client.initDb();
        dbInitialized = true;
        next();
      }
    }
    // Db already initialized and the user is authenticated so continue on with the request
    else {
      next();
    }
  } else {
    // Failed to authenticate the request so redirect to login route
    res.redirect("/login");
  }
};
/* GENERAL ROUTE HANDLING */
app.get("/", checkForInit, function (req, res) {
  if (req.isAuthenticated()) res.redirect("/success");
  else res.redirect("/login");
});

app.get("/login", (req, res) => {
  res.render("login");
});

app.get(
  "/auth/google",
  passport.authenticate("google", {
    scope: ["profile", "email", "https://www.googleapis.com/auth/drive"],
  })
);

app.get(
  "/auth/google/callback",
  passport.authenticate("google", { failureRedirect: "/error" }),
  function (req, res) {
    // Successful authentication, redirect success.
    console.log(req.session.passport);
    res.redirect("/success");
  }
);

app.get("/error", (req, res) => res.send("error logging in"));

/*  API CORE ROUTE HANDLING  */

// post login
app.get("/success", checkForInit, async (req, res) => {
  if (req.user && req.user.accessToken) {
    try {
      setOauth2ClientCredentials(req.user.accessToken, req.user.refreshToken);
      const client = new DrivePermissionManager(oauth2Client);
      const fileList = await client.getFiles();
      res.render("index", { array: fileList || [] });
    } catch (e) {
      console.log("ERROR", e);
      res.sendStatus(403);
    }
  } else res.redirect("/login");
});

// getFiles
app.get("/getFiles", checkForInit, async (req, res) => {
  if (req.isAuthenticated()) {
    try {
      setOauth2ClientCredentials(req.user.accessToken, req.user.refreshToken);
      const client = new DrivePermissionManager(oauth2Client);
      let fileList;
      if (req.query.fileIds)
        fileList = await client.getFiles([req.query.fileIds].flat());
      else fileList = await client.getFiles();
      res.json(fileList);
    } catch (e) {
      res.json(e);
      console.log(e);
    }
  } else {
    res.redirect("/login");
  }
});

// getPermission
app.get("/getPermissions", checkForInit, async (req, res) => {
  if (req.user && req.user.accessToken) {
    try {
      setOauth2ClientCredentials(req.user.accessToken, req.user.refreshToken);
      // console.log("req.query.fileId: " + JSON.stringify(req));
      const fileIds = req.query.fileIds;
      let retVal = [];
      const client = new DrivePermissionManager(oauth2Client);
      for (const fileId of fileIds) {
        let permissionsList = await client.getPermissions({ fileId });
        for (const permission of permissionsList) {
          retVal.push(permission);
        }
      }
      res.json(retVal);
    } catch (e) {
      console.log("ERROR", e);
      res.sendStatus(403);
    }
  } else res.redirect("/success");
});

// deletePermission
app.post("/deletePermission", checkForInit, async (req, res) => {
  if (req.isAuthenticated() && req.user && req.user.accessToken) {
    try {
      const { fileId, permissionId } = req.body;
      setOauth2ClientCredentials(req.user.accessToken, req.user.refreshToken);
      const client = new DrivePermissionManager(oauth2Client);
      try {
        await client.deletePermission(fileId, permissionId);
      } catch (error) {
        if (error.reason == "Failed to update db.") {
          res.sendStatus(500).json({ fileId, permissionId, error });
        } else res.sendStatus(400).json({ fileId, permissionId, error });
      }
    } catch (e) {
      res.json(e);
      console.log("ERROR", e);
    }
  } else res.redirect("/login");
});

// deletePermissions
app.post("/deletePermissions", checkForInit, async (req, res) => {
  if (req.isAuthenticated() && req.user && req.user.accessToken) {
    try {
      const { fileIds, permissionIds, emails } = req.body;
      setOauth2ClientCredentials(req.user.accessToken, req.user.refreshToken);
      const client = new DrivePermissionManager(oauth2Client);
      try {
        // returns an array of all updated files
        let files = await client.deletePermissions(fileIds, {
          permissionIds,
          emails,
        });
        res.json(files);
      } catch (error) {
        console.log("ERROR", error);
        if (error.reason == "Failed to update db.") {
          res.sendStatus(500).json({ fileIds, permissionIds, error });
        } else res.sendStatus(400).json({ fileIds, permissionIds, error });
      }
    } catch (e) {
      res.json(e);
      console.log("ERROR", e);
    }
  } else res.redirect("/login");
});

// addPermissions
app.post("/addPermission", checkForInit, async (req, res) => {
  if (req.user && req.user.accessToken) {
    try {
      const { fileId, role, granteeType, emails } = req.body;
      setOauth2ClientCredentials(req.user.accessToken, req.user.refreshToken);
      const client = new DrivePermissionManager(oauth2Client);
      const resVal = [];
      for (const email of emails) {
        resVal.push(
          await client.addPermission(fileId, role, granteeType, email)
        );
      }
      res.json(resVal);
    } catch (e) {
      res.json(e);
      console.log("ERROR", e);
    }
  } else res.sendStatus(401);
});

// returns array of updated file objects
app.post("/addPermissions", checkForInit, async (req, res) => {
  if (req.user && req.user.accessToken) {
    try {
      const { fileIds, role, granteeType, emails } = req.body;
      setOauth2ClientCredentials(req.user.accessToken, req.user.refreshToken);
      const dpmRes = await new DrivePermissionManager(
        oauth2Client
      ).addPermissions(fileIds, role, granteeType, emails);
      res.json(dpmRes);
    } catch (e) {
      res.json(e);
      console.error("ERROR", e);
    }
  } else res.sendStatus(401);
});

app.get("*", (req, res) =>
  res.send(
    `<h1>404</h1><image src="https://thumbs.gfycat.com/AccurateUnfinishedBergerpicard-size_restricted.gif">`
  )
);

app.listen(port, async () => {
  console.log("App listening on port " + port);
});
