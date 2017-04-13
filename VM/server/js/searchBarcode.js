$(document).ready(function() {
    $('#search-barcode').click(function() {
        var bc = $('#barcode').val();
        var apiUrl = "http://api.upcdatabase.org/json/933cc524178255ceb59f433c7fb940d6/" + bc;

        $.ajax({
            url: apiUrl,
            success: function(data) {
                $('#itemName').val(data.itemname);
            }
        })
    })
})
