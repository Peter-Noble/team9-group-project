var express = require('express');
var passport = require('passport');
var Strategy = require('passport-local').Strategy;
var FacebookStrategy = require('passport-facebook').Strategy;
var db = require('./db');
var connect = require('connect-ensure-login');
var mysql = require('mysql');

passport.use(new Strategy(
    function(username, password, cb) {
		//sets up the connection details
		var connection = mysql.createConnection({
		  host     : 'sql8.freemysqlhosting.net',
		  user     : 'sql8161701',
		  password : 'LdhucPKNyv',
		  database : 'sql8161701'
		});
		//attempts a connection
		connection.connect(function(err) {
			// in case of error
			if(err){
				console.log(err.stack);
				console.log(err.fatal);
			}
		});
        console.log("Connection made")
		//attempts a query to check user details and returns their Forename
		connection.query('SELECT * from Profiles, Users WHERE Username = "' + username + '" AND Password = "' + password + '" AND Users.User_ID = Profiles.User_ID AND Users.Type = \'Local\'',
            function(err, rows, fields) {
                if (!err && rows.length > 0) {
                    console.log(rows)
        			user = {
        				id: rows[0].User_ID,
        				username: rows[0].Username,
        				password: rows[0].Password,
        				displayName: rows[0].Forename,
        				email: rows[0].Email,
        				type: 'Local'
        			};
        			console.log(rows);
        			return cb(null, user);
                } else if (!err && rows.length == 0) {
                    console.log("Error! User doesn't exist")
    		    } else {
    			    console.log('Error while performing Query.');
    		        return cb(null, false);
    		    }
		    }
        );
		//closes the connection
		connection.end();
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
    cb(null, {id: user.id, type: user.type});
});

passport.deserializeUser(function(id, cb) {
		//sets up the connection details
		var connection = mysql.createConnection({
		  host     : 'sql8.freemysqlhosting.net',
		  user     : 'sql8161701',
		  password : 'LdhucPKNyv',
		  database : 'sql8161701'
		});
		//attempts a connection
		connection.connect(function(err) {
			// in case of error
			if(err){
				console.log(err.stack);
				console.log(err.fatal);
			}
		});
        console.log("Connection made")
        console.log(id)
		//attempts a query to check user details and returns their Forename
        console.log('SELECT * from Profiles, Users WHERE Users.User_ID = Profiles.User_ID AND Profiles.User_ID = ' + id.id + ' AND Users.Type = ' + id.type)
		connection.query('SELECT * from Profiles, Users WHERE Users.User_ID = Profiles.User_ID AND Profiles.User_ID = ' + id.id + ' AND Users.Type = "' + id.type + '"',
            function(err, rows, fields) {
                if (!err && rows.length > 0) {
                    console.log(rows)
        			user = {
        				id: rows[0].User_ID,
        				username: rows[0].Username,
        				password: rows[0].Password,
        				displayName: rows[0].Forename,
        				email: rows[0].Email,
        				type: rows[0].Type
        			};
        			console.log(rows);
        			return cb(null, user);
                } else if (!err && rows.length == 0) {
                    console.log("deserialize - Error! User doesn't exist")
    		    } else {
    			    console.log('deserialize - Error while performing Query.');
    		        return cb(null, false);
    		    }
		    }
        );
		//closes the connection
		connection.end();

    /*db.users.findById(id, function (err, user) {
        if (err) { return cb(err); }
        cb(null, user);
    });*/
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

app.get("/auth/profile", connect.ensureLoggedIn(),
    function(req, res) {
        res.render("profile", { username : req.user.displayName })
    }
)

app.get("/auth/add-item", connect.ensureLoggedIn(),
    function(req, res) {
        res.render("add-item", { username : req.user.displayName })
    }
)

app.get("/auth/home", connect.ensureLoggedIn(),
    function(req, res) {
        res.render("home", { username : req.user.displayName })
    }
)

app.get("/registration",
    function(req, res) {
        res.render("registration", {})
    }
)

app.get("/search-results",
    function(req, res) {
        res.render("search-results", {})
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
