$(document).ready(function() {

    // had to copy this in from formatDateScript.pug as I wasn't sure how else to make prettyDate available
    // for use in this script
    function prettyDate(dateString){
      //if it's already a date object and not a string you don't need this line:
        var date = new Date(dateString);
        var d = date.getDate();
        var monthNames = [ "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec" ];
        var m = monthNames[date.getMonth()];
        var y = date.getFullYear();
        return d+' '+m+' '+y;
    }

    // Function for retrieving get parameters from url
    var getUrlParameter = function getUrlParameter(sParam) {
        var sPageURL = decodeURIComponent(window.location.search.substring(1)),
          sURLVariables = sPageURL.split('&'),
          sParameterName,
          i;

        for (i = 0; i < sURLVariables.length; i++) {
            sParameterName = sURLVariables[i].split('=');

            if (sParameterName[0] === sParam) {
                  return sParameterName[1] === undefined ? true : sParameterName[1];
            }
        }
    };
    var text = getUrlParameter('searchtext');
    $.ajax({
        url: "/search",
        data: {searchtext: text},
        success: function(data) {
            $.each(JSON.parse(data), function(index, item) {
                var image = "";
                if (item.Image != "") {
                    image = $('<img/>')
                        .attr('src','images/listings/' + item.Image)
                        .attr('style', 'height: 65px;');
                } else {
                    image = $('<img style="height: 65px;">');
                }
                var listElem = $('<li>');
                $("<a href='/item/" + item.Listing_ID + "'><h3>" + item.Title + "</h3></a>" + "<p>" + prettyDate(item.Expiry) + "</p>").appendTo(listElem);
                listElem.appendTo('#results');
                image.appendTo(listElem);
            })
        }
    })
})
