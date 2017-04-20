var searchRadiusPostcodeTimeout;

$(document).ready(function() {
    // Render results
    function renderListings(){
        $.ajax({
        url: "/search",
        data: {searchtext: text, sort: sortParam},
        success: function(data) {
            var parsedData = JSON.parse(data);

            // Sorting results
            var sorted = sortBy(parsedData, sortParam);
            // End sorting

            drawList(sorted);

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
            mapItems = sorted.map(
                function(item, i) {
                    return {
                        position: {lat: item.Location.x, lng: item.Location.y},
                        label: (i+1).toString(),
                        title: item.item.Title
                    };
                }
            );
            updateMapSearchResults(mapItems);
        }
    })
    }

    // sorting function
    function sortBy(parsed, param){
        sorting = []
        for (obj in parsed){
                sorting.push(parsed[obj]);
            }
        switch(param) {
            case "dateASC":
                sorting.sort(function(a, b){
                    return new Date(a.Added).getTime() - new Date(b.Added).getTime()});
                break;
            case "dateDSC":
                sorting.sort(function(a, b){
                    return new Date(b.Added).getTime() - new Date(a.Added).getTime()});
                break;
            default:
                sorting.sort(function(a, b){
                    return new Date(a.Added).getTime() - new Date(b.Added).getTime()});
                break;
        }
        return sorting;
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

    renderListings();

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

function refineSearch(sortParam){
    var url = document.location.toString();
    var relativeURL = url.split("/").pop();
    var smallURL = relativeURL.substring(0, relativeURL.indexOf("sortBy"));
    var newURL = smallURL.concat("sortBy=", sortParam);
    history.pushState(null, null, newURL);
}

