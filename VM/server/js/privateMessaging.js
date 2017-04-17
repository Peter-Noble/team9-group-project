var socket = io();
var itemID = parseInt(window.location.pathname.split("/")[2]);
var userID = null;
$.get("/api/auth/user", function(data) {
    userID = data.id;
    socket.emit("new", {itemID: itemID});
})
socket.on("new message", function(data) {
    if (data.sender == userID) {
        $("<li>").append("Me: " + data.message).appendTo("#messages");
    } else {
        $("<li>").append(data.message).appendTo("#messages");
    }
})
$("#messageInput").submit(function() {
    var message = $("#messageInput input")[0].value;
    if (message.trim() != "") {
        socket.emit("message", {message: message, itemID: itemID});
    }
    $("#messageInput input")[0].value = "";
    return false;
})
