function prettyDate(dateString){
  //if it's already a date object and not a string you don't need this line:
    var date = new Date(dateString);
    var d = date.getDate();
    var monthNames = [ "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec" ];
    var m = monthNames[date.getMonth()];
    var y = date.getFullYear();
    return d+' '+m+' '+y;
}
var dataDump;

$.ajax({
    url: "/api/recently-added",
    data: { number: 4 },
    success: function(data) {
        var parsedData = data.recentlyAdded;
        dataDump = data;

        $.each(parsedData, function(index, item) {
            if (index != 0) {
                $("<hr>").appendTo('#results');
            }
            var row = $("<div class='row'>");
            row.appendTo('#results');
            var image = "";
            if (item.item.Image != "") {
                image = $('<img/>')
                    .attr('src','/images/listings/' + item.item.Image)
                    .attr('style', 'height: 65px;');
            } else {
                image = $('<img style="height: 65px;">');
            }
            var left = $("<div class='col-sm-4'>");
            left.appendTo(row);
            image.appendTo(left);
            var right = $("<div class='col-sm-8'>");
            right.appendTo(row);
            $("<a href='/item/" + item.item.Listing_ID + "'><h3>" + item.item.Title + "</h3></a>" + "<p>" + prettyDate(item.item.Expiry) + "</p>").appendTo(right);
            for (var t = 0; t < item.tags.length; t++) {
                $("<span class='label label-success'>").text(item.tags[t].Tag_Name).appendTo(right);
            }
        })
        mapItems = parsedData.map(
            function(item, i) {
                return {
                    position: {lat: item.item.Location.x, lng: item.item.Location.y},
                    label: (i+1).toString(),
                    title: item.item.Title,
                    type: "circle"
                };
            }
        );
        updateMapSearchResults(mapItems);
    }
})
