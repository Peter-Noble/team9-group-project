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
            image = $('<div class="item-image"><img class="thumb" src="/images/listings/' + item.Image + '"/></div>');
//                .attr('src','/images/listings/' + item.Image);
//                .attr('class', 'img-thumbnail');
        } else {
            image = $('<div class="item-image"><img class="thumb" src="/images/listings/placeholder.png"></div>');
        }
//        var left = $("<div class='col-sm-3'>");
//        left.appendTo(row);
        image.appendTo(row);
        $("<a href='/item/" + item.Listing_ID + "'><h3 class='item-title'>" + item.Title + "</h3></a>" + "<p><b>" + prettyDate(item.Expiry) + "</b></p>"/*<p>" + item.description.substring(0,80) + "</p>"*/).appendTo(row);
        for (var t = 0; t < item.tags.length; t++) {
            $("<span class='label label-success'>").text(item.tags[t].Tag_Name).appendTo(row);
        }
    })
}
