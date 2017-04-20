$.ajax({
    url: "/api/recently-added",
    data: { number: 4 },
    success: function(data) {
        drawList(data.recentlyAdded);

        mapItems = data.recentlyAdded.map(
            function(item, i) {
                return {
                    position: {lat: item.item.Location.x, lng: item.item.Location.y},
                    label: (i+1).toString(),
                    title: item.item.Title
                };
            }
        );
        updateMapSearchResults(mapItems);
    }
})
