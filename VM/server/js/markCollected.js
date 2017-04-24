function markCollected(id) {
    $.ajax({
        type: "POST",
        url: "/auth/mark-collected/"+id,
        success: function(data) {
            console.log(data);
            location.reload();
        }
    })
}
