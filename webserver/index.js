require('dotenv').config();
const express = require("express");
const app = express();
const session = require("express-session");
const fetch = require("node-fetch");
const DrivePermissionManager =
  require("../dist/drive-permission-manager/src/").default;
app.use(express.static("public")); // For custom style sheet
app.use(express.static("scripts")); // for custom typescript scripts
app.use(express.urlencoded({ extended: true }))
app.use(
  session({
    resave: true,
    saveUninitialized: true,
    secret: "SECRET",
  })
);
app.use(express.json())

const port = 3000;
async function startup() {

}

/*  PASSPORT SETUP  */

const passport = require("passport");
var userProfile;
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

const GOOGLE_CLIENT_ID =
  "480000320991-3h6eq67pprqjk6so5m5ajmgvls8b5sbe.apps.googleusercontent.com";
const GOOGLE_CLIENT_SECRET = "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";
const GOOGLE_API_KEY = "AIzaSyBBPLkIsanFxwBIKSwhi9bVGd9okmYFs4o";
const { authenticate } = require("@google-cloud/local-auth");
var { google } = require("googleapis"),
  OAuth2 = google.auth.OAuth2;
var oauth2Client = new OAuth2(
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  "http://localhost:3000/auth/google/callback"
);
const GoogleStrategy = require("passport-google-oauth").OAuth2Strategy;
const setOauth2ClientCredentials = (accessToken, refreshToken) => {
  oauth2Client.credentials = {
    access_token: accessToken,
    refresh_token: refreshToken,
  };
};
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

/* GENERAL ROUTE HANDLING */

app.get("/", function (req, res) {
  if (req.isAuthenticated()) res.redirect('/success');
  else res.redirect('/login');
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
app.get("/success", async (req, res) => {
  if (req.user && req.user.accessToken) {
    try {
      setOauth2ClientCredentials(req.user.accessToken, req.user.refreshToken);
      const client = new DrivePermissionManager(oauth2Client);
      // await client.initDb();
      const fileList = await client.getFiles();
      res.render("index", { array: fileList || [] });
    } catch (e) {
      console.log("ERROR", e);
      res.sendStatus(403);
    }
  } else res.redirect("/login");
});

// getFiles
app.get("/getFiles", async (req, res) => {
  if (req.isAuthenticated()) {
    try {
      setOauth2ClientCredentials(req.user.accessToken, req.user.refreshToken);
      const client = new DrivePermissionManager(oauth2Client);
      let fileList;
      if (req.query.fileIds) fileList = await client.getFiles([req.query.fileIds].flat())
      else fileList = await client.getFiles();
      res.json(fileList);
    } catch (e) {
      res.json(e);
      console.log(e);
    }
  }
  else {
    res.redirect('/login');
  }
});

// getPermissions
app.get("/getPermissions", async (req, res) => {
  if (req.user && req.user.accessToken) {
    try {
      setOauth2ClientCredentials(req.user.accessToken, req.user.refreshToken);
      const client = new DrivePermissionManager(oauth2Client);
      const permissionList = await client.getPermissions(s);
      console.log(JSON.stringify(permissionList));
      res.render("index", { array: permissionList || [] });
    } catch (e) {
      console.log("ERROR", e);
      res.sendStatus(403);
    }
  } else res.redirect("/success");
});

// deletePermissions
app.post("/deletePermission", async (req, res) => {
  if (req.isAuthenticated() && req.user && req.user.accessToken) {
    try {
      const { fileId, permissionId } = req.body;
      setOauth2ClientCredentials(req.user.accessToken, req.user.refreshToken);
      const client = new DrivePermissionManager(oauth2Client);
      try {
        await client.deletePermission(fileId, permissionId);
      }
      catch (error) {
        if (error.reason == "Failed to update db.") {
          res.sendStatus(500).json({ fileId, permissionId, error })
        }
        else res.sendStatus(400).json({ fileId, permissionId, error })
      }
    }
    catch (e) {
      res.json(e);
      console.log("ERROR", e);
    }
  }
  else res.redirect("/login");
});

// addPermissions
app.post("/addPermission", async (req, res) => {
  if (req.user && req.user.accessToken) {
    try {
      const { fileId, role, granteeType, emails } = req.body;
      setOauth2ClientCredentials(req.user.accessToken, req.user.refreshToken);
      const client = new DrivePermissionManager(oauth2Client);
      const resVal = [];
      for (const email of emails) {
        resVal.push(await client.addPermission(fileId, role, granteeType, email));
      }
      res.json(resVal);
    }
    catch (e) {
      res.json(e);
      console.log("ERROR", e);
    }
  }
  else res.sendStatus(401);
});

app.get('*', (req, res) => res.send(`<h1>404</h1><image src="https://thumbs.gfycat.com/AccurateUnfinishedBergerpicard-size_restricted.gif">`));
app.listen(port, async () => {
  await startup();
  console.log("App listening on port " + port);
});
