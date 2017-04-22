$(document).ready(function() {
    var tags = [];
    $.ajax({
        type: 'GET',
        url: "/api/all-tags",
        success: function(data) {
            for (var i in data) {
                tags.push(data[i].Tag_Name);
            }
            for (var i = 0; i < tags.length; i++){
                var tagForList = "<li><a href='/search-results?searchtext=" + tags[i] + "'>" + tags[i] + "</a></li>";
                $("#tagMenu").append(tagForList);
            }
        }
    })
});
