var searchRadiusCircle;
var map;

var markers;
var markerCluster;
var tmp;

function updateSearchArea(searchArea) {
    searchRadiusCircle.setCenter(searchArea.centre);
    searchRadiusCircle.setRadius(searchArea.radius);
    searchRadiusCircle.setVisible(searchArea.visible);
}

function deleteAllMarkers() {
    if (markers) {
        for (var i = 0; i < markers.length; i++) {
            markers[i].setMap(null);
        }
        markers = null;
        markerCluster.setMap(null);
    }
}

function updateMapSearchResults(searchResults) {
    deleteAllMarkers();
    markers = searchResults.map(
        function(result, i) {
            var marker = new google.maps.Marker(result);
            (function(marker, url) {
                google.maps.event.addListener(marker, 'click', function() {window.location.href = url;});
            })(marker, result.url);
            return marker;
        }
    );
    markerCluster = new MarkerClusterer(map, markers,
        {imagePath: 'https://developers.google.com/maps/documentation/javascript/examples/markerclusterer/m'});
}

function initMap() {
    // Create the map.
    map = new google.maps.Map(document.getElementById('map'), {
        zoom: 5,
        center: {lat: 53.2781, lng: -4.5},
        mapTypeId: 'roadmap'
    });

    // Search radius
    searchRadiusCircle = new google.maps.Circle({
        strokeColor: '#FF0000',
        strokeOpacity: 0.5,
        strokeWeight: 2,
        fillColor: '#FF0000',
        fillOpacity: 0.15,
        map: map,
        visible: false
    });

    // Example
    var searchArea = {
        centre: {
            lat: 53.2781,
            lng: -4.5
        },
        radius: 5000,
        visible: false
    }
    updateSearchArea(searchArea);
}
