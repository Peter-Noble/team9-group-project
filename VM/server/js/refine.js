// sorting function
function sort(parsed, param){
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
//        case "distance":
//            sorting.sort(function(a, b){
//
//            })
        case "expiryDSC":
            sorting.sort(function(a, b){
                return new Date(b.Expiry).getTime() - new Date(a.Expiry).getTime()});
            break;

        case "expriyASC":
        default:
            sorting.sort(function(a, b){
                return new Date(a.Expiry).getTime() - new Date(b.Expiry).getTime()});
            break;
    }
    return sorting;
}

// Render results
function getListings(text, sortParam){
    $.ajax({
    url: "/search",
    data: {searchtext: text, sort: sortParam},
    success: function(data) {
        var parsedData = JSON.parse(data);

        // Sorting results
        var sorted = sort(parsedData, sortParam);
        console.log(sorted);
        // End sorting

        drawList(sorted);

        mapItems = sorted.map(
            function(item, i) {
                return {
                    position: {lat: item.Location.x, lng: item.Location.y},
                    label: (i+1).toString(),
                    title: item.Title
                };
            }
        );
        updateMapSearchResults(mapItems);
    }
})
}

function refineSearch(sortParam){
    var url = document.location.toString();
    var relativeURL = url.split("/").pop();
    var smallURL = relativeURL.substring(0, relativeURL.indexOf("sortBy"));
    var newURL = smallURL.concat("sortBy=", sortParam);
    history.pushState(null, null, newURL);

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

    getListings(text, sortParam);
}
