const express = require('express');
const app = express();
const session = require('express-session');
const fetch = require('node-fetch');

app.use(session({
  resave: false,
  saveUninitialized: true,
  secret: 'SECRET'
}));

app.get('/', function(req, res) {
  res.render('pages/auth');
});

const port = 3000;

/*  PASSPORT SETUP  */

const passport = require('passport');
var userProfile;

app.use(passport.initialize());
app.use(passport.session());

app.set('view engine', 'ejs');

app.get('/success', async (req, res) => {
    let fileList = await handleGetFiles(duhToken);
    res.render('index', {array: fileList.files});

});
app.get('/error', (req, res) => res.send("error logging in"));

passport.serializeUser(function(user, cb) {
  cb(null, user);
});

passport.deserializeUser(function(obj, cb) {
  cb(null, obj);
});

/*  Google AUTH  */
const {authenticate} = require('@google-cloud/local-auth');
const {google} = require('googleapis');
let duhToken;
const GoogleStrategy = require('passport-google-oauth').OAuth2Strategy;
const GOOGLE_CLIENT_ID = '480000320991-3h6eq67pprqjk6so5m5ajmgvls8b5sbe.apps.googleusercontent.com';
const GOOGLE_CLIENT_SECRET = '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';
const GOOGLE_API_KEY = 'AIzaSyBBPLkIsanFxwBIKSwhi9bVGd9okmYFs4o';
passport.use(new GoogleStrategy({
    clientID: GOOGLE_CLIENT_ID,
    clientSecret: GOOGLE_CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/callback"
  },
  function(accessToken, refreshToken, profile, done) {
      userProfile=profile;
      duhToken = accessToken;
      return done(null, userProfile);
  }
));

async function handleGetFiles(accessToken){
    const url = `https://www.googleapis.com/drive/v3/files?supportsAllDrives=true&includeItemsFromAllDrives=true&key=${GOOGLE_API_KEY}`;
    const method = 'GET';
    const headers = {
        'Authorization': `Bearer ${accessToken}`,
        "Accept": "application/json"
    }
    const request = await fetch(url, {method, headers})
    const response = await request.json();
    return response;
}
app.get('/login', (req, res) => {
    var name = 'test'
    res.render('login', {name});
})
app.get('/auth/google',
  passport.authenticate('google', { scope : ['profile', 'email', 'https://www.googleapis.com/auth/drive'] }));

app.get('/auth/google/callback',
  passport.authenticate('google', { failureRedirect: '/error' }),
  function(req, res) {
    // Successful authentication, redirect success.
    console.log(req.session.passport);
    res.redirect('/success');
  });

app.listen(port , () => console.log('App listening on port ' + port));