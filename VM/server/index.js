var express = require('express');
var passport = require('passport');
var Strategy = require('passport-local').Strategy;
var FacebookStrategy = require('passport-facebook').Strategy;
var connect = require('connect-ensure-login');
var mysql = require('mysql');

var sqlDetails = {
  host     : 'sql8.freemysqlhosting.net',
  user     : 'sql8161701',
  password : 'LdhucPKNyv',
  database : 'sql8161701'
}

function makeSQLConnection() {
    /* Make a connection to the sql database and handle any errors */
    //sets up the connection details
    var connection = mysql.createConnection(sqlDetails);
    //attempts a connection
    connection.connect(function(err) {
        // in case of error
        if(err){
            console.log(err.stack);
            console.log(err.fatal);
        }
    });
    return connection
}

passport.use(new Strategy(
    function(username, password, cb) {
		var connection = makeSQLConnection();
		connection.query('SELECT * from Profiles, Users WHERE Username = "' + username + '" AND Password = "' + password + '" AND Users.User_ID = Profiles.User_ID AND Users.Type = \'Local\'',
            function(err, rows, fields) {
                if (!err && rows.length > 0) {
                    console.log(rows)
        			user = {
        				id: rows[0].User_ID,
        				username: rows[0].Username,
        				displayName: rows[0].Forename,
        				email: rows[0].Email,
        				type: rows[0].Type
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
    }, function(token, refreshToken, profile, cb) {
        // asynchronous
        process.nextTick(function() {
    		var connection = makeSQLConnection();
    		connection.query('SELECT * from Profiles, Users WHERE Username = "' + profile.id + '" AND Users.User_ID = Profiles.User_ID AND Users.Type = \'Facebook\'',
                function(err, rows, fields) {
                    if (!err && rows.length > 0) {
                        console.log(rows)
            			user = {
            				id: rows[0].User_ID,
            				username: rows[0].Username,
            				displayName: rows[0].Forename,
            				email: rows[0].Email,
            				type: rows[0].Type
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
		var connection = makeSQLConnection();
        console.log('SELECT * from Profiles, Users WHERE Users.User_ID = Profiles.User_ID AND Profiles.User_ID = ' + id.id + ' AND Users.Type = ' + id.type)
		connection.query('SELECT * from Profiles, Users WHERE Users.User_ID = Profiles.User_ID AND Profiles.User_ID = ' + id.id + ' AND Users.Type = "' + id.type + '"',
            function(err, rows, fields) {
                if (!err && rows.length > 0) {
                    console.log(rows)
        			user = {
        				id: rows[0].User_ID,
        				username: rows[0].Username,
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
app.set('views', __dirname + '/views');
app.set('view engine', 'pug');


// Define routes.

app.get('/',
    function(req, res) {
        res.redirect('index');
    });

app.get('/index',
    function(req, res){
        res.render('index', { authenticated: req.user ? true : false });
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
        res.render('login', { authenticated: req.user ? true : false });
    });

// Attempt to login
app.post('/login',
    passport.authenticate('local', { failureRedirect: 'login' }),
    function(req, res) {
        res.redirect('/auth/profile');
    });

// Users account details
app.get("/auth/profile", connect.ensureLoggedIn(),
    function(req, res) {
        res.render("profile", { username : req.user.displayName,
                                authenticated: req.user ? true : false })
    }
)

// Add a new item to give away
app.get("/auth/add-item", connect.ensureLoggedIn(),
    function(req, res) {
        res.render("add-item", { username : req.user.displayName,
                                 authenticated: req.user ? true : false })
    }
)

// Index page but for logged in clients
app.get("/auth/home", connect.ensureLoggedIn(),
    function(req, res) {
        res.render("home", { username : req.user.displayName,
                             authenticated: req.user ? true : false })
    }
)

// Register a new user full screen
app.get("/registration",
    function(req, res) {
        res.render("registration", { authenticated: req.user ? true : false })
    }
)

// Recieves requests from forms to create new user accounts
app.post('/register',
    function(req, res) {
		var connection = makeSQLConnection();
        connection.query("INSERT INTO `sql8161701`.`Profiles` (`User_ID`, `Forename`, `Post_Code`) VALUES (NULL, '" + req.body.name + "', '" + req.body.postcode + "');",
            function(err, rows, fields) {
                console.log("INSERT INTO  `sql8161701`.`Users` (`User_ID`, `Username`, `Email`, `Password`, `Type`) VALUES (" + rows.insertId + ", " + req.body.username + ", " + req.body.email + ", '" + req.body.password + "', 'Local')");
                connection.query("INSERT INTO  `sql8161701`.`Users` (`User_ID`, `Username`, `Email`, `Password`, `Type`) VALUES (" + rows.insertId + ", '" + req.body.username + "', '" + req.body.email + "', '" + req.body.password + "', 'Local')",
                    function(err, rows, fields) {
                        console.log("New user");
                    }
                );
            }
        );
        var success = true;
        if (success) {
            // Authenticate then...
            res.redirect("/auth/home");
        } else {
            res.redirect("#");
        }
    })

// Result of user searching in the top bar
app.get("/search-results",
    function(req, res) {
        res.render("search-results", { authenticated: req.user ? true : false })
    }
)

// route for facebook authentication and login
app.get('/auth/facebook', passport.authenticate('facebook', { scope : 'email' }));

// handle the callback after facebook has authenticated the user
app.get('/auth/facebook/callback',
    passport.authenticate('facebook', {
        successRedirect : '/auth/profile',
        failureRedirect : '/login'
    }));

// Logs out...
app.get('/logout',
    function(req, res){
        req.logout();
        res.redirect('/');
    });

app.use('/styles', express.static("styles"));
app.use('/js', express.static("js"));
// Serve any files in the public directory.
app.use(express.static("public"));

app.listen(8080);
