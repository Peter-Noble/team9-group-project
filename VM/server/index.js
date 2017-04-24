var express = require('express');
var passport = require('passport');
var Strategy = require('passport-local').Strategy;
var FacebookStrategy = require('passport-facebook').Strategy;
var connect = require('connect-ensure-login');
var mysql = require('mysql');
var formidable = require('formidable');
var fs = require('fs');
var path = require('path');
var request = require('request');
var download = function(uri, filename, callback){
  request.head(uri, function(err, res, body){
    request(uri).pipe(fs.createWriteStream(filename)).on('close', callback);
  });
};

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
    callbackURL: "http://ec2-35-176-18-199.eu-west-2.compute.amazonaws.com/auth/facebook/callback",
    profileFields: ['id', 'displayName', 'emails', 'photos']
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
                    download(profile.photos[0].value, "images/profiles/"+user.id+".jpg",
                        function(){})
        			return cb(null, user);
                } else if (!err && rows.length == 0) {
                    // Create profile and user

            		var insertConnection = makeSQLConnection();

                    insertConnection.query("INSERT INTO Users (`User_ID`, `Username`, `Email`, `Password`, `Type`) VALUES (NULL, '" + profile.id + "', '" + profile.emails[0].value + "', '', 'Facebook')",
                        function(err, userRows, fields) {
                            insertConnection.query("INSERT INTO Profiles (`User_ID`, `Forename`, `Photo`) VALUES (" + userRows.insertId + ", '" + profile.displayName + "', '" + userRows.insertId + ".jpg');",
                            function(err, profileRows, fields) {
                                    user = {
                                        id: userRows.insertId,
                                        username: profile.id,
                                        displayName: profile.displayName,
                                        email: profile.emails[0],
                                        type: "Facebook"
                                    }
                                    insertConnection.end();
                                    download(profile.photos[0].value, "images/profiles/"+user.id+".jpg",
                                        function(){})
                                    return cb(null, user);
                                }
                            )
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
                        postcode: rows[0].Post_Code,
                        photo: rows[0].Photo
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

// Set up for messaging sockets
var server = require('http').createServer(app);
var io = require('socket.io')(server);
var passportSocketIo = require('passport.socketio');
var cookieParser = require('cookie-parser');
var port = process.env.PORT || 80;
var expressSession = require('express-session');
server.listen(port);

var MemoryStore = expressSession.MemoryStore
var sessionStore = new MemoryStore();

var socketStore = {}  // {ItemID: {User_ID: [sockets]}}

io.use(passportSocketIo.authorize({
    key: 'connect.sid',
    secret: "team 9 secret",
    store: sessionStore,
    passport: passport,
    cookieParser: cookieParser
}));

io.on("connection", function(socket) {
    var userID = null;
    var itemID = null;

    socket.on("new", function(data) {
        userID = socket.request.user.id;
        itemID = data.itemID;
        if (!(data.itemID in socketStore)) {
            socketStore[data.itemID] = {};
        }
        if (!(socket.request.user.id in socketStore[data.itemID])) {
            socketStore[itemID][userID] = [];
        }
        socketStore[itemID][userID].push(socket);

        var connection = makeSQLConnection();
        connection.query("SELECT * FROM Messages WHERE ItemID = " + itemID + " ORDER BY Timestamp ASC",
            function(err, rows, fields) {
                socket.emit("message history", rows);
                connection.end();
            }
        )
    })
    socket.on("message", function(data) {
        for (var key in socketStore[itemID]) {
            for (var foreignSocket in socketStore[itemID][key]) {
                var returnData = {Message: data.message, SenderID: userID};
                socketStore[itemID][key][foreignSocket].emit("new message", returnData);
            }
        }
        var connection = makeSQLConnection();
        connection.query("INSERT INTO Messages (`ItemID`, `SenderID`, `Message`) VALUES ('" + itemID + "', '" + userID + "', '" + data.message + "')",
            function(err, rows, fields) {
                connection.end();
            }
        );
    })
    socket.on("disconnect", function() {
        var sockets = socketStore[itemID][userID]
        var index = sockets.indexOf(socket);
        if (index > -1) {
            sockets.splice(index, 1);
        }
    })
})

// Use application-level middleware for common functionality, including
// logging, parsing, and session handling.
//app.use(require('morgan')('combined'));  // Connection debugging
app.use(cookieParser());
app.use(require('body-parser').urlencoded({ extended: true }));
app.use(expressSession({ store: sessionStore, secret : "team 9 secret", resave: false, saveUninitialized: false }));

// Initialize Passport and restore authentication state, if any, from the
// session.
app.use(passport.initialize());
app.use(passport.session());

// pug
app.set('views', __dirname + '/views');
app.set('view engine', 'pug');


// Define routes.

app.use(require("serve-favicon")(path.join(__dirname,'images','favicon.ico')));

app.get('/',
    function(req, res) {
        res.redirect('index');
    });

app.get('/index',
    function(req, res){
        res.render('index', { authenticated: req.user ? true : false });
    }
);

app.get("/api/recently-added",
    function(req, res) {
        res.writeHead(200, {"Content-Type": "application/json"});
        var connection = makeSQLConnection();
        connection.query("SELECT * FROM Listings WHERE Status = 'Available' ORDER BY Added DESC LIMIT " + req.query.number,
            function(err, rows, fields) {
                var remaining = rows.length;
                var data = [];
                for (var i = 0; i < rows.length; i++) {
                    data.push(rows[i]);
                    (function(i) {
                        connection.query("SELECT * FROM Tags, Pairings WHERE Pairings.Listing_ID = " + rows[i].Listing_ID + " AND Tags.Tag_ID = Pairings.Tag_ID",
                            function(err, tags, fields) {
                                data[i]["tags"] = tags;
                                remaining--;
                                if (remaining == 0) {
                                    var json = JSON.stringify({recentlyAdded: data});
                                    res.end(json);
                                    connection.end();
                                }
                            }
                        )
                    })(i);
                }
            }
        )
    }
);

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
                                   type: req.user.type,
                                   id: req.user.id});
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

// Get list of all tags
app.get("/api/all-tags",
    function(req, res) {
        var connection = makeSQLConnection();
        connection.query("SELECT * FROM Tags",
            function(err, rows, fields) {
                connection.end();
                res.writeHead(200, {"Content-Type": "application/json"});
                res.end(JSON.stringify(rows));
            })
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
                connection.query("SELECT * FROM Listings WHERE Status = 'Reserved' AND Collector_ID = '" + req.user.id + "'",
                    function(err, pending, fields) {
						connection.query("SELECT * FROM Listings WHERE User_ID = " + req.user.id + " AND Status IN ('Collected','Removed') ORDER BY Expiry ASC",
							function(err, past, fields) {
								res.render("profile", { username : req.user.displayName,
														authenticated: req.user ? true : false,
														postcodeUpdate: req.user.postcode == "" || req.user.postcode == null ,
														myRecentItems: rows,
														myPendingItems: pending,
														myPastItems: past,
														user: req.user});
								connection.end();
							}
						)
                    }
                )
            }
        )
    }
)

