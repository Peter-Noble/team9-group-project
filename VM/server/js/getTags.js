$(document).ready(function() {
    var tags = [];
    $.ajax({
        async: false,
        type: 'GET',
        url: "/api/all-tags", 
        success: function(data) {
            for (var i in data) {
                tags.push(data[i].Tag_Name);
            }
            console.log(tags);
            for (var i = 0; i < tags.length; i++){
                var tagForList = "<li><a href='#'>" + tags[i] + "</a></li>";
                console.log(tagForList);
                $("#tagMenu").append(tagForList);
            }
        }
    })
});