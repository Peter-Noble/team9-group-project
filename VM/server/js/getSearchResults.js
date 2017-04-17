var searchRadiusPostcodeTimeout;

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
    var sortParam = getUrlParameter('sortBy');
    console.log(sortParam);
    $.ajax({
        url: "/search",
        data: {searchtext: text, sort: sortParam},
        success: function(data) {
            var parsedData = JSON.parse(data);
            
            // Sorting function (date added)
            var sorted = []
            console.log(Object.keys(parsedData).length);
            for (obj in parsedData){
                sorted.push(parsedData[obj]);
            }
            
            switch(sortParam) {
                case "dateASC":
                    console.log("dateASC used to sort");
                    sorted.sort(function(a, b){
                        return new Date(a.Added).getTime() - new Date(b.Added).getTime()});
                    break;
                case "dateDSC":
                    console.log("dateDSC used to sort");
                    sorted.sort(function(a, b){
                        return new Date(b.Added).getTime() - new Date(a.Added).getTime()});
                    break;
                default:
                    console.log("default used to sort");
                    sorted.sort(function(a, b){
                        return new Date(a.Added).getTime() - new Date(b.Added).getTime()});
                    break;
            }
            
            console.log(sorted);
            // End sorting function
            
            $.each(sorted, function(index, item) {
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
            mapItems = parsedData.map(
                function(item, i) {
                    return {
                        position: {lat: item.Location.x, lng: item.Location.y},
                        label: (i+1).toString()
                    };
                }
            );
            updateMapSearchResults(mapItems);
        }
    })
    $("#postcode").on("input", function(e) {
        clearTimeout(searchRadiusPostcodeTimeout);
        searchRadiusPostcodeTimeout = setTimeout(function() {
            if ($("#postcode")[0].value != "") {
                $.ajax({
                    url: "/lat-long-from-postcode",
                    data: {postcode: $("#postcode")[0].value},
                    success: function(data) {
                        updateSearchArea({centre: data,
                                          radius: parseInt($("#searchRadius")[0].value) * 1000,
                                          visible: true});
                    },
                    error: function(data) {
                        searchRadiusCircle.setVisible(false);
                    }
                })
            }
        }, 1000)
    })
    $("#searchRadius").on("change", function(e) {
        searchRadiusCircle.setRadius(parseInt($("#searchRadius")[0].value) * 1000);
    })
})