// Item page
function itemPageResponse(req, res, edit) {
    var connection = makeSQLConnection();
    connection.query('SELECT * FROM Listings INNER JOIN Profiles ON Listings.User_ID = Profiles.User_ID WHERE  Listing_ID =' + req.params.id,
        function(err, rows, fields) {
            connection.query("SELECT * FROM Pairings, Tags WHERE Pairings.Listing_ID = " + req.params.id + " AND Pairings.Tag_ID = Tags.Tag_ID",
                function(err, tags, fields) {
                    if (req.user) {
                        res.render("item", { user: req.user,
                                             authenticated: true,
                                             postcodeUpdate: req.user.postcode == "" || req.user.postcode == null ,
                                             myRecentItems: rows,
                                             item: rows ? rows[0] : null,
                                             ownItem: rows ? rows[0].User_ID == req.user.id : false,
                                             edit: edit,
                                             tags: tags });
                    } else {
                        if (edit) {
                            res.redirect("/item/" + req.params.id);
                        } else {
                            res.render("item", { authenticated: false,
                                                 item: rows ? rows[0] : null,
                                                 ownItem: false,
                                                 tags: tags });
                        }
                    }
                    connection.end();
                }
            )
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
        query += "Expiry = '" + req.body.Expiry + "', ";
        if (req.body.img != "") {
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
                fs.rename(imgPath, path.join(path.join(__dirname, '/images/listings'), req.params.id + extension));
                query += "Image = '" + req.params.id + extension + "', ";
            }
        }
        query += "Description = '" + req.body.Description+ "'";
        var tagsConnection = makeSQLConnection();
        tagsConnection.query("SELECT * FROM Tags",
            function(err, rows, fields) {
                var tagDict = {};
                for (var r in rows) {
                    tagDict[rows[r].Tag_Name] = rows[r].Tag_ID;
                }
                tagsConnection.query("SELECT * FROM Pairings WHERE Listing_ID = " + req.params.id,
                    function(err, rows, fields) {
                        var tagIDs = [];
                        for (var r in rows) {
                            tagIDs.push(rows[r].Tag_ID);
                        }
                        var toAdd = [];
                        var toKeep = [];
                        var toRemove = [];
                        var newTags = req.body.SelectedTags.split(",")
                        for (var t in newTags) {
                            var id = tagDict[newTags[t]];
                            if (id) {
                                var index = tagIDs.indexOf(id);
                                if (index > -1) {
                                    toKeep.push(id);
                                } else {
                                    toAdd.push(id);
                                }
                            }
                        }
                        for (var t in tagIDs) {
                            var index = toKeep.indexOf(tagIDs[t]);
                            if (index == -1) {
                                toRemove.push(tagIDs[t]);
                            }
                        }
                        for (var a in toAdd) {
                            tagsConnection.query("INSERT INTO Pairings (`Tag_ID`, `Listing_ID`) VALUES ('" + toAdd[a] + "', '" + req.params.id + "')")
                        }
                        for (var d in toRemove) {
                            tagsConnection.query("DELETE FROM Pairings WHERE Tag_ID = " + toRemove[d] + " AND Listing_ID = " + req.params.id)
                        }
                        tagsConnection.end();
                    })
            })
        query += "WHERE Listing_ID = " + req.params.id + ";";
        connection.query(query,
            function(err, rows, fields) {
                console.log(err);
                res.redirect("/item/" + req.params.id);
            }
        )
        connection.end()
    }
)

