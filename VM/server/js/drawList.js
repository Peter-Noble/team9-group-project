function prettyDate(dateString){
  //if it's already a date object and not a string you don't need this line:
    var date = new Date(dateString);
    var d = date.getDate();
    var monthNames = [ "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec" ];
    var m = monthNames[date.getMonth()];
    var y = date.getFullYear();
    return d+' '+m+' '+y;
}

// data in format: {item: row from Listings, Tags: [rows from Tags]}
function drawList(data) {
    $.each(data, function(index, item) {
        if (index != 0) {
            $("<hr>").appendTo('#results');
        }
        var row = $("<div class='row'>");
        row.appendTo('#results');
        var image = "";
        if (item.Image != "") {
            image = $('<img/>')
                .attr('src','/images/listings/' + item.Image)
                .attr('style', 'height: 65px;');
        } else {
            image = $('<img style="height: 65px;">');
        }
        var left = $("<div class='col-sm-4'>");
        left.appendTo(row);
        image.appendTo(left);
        var right = $("<div class='col-sm-8'>");
        right.appendTo(row);
        $("<a href='/item/" + item.Listing_ID + "'><h3>" + item.Title + "</h3></a>" + "<p>" + prettyDate(item.Expiry) + "</p>").appendTo(right);
        for (var t = 0; t < item.tags.length; t++) {
            $("<span class='label label-success'>").text(item.tags[t].Tag_Name).appendTo(right);
        }
    })
}
