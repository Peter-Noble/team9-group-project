var socket = io();
var itemID = parseInt(window.location.pathname.split("/")[2]);
var userID = null;
$.get("/api/auth/user", function(data) {
    userID = data.id;
    socket.emit("new", {itemID: itemID});
})

function addMessage(data) {
    if (data.SenderID == userID) {
        $("<li>").append("Me: " + data.Message).appendTo("#messages");
    } else {
        $("<li>").append(data.Message).appendTo("#messages");
    }
}

socket.on("new message", function(data) {
    addMessage(data);
})

socket.on("message history", function(data) {
    for (var i in data) {
        addMessage(data[i]);
    }
})

$("#messageInput").submit(function() {
    var message = $("#messageInput input")[0].value;
    if (message.trim() != "") {
        socket.emit("message", {message: message});
    }
    $("#messageInput input")[0].value = "";
    return false;
})