// Make a request to claim an item
app.post("/auth/claim-item/:id", connect.ensureLoggedIn(),
    function(req, res) {
        // TODO Make claim on item
        var connection = makeSQLConnection();
        var available = "SELECT * FROM Listings WHERE Listing_ID = '" + req.params.id + "';";
        connection.query(available,
            function(err, rows, fields) {
                if (rows[0].Status == "Available" && rows[0].User_ID != req.user.id) {
                    var query = "UPDATE Listings SET Status = 'Reserved', Collector_ID = '" + req.user.id + "' WHERE Listing_ID = " + req.params.id + ";";
                    connection.query(query, function(err, rows, fields){
                        connection.end();
                        console.log(err);
                        // TODO new item claimed. Send notification.
                    });
                } else {
                    connection.end();
                }
                res.redirect("/item/" + req.params.id);
            }
        )
    }
)

app.post("/auth/mark-collected/:id", connect.ensureLoggedIn(),
    function(req, res) {
        console.log("GOT HERE");
        var connection = makeSQLConnection();
        var query = "UPDATE Listings SET Status = 'Collected' WHERE Listing_ID = " + req.params.id + ";";
        connection.query(query, function(err, rows, fields){
            connection.end();
            console.log(err);
        });
        res.redirect("/item/" + req.params.id);
    }
)

