var express = require("express");
var app = express();

var path = require("path");

app.get("/API/*", function(req, res) {
  res.send("Hello World");
})

app.use(express.static(path.join(__dirname, "public")));

app.listen(8080, function () {
  console.log("Listening on port 8080")
})
