var searchRadiusPostcodeTimeout;
var searchCentre = null;
var displayedItems = null;

$(document).ready(function() {
    function distance(lat1, lon1, lat2, lon2) {
    	var radlat1 = Math.PI * lat1/180;
    	var radlat2 = Math.PI * lat2/180;
    	var theta = lon1-lon2;
    	var radtheta = Math.PI * theta/180;
    	var dist = Math.sin(radlat1) * Math.sin(radlat2) + Math.cos(radlat1) * Math.cos(radlat2) * Math.cos(radtheta);
    	dist = Math.acos(dist);
    	dist = dist * 180/Math.PI;
    	dist = dist * 60 * 1.1515 * 0.8684;
    	return dist
    }

    function filterByRadius(items, location, radius) {
        var filtered = [];
        for (var i = 0; i < items.length; i++) {
            if (distance(location.lat, location.lng, items[i].Location.x, items[i].Location.y) < radius) {
                filtered.push(items[i]);
            }
        }
        return filtered;
    }

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

            displayedItems = sorted;

            if ($("#postcodeRefine")[0].value != "") {
                $.ajax({
                    url: "/lat-long-from-postcode",
                    data: {postcode: $("#postcodeRefine")[0].value},
                    success: function(data) {
                        if (!("err" in data)) {
                            searchCentre = data;
                            updateSearchArea({centre: data,
                                              radius: parseInt($("#searchRadius")[0].value) * 1000,
                                              visible: true});

                            var filtered = filterByRadius(displayedItems, data, parseInt($("#searchRadius")[0].value));
                            drawList(filtered);

                            mapItems = filtered.map(
                                function(item, i) {
                                    return {
                                        position: {lat: item.Location.x, lng: item.Location.y},
                                        label: (i+1).toString(),
                                        title: item.Title,
                                        url: "/item/" + item.Listing_ID
                                    };
                                }
                            );
                          updateMapSearchResults(mapItems);
                        } else {
                            searchCentre = null;
                            searchRadiusCircle.setVisible(false);
                        }
                    },
                    error: function(data) {
                        searchRadiusCircle.setVisible(false);
                    }
                })
            } else {

                drawList(sorted);

                mapItems = sorted.map(
                    function(item, i) {
                        return {
                            position: {lat: item.Location.x, lng: item.Location.y},
                            label: (i+1).toString(),
                            title: item.Title,
                            url: "/item/" + item.Listing_ID
                        };
                    }
                );
                updateMapSearchResults(mapItems);
            }
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

    $("#postcodeRefine").on("input", function(e) {
        clearTimeout(searchRadiusPostcodeTimeout);
        searchRadiusPostcodeTimeout = setTimeout(function() {
            if ($("#postcodeRefine")[0].value != "") {
                $.ajax({
                    url: "/lat-long-from-postcode",
                    data: {postcode: $("#postcodeRefine")[0].value},
                    success: function(data) {
                        console.log(data);
                        if (!("err" in data)) {
                            searchCentre = data;
                            updateSearchArea({centre: data,
                                              radius: parseInt($("#searchRadius")[0].value) * 1000,
                                              visible: true});

                            var filtered = filterByRadius(displayedItems, data, parseInt($("#searchRadius")[0].value));
                            drawList(filtered);

                            mapItems = filtered.map(
                                function(item, i) {
                                    return {
                                        position: {lat: item.Location.x, lng: item.Location.y},
                                        label: (i+1).toString(),
                                        title: item.Title,
                                        url: "/item/" + item.Listing_ID
                                    };
                                }
                            );
                          updateMapSearchResults(mapItems);
                        } else {
                            searchCentre = null;
                            searchRadiusCircle.setVisible(false);
                        }
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
        if ($("#postcodeRefine")[0].value != "") {
            $.ajax({
                url: "/lat-long-from-postcode",
                data: {postcode: $("#postcodeRefine")[0].value},
                success: function(data) {
                    if (!("err" in data)) {
                        searchCentre = data;
                        updateSearchArea({centre: data,
                                          radius: parseInt($("#searchRadius")[0].value) * 1000,
                                          visible: true});

                        var filtered = filterByRadius(displayedItems, data, parseInt($("#searchRadius")[0].value));
                        drawList(filtered);

                        mapItems = filtered.map(
                            function(item, i) {
                                return {
                                    position: {lat: item.Location.x, lng: item.Location.y},
                                    label: (i+1).toString(),
                                    title: item.Title,
                                    url: "/item/" + item.Listing_ID
                                };
                            }
                        );
                      updateMapSearchResults(mapItems);
                    } else {
                        searchCentre = null;
                        searchRadiusCircle.setVisible(false);
                    }
                },
                error: function(data) {
                    searchRadiusCircle.setVisible(false);
                }
            })
        }
    })
})
