var express = require('express');
var passport = require('passport');
var Strategy = require('passport-local').Strategy;
var FacebookStrategy = require('passport-facebook').Strategy;
var db = require('./db');
var connect = require('connect-ensure-login');

passport.use(new Strategy(
    function(username, password, cb) {
        db.users.findByUsername(username, function(err, user) {
            if (err) { return cb(err); }
            if (!user) { return cb(null, false); }
            if (user.type != "Local") { return cb(null, false); }
            if (user.password != password) { return cb(null, false); }
            return cb(null, user);
        });
    })
);

passport.use(new FacebookStrategy({
    clientID: "387146781677625",
    clientSecret: "43da58bad70251cce0db1a0a48f3f52d",
    callbackURL: "http://127.0.0.1:8080/auth/facebook/callback"
    }, function(token, refreshToken, profile, done) {
            // asynchronous
            process.nextTick(function() {
                // find the user in the database based on their facebook id
                db.users.findByUsername(profile.id, function(err, user) {

                    // if there is an error, stop everything and return that
                    if (err)
                        return done(err);

                    // if the user is found, then log them in
                    // Don't log in if the id matches but the wront type of user
                    if (user) {
                        if (user.type != "Facebook") {
                            return done(null, false);
                        } else {
                            return done(null, user); // user found, return that user
                        }
                    } else {
                        return done(null, false);
                    }

                });
            });
    })
);

// Configure Passport authenticated session persistence.
//
// In order to restore authentication state across HTTP requests, Passport needs
// to serialize users into and deserialize users out of the session.  The
// typical implementation of this is as simple as supplying the user ID when
// serializing, and querying the user record by ID from the database when
// deserializing.
passport.serializeUser(function(user, cb) {
    cb(null, user.id);
});

passport.deserializeUser(function(id, cb) {
    db.users.findById(id, function (err, user) {
        if (err) { return cb(err); }
        cb(null, user);
    });
});

// Create a new Express application.
var app = express();

// Use application-level middleware for common functionality, including
// logging, parsing, and session handling.
app.use(require('morgan')('combined'));
app.use(require('cookie-parser')());
app.use(require('body-parser').urlencoded({ extended: true }));
app.use(require('express-session')({ secret: 'team 9 secret', resave: false, saveUninitialized: false }));

// Initialize Passport and restore authentication state, if any, from the
// session.
app.use(passport.initialize());
app.use(passport.session());

// pug
app.set('views', './views');
app.set('view engine', 'pug');


// Define routes.

app.get('/',
    function(req, res) {
        res.redirect('index');
    });

app.get('/index',
    function(req, res){
        res.render('index', {});
    });

// Allow user to check if they are authenticated
app.get("/api/authenticated",
    function(req, res) {
        res.writeHead(200, {"Content-Type": "application/json"});
        var authed = req.user ? true : false;
        var json = JSON.stringify({authenticated: authed});
        res.end(json);
    })

// Get user data (excluding password)
app.get("/api/auth/user", connect.ensureLoggedIn(),
    function(req, res) {
        res.writeHead(200, {"Content-Type": "application/json"});
        var json = JSON.stringify({username: req.user.username,
                                   displayName: req.user.displayName,
                                   email: req.user.email,
                                   type: req.user.type});
        res.end(json);
    })

// Reroute for passportjs purposes
app.get('/login',
    function(req, res){
        res.render('login', {});
    });

// Attempt to login
app.post('/login',
    passport.authenticate('local', { failureRedirect: 'login.html' }),
    function(req, res) {
        res.redirect('/auth/profile');
    });

app.get("/auth/profile",
    function(req, res) {
        res.render("profile", { username : req.user.displayName })
    }
)

// route for facebook authentication and login
app.get('/auth/facebook', passport.authenticate('facebook', { scope : 'email' }));

// handle the callback after facebook has authenticated the user
app.get('/auth/facebook/callback',
    passport.authenticate('facebook', {
        successRedirect : '/auth/secure.html',
        failureRedirect : '/login.html'
    }));

// Logs out...
app.get('/logout',
    function(req, res){
        req.logout();
        res.redirect('/');
    });

// Serve any files in the public directory.
app.use(express.static("public"));
// Only server files in the auth directory if the user is logged in.
app.use("/auth", [connect.ensureLoggedIn(), express.static('auth')]);

app.listen(8080);
