var express = require('express');
var passport = require('passport');
var Strategy = require('passport-local').Strategy;
var FacebookStrategy = require('passport-facebook').Strategy;
var connect = require('connect-ensure-login');
var mysql = require('mysql');
var UKPostcodes = require('uk-postcodes-node');
var formidable = require('formidable');
var fs = require('fs');
var path = require('path');

var sqlDetails = require('./sqlCredentials');

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
		connection.query('SELECT * from Profiles, Users WHERE Username = "' + username + '" AND Password = "' + password + '" AND Users.User_ID = Profiles.User_ID AND Users.Type = "Local"',
            function(err, rows, fields) {
                if (!err && rows.length > 0) {
        			user = {
        				id: rows[0].User_ID,
        				username: rows[0].Username,
        				displayName: rows[0].Forename,
        				email: rows[0].Email,
        				type: rows[0].Type,
                        postcode: rows[0].Post_code
        			};
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
    callbackURL: "http://127.0.0.1:8080/auth/facebook/callback",
    profileFields: ['id', 'displayName', 'emails']
    }, function(token, refreshToken, profile, cb) {
		var connection = makeSQLConnection();
		connection.query('SELECT * from Profiles, Users WHERE Username = "' + profile.id + '" AND Users.User_ID = Profiles.User_ID AND Users.Type = \'Facebook\'',
            function(err, rows, fields) {
                if (!err && rows.length > 0) {
        			user = {
        				id: rows[0].User_ID,
        				username: rows[0].Username,
        				displayName: rows[0].Forename,
        				email: rows[0].Email,
        				type: rows[0].Type,
                        postcode: rows[0].Post_code
        			};
        			return cb(null, user);
                } else if (!err && rows.length == 0) {
                    // Create profile and user

            		var insertConnection = makeSQLConnection();

                    insertConnection.query("INSERT INTO Profiles (`User_ID`, `Forename`, `Post_Code`) VALUES (NULL, '" + profile.displayName + "', '');",
                        function(err, profileRows, fields) {
                            var usersConnections = makeSQLConnection();
                            usersConnections.query("INSERT INTO Users (`User_ID`, `Username`, `Email`, `Password`, `Type`) VALUES (" + profileRows.insertId + ", '" + profile.id + "', '" + profile.emails[0].value + "', '', 'Facebook')",
                                function(err, userRows, fields) {
                                    user = {
                                        id: profileRows.insertId,
                                        username: profile.id,
                                        displayName: profile.displayName,
                                        email: profile.emails[0],
                                        type: "Facebook"
                                    }
                                    usersConnections.end();
                                    return cb(null, user);
                                }
                            )
                            insertConnection.end();
                        }
                    )
    		    } else {
    			    console.log('Error while performing Query.');
    		        return cb(null, false);
    		    }
                connection.end();
		    }
        );
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
		connection.query('SELECT * from Profiles, Users WHERE Users.User_ID = Profiles.User_ID AND Profiles.User_ID = ' + id.id + ' AND Users.Type = "' + id.type + '"',
            function(err, rows, fields) {
                if (!err && rows.length > 0) {
        			user = {
        				id: rows[0].User_ID,
        				username: rows[0].Username,
        				displayName: rows[0].Forename,
        				email: rows[0].Email,
        				type: rows[0].Type,
                        postcode: rows[0].Post_Code
        			};
        			return cb(null, user);
                } else if (!err && rows.length == 0) {
                    console.log("deserialize - Error! User doesn't exist")
                    return cb(null, false);
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

// Get items listed by the logged in account that haven't yet been collected.
app.get("/api/auth/my-active-items", connect.ensureLoggedIn(),
    function(req, res) {
        res.writeHead(200, {"Content-Type": "application/json"});

        var connection = makeSQLConnection();
        connection.query("SELECT * FROM Listings WHERE User_ID = " + req.user.id + " AND Status NOT IN ('Collected','Removed') ORDER BY Expiry ASC",
            function(err, rows, fields) {
                res.end(JSON.stringify(rows));
            }
        )
    }
)

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
        var connection = makeSQLConnection();
        connection.query("SELECT * FROM Listings WHERE User_ID = " + req.user.id + " AND Status NOT IN ('Collected','Removed') ORDER BY Expiry ASC",
            function(err, rows, fields) {
                res.render("profile", { username : req.user.displayName,
                                        authenticated: req.user ? true : false,
                                        postcodeUpdate: req.user.postcode == "" || req.user.postcode == null ,
                                        myRecentItems: rows})
            }
        )
    }
)

// Item page
function itemPageResponse(req, res, edit) {
    var connection = makeSQLConnection();
    connection.query('SELECT * FROM Listings INNER JOIN Profiles ON Listings.User_ID = Profiles.User_ID WHERE  Listing_ID =' + req.params.id,
        function(err, rows, fields) {
            if (req.user) {
                res.render("item", { username : req.user.displayName,
                                     authenticated: true,
                                     postcodeUpdate: req.user.postcode == "" || req.user.postcode == null ,
                                     myRecentItems: rows,
                                     item: rows ? rows[0] : null,
                                     ownItem: rows ? rows[0].User_ID == req.user.id : false,
                                     edit: edit});
            } else {
                if (edit) {
                    res.redirect("/item/" + req.params.id);
                } else {
                    res.render("item", { authenticated: false,
                                         item: rows ? rows[0] : null,
                                         ownItem: false });
                }
            }
            connection.end();
        }
    )
}

app.get("/item/:id",
    function(req, res) {
        itemPageResponse(req, res, false);
    }
)

app.get("/item/:id/edit",
    function(req, res) {
        itemPageResponse(req, res, true);
    }
)

// Receives request to update the details of an item
app.post("/auth/update-item/:id", connect.ensureLoggedIn(),
    function(req, res) {
        var connection = makeSQLConnection();
        var query = "UPDATE Listings SET ";
        query += "Title = '" + req.body.Title + "', ";
        query += "Expiry = '" + req.body.Expiry + "' ";
        // TODO add other fields once DB has support
        query += "WHERE Listing_ID = " + req.params.id + ";";
        connection.query(query,
            function(err, rows, fields) {
                res.redirect("/item/" + req.params.id);
                connection.end()
            }
        )
    }
)

// Make a request to claim an item
app.post("/auth/claim-item/:id", connect.ensureLoggedIn(),
    function(req, res) {
        // TODO Make claim on item
        console.log("claim item");
        console.log(req.body);
        res.redirect("/item/" + req.params.id);
    }
)

// Add a new item to give away
app.get("/auth/add-item", connect.ensureLoggedIn(),
    function(req, res) {
        res.render("add-item", { username : req.user.displayName,
                                 authenticated: req.user ? true : false,
                                 postcode: req.user.postcode })
    }
)

// Receives request to add new item to the listings
app.post("/add-item", connect.ensureLoggedIn(),
    function(req, res) {
        var postcode = req.body.location;
        UKPostcodes.getPostcode(postcode, function(error, data) {
            var locationPoint = "POINT(" + data.geo.lat + " " + data.geo.lng + ")";
            var connection = makeSQLConnection();
                connection.query("INSERT INTO Listings (`Listing_ID`, `User_ID`, `Title`, `Expiry`, `Location`) VALUES (NULL, '" + req.user.id + "', '" + req.body.itemName + "', '" + req.body.expiry + "', GeomFromText('" + locationPoint + "'));",
                    function(err, rows, fields) {
                        console.log(err);
                    }
                );
                var success = true;
                if (success) {
                    res.redirect("/auth/home"); // for now
                } else {
                    res.redirect("#");
                }
        });
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
        connection.query("INSERT INTO Users (`User_ID`, `Username`, `Email`, `Password`, `Type`, `Post_Code`) VALUES (NULL, '" + req.body.username + "', '" + req.body.email + "', '" + req.body.password + "', 'Local', '" + req.body.postcode + "')",
            function(err, rows, fields) {
                var imgPath = "";
                var extension = "";
                var jpgPath = path.join(path.join(__dirname, '/uploads'), req.sessionID + ".jpg");
                var pngPath = path.join(path.join(__dirname, '/uploads'), req.sessionID + ".png");
                if (fs.existsSync(jpgPath)) {
                    imgPath = jpgPath;
                    extension = ".jpg";
                } else if (fs.existsSync(pngPath)) {
                    imgPath = pngPath;
                    extension = ".png";
                }
                if (imgPath != "") {
                    fs.rename(imgPath, path.join(path.join(__dirname, '/images/profiles'), rows.insertId + extension));
                    connection.query("INSERT INTO Profiles (`User_ID`, `Forename`, `Photo`) VALUES (" + rows.insertId + ", '" + req.body.name + "', '" + rows.insertId + extension + "');",
                        function(err, secondRows, fields) {
                            connection.end();
                        }
                    )
                } else {
                    connection.query("INSERT INTO Profiles (`User_ID`, `Forename`) VALUES (" + rows.insertId + ", '" + req.body.name + "');",
                        function(err, secondRows, fields) {
                            connection.end();
                        }
                    );
                }
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

app.post('/uploadImage', function(req, res){
    console.log(req.sessionID);
    // create an incoming form object
    var form = new formidable.IncomingForm();

    // specify that we don't want to allow the user to upload multiple files in a single request
    form.multiples = false;

    // store all uploads in the /uploads directory
    form.uploadDir = path.join(__dirname, '/uploads');

    // if (file.type.slice(0,5) != 'image') TODO invalid image

    // rename
    form.on('file', function(field, file) {
        fs.rename(file.path, path.join(form.uploadDir, req.sessionID + "." + file.name.split(".")[1]));
    });

    // log any errors that occur
    form.on('error', function(err) {
        console.log('An error has occured: \n' + err);
    });

    // once all the files have been uploaded, send a response to the client
    form.on('end', function() {
        res.end('success');
    });

    // parse the incoming request containing the form data
    form.parse(req);

});

// Result of user searching in the top bar
app.get("/search-results",
    function(req, res) {
        res.render("search-results", { authenticated: req.user ? true : false })
    }
)

// Get search results from database
app.get("/search",
    function(req, res) {
    var connection = makeSQLConnection();
        connection.query("SELECT DISTINCT Listings.Listing_ID, User_ID, Title, Expiry, Location, Status from Listings, Pairings, Tags WHERE Status = 'Available' AND (Title LIKE '%" + req.query.searchtext + "%' OR (Listings.Listing_ID = Pairings.Listing_ID AND Pairings.Tag_ID = Tags.Tag_ID AND Tags.Tag_Name = '" + req.query.searchtext + "'));",
            function(err, rows, fields) {
                res.end(JSON.stringify(rows));
                console.log("Something");
            }
        );
    }
)

// route for facebook authentication and login
app.get('/auth/facebook', passport.authenticate('facebook', { scope : 'email' }));

app.get('/auth/facebook-additional-info', connect.ensureLoggedIn(),
    function(req, res) {
		var connection = makeSQLConnection();
        connection.query('SELECT * from Profiles, Users WHERE Username = "' + req.user.username + '" AND Users.Type = \'Facebook\' AND Users.User_ID = Profiles.User_ID',
            function(err, rows, fields) {
                if (rows.length == 0  || rows[0].Post_Code == null || rows[0].Post_Code == "") {
                    res.render("facebook-additional-info", { username : req.user.displayName,
                                                             authenticated: req.user ? true : false })
                } else {
                    res.redirect("/auth/home");
                }
            }
        )
    })

// handle the callback after facebook has authenticated the user
app.get('/auth/facebook/callback',
    passport.authenticate('facebook', {
        successRedirect : '/auth/facebook-additional-info',
        failureRedirect : '/login'
    }));

app.post('/update-postcode',
    function(req, res) {
		var connection = makeSQLConnection();
        connection.query("UPDATE Profiles SET Post_Code = '" + req.body.postcode.replace(/\s+/g, '') + "' WHERE User_ID = " + req.user.id + ";",
            function(err, rows, fields) {
                if (err) {
                    console.log(err.stack);
                    console.log(err.fatal);
                    req.logout();
                    res.redirect("/login");
                } else {
                    res.redirect("/auth/home");
                }
            }
        );
    })

// Logs out...
app.get('/logout',
    function(req, res){
        req.logout();
        res.redirect('/');
    });

app.use('/styles', express.static("styles"));
app.use('/js', express.static("js"));
// Serve any files in the public directory.
app.use('/images', express.static("images"));

app.listen(8080);