// Make a request to remove an item
app.post("/auth/remove-item/:id", connect.ensureLoggedIn(),
    function(req, res) {
        var connection = makeSQLConnection();
        var available = "SELECT * FROM Listings WHERE Listing_ID = '" + req.params.id + "';";
        connection.query(available,
            function(err, rows, fields) {
                if (rows[0].User_ID == req.user.id) {
                    var query = "UPDATE Listings SET Status = 'Removed' WHERE Listing_ID = " + req.params.id + ";";
                    connection.query(query, function(err, rows, fields){
                        connection.end();
                        console.log(err);
                    });
                } else {
                    connection.end();
                }
                res.redirect("/item/" + req.params.id);
            }
        )
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

app.get("/search-barcode", connect.ensureLoggedIn(),
    function(req, res) {
        var barcode = req.query.barcode;
        var url = "http://api.upcdatabase.org/json/933cc524178255ceb59f433c7fb940d6/" + barcode;
        request(url, function(err, response, body) {
            data = JSON.parse(body);
            if (data.valid == 'true') {
                if (data.itemname.trim() != "") {
                    res.render("add-item", { username : req.user.displayName,
                                             authenticated: req.user ? true : false,
                                             postcode: req.user.postcode,
                                             bc: barcode,
                                             itemname: data.itemname});
                } else if (data.description.trim() != "") {
                    res.render("add-item", { username : req.user.displayName,
                                             authenticated: req.user ? true : false,
                                             postcode: req.user.postcode,
                                             bc: barcode,
                                             itemname: data.description});
                }
            } else {
                res.render("add-item", { username : req.user.displayName,
                                         authenticated: req.user ? true : false,
                                         postcode: req.user.postcode,
                                         bc: barcode,
                                         itemname: 'Invalid barcode!'});
            }
        });
    }
)

// Receives request to add new item to the listings
app.post("/add-item", connect.ensureLoggedIn(),
    function(req, res) {
        var postcode = req.body.location;
        var imgPath = "";
        var extension = "";
        if (req.body.img != "") {
            var jpgPath = path.join(path.join(__dirname, '/uploads'), req.sessionID + ".jpg");
            var pngPath = path.join(path.join(__dirname, '/uploads'), req.sessionID + ".png");
            if (fs.existsSync(jpgPath)) {
                imgPath = jpgPath;
                extension = ".jpg";
            } else if (fs.existsSync(pngPath)) {
                imgPath = pngPath;
                extension = ".png";
            }
        }
        request("http://api.postcodes.io/postcodes/" + postcode, function(err, response, body) {
            data = JSON.parse(body);
            var locationPoint = "POINT(" + data.result.latitude + " " + data.result.longitude + ")";
            var connection = makeSQLConnection();
                connection.query("INSERT INTO Listings (`Listing_ID`, `User_ID`, `Title`, `Description`, `Expiry`, `Location`) VALUES (NULL, '" + req.user.id + "', '" + req.body.itemName + "', '" + req.body.description + "', '" + req.body.expiry + "', GeomFromText('" + locationPoint + "'));",
                    function(err, rows, fields) {
                        if (imgPath != "") {
                            fs.rename(imgPath, path.join(path.join(__dirname, '/images/listings'), rows.insertId + extension));
                            connection.query("UPDATE Listings SET Image = '" + rows.insertId + extension +"' WHERE  Listing_ID =" + rows.insertId),
                                function(err, rows, fields) {
                                    console.log("There was a problem: " + err);
                                    connection.end();
                                }
                        } else {
                            connection.end();
                        }
                        var tagsConnection = makeSQLConnection();
                        var tags = req.body.SelectedTags.split(",");
                        tagsConnection.query("SELECT * FROM Tags",
                            function(err, tagRows, fields) {
                                var tagDict = {};
                                for (var r in tagRows) {
                                    tagDict[tagRows[r].Tag_Name] = tagRows[r].Tag_ID;
                                }
                                for (var i = 0; i < tags.length; i++) {
                                    var Tag_ID = tagDict[tags[i]];
                                    if (Tag_ID) {
                                        tagsConnection.query("INSERT INTO Pairings (`Tag_ID`, `Listing_ID`) VALUES ('" + Tag_ID + "', '" + rows.insertId + "')");
                                    }
                                }
                                tagsConnection.end();
                            }
                        )
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
                if (req.body.img != "") {
                    var jpgPath = path.join(path.join(__dirname, '/uploads'), req.sessionID + ".jpg");
                    var pngPath = path.join(path.join(__dirname, '/uploads'), req.sessionID + ".png");
                    if (fs.existsSync(jpgPath)) {
                        imgPath = jpgPath;
                        extension = ".jpg";
                    } else if (fs.existsSync(pngPath)) {
                        imgPath = pngPath;
                        extension = ".png";
                    }
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

app.post('/auth/update-profile',  connect.ensureLoggedIn(),
    function(req, res){
        var connection = makeSQLConnection();
        connection.query("UPDATE Users SET Post_Code = '" + req.body.Postcode.replace(/\s+/g, '') + "' WHERE User_ID = " + req.user.id + ";",
            function(err, rows, fields) {
                console.log(err);
                var photoQuery = "";
                if (req.body.img != "") {
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
                        fs.rename(imgPath, path.join(path.join(__dirname, '/images/profiles'), req.user.id + extension));
                        photoQuery += ", Photo = '" + req.user.id + extension + "' ";
                    }
                }
                connection.query("UPDATE Profiles SET Forename = '" + req.body.Name + "'" + photoQuery + " WHERE User_ID = " + req.user.id + ";",
                    function(err, rows, fields) {
                        console.log(err);
                        connection.end();
                        res.redirect("/auth/profile");
                    }
                )
            }
        );
    }
)

app.post('/uploadImage', function(req, res){
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
        res.render("search-results", { authenticated: req.user ? true : false,
                                       user: req.user ? req.user : null })
    }
)

// Get search results from database
app.get("/search",
    function(req, res) {
    var connection = makeSQLConnection();
        connection.query("SELECT DISTINCT Listings.Listing_ID, User_ID, Added, Title, Expiry, Location, Status, Image FROM Listings, Pairings, Tags WHERE Status = 'Available' AND (Title LIKE '%" + req.query.searchtext + "%' OR (Listings.Listing_ID = Pairings.Listing_ID AND Pairings.Tag_ID = Tags.Tag_ID AND Tags.Tag_Name = '" + req.query.searchtext + "'));",
            function(err, rows, fields) {
                var remaining = rows.length;
                var data = [];
                for (var i = 0; i < rows.length; i++) {
                    data.push(rows[i]);
                    (function(i) {
                        connection.query("SELECT * FROM Tags, Pairings WHERE Pairings.Listing_ID = " + rows[i].Listing_ID + " AND Tags.Tag_ID = Pairings.Tag_ID",
                            function(err, tags, fields) {
                                data[i]["tags"] = tags;
                                remaining--;
                                if (remaining == 0) {
                                    var json = JSON.stringify(data);
                                    res.end(json);
                                    connection.end();
                                }
                            }
                        )
                    })(i);
                }
            }
        );
    }
)

// Get lat long for postcode. Used for placing search radius on map from postcode
app.get("/lat-long-from-postcode",
    function(req, res) {
        request("http://api.postcodes.io/postcodes/" + req.query.postcode,
            function(err, response, body) {
                data = JSON.parse(body);
                if (err) {
                    console.log(err);
                }
                res.writeHead(200, {"Content-Type": "application/json"});
                console.log(data);
                if (!("error" in data)) {
                    var json = JSON.stringify({"lat": data.result.latitude, "lng": data.result.longitude});
                    res.end(json);
                } else {
                    res.end(JSON.stringify({"err": "not full postcode"}));
                }
            }
        )
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
                    res.redirect("/auth/profile");
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
        connection.query("UPDATE Users SET Post_Code = '" + req.body.postcode.replace(/\s+/g, '') + "' WHERE User_ID = " + req.user.id + ";",
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

//app.listen(80);
