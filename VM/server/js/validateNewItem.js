$(document).ready(function() {

    $('#add-item-form').validate({
        rules: {
            itemName: {
                minlength: 2,
                required: true
            },
            location: {
                minlength: 6,
                required: true
            },
            expiry: {
                required: true
            },
            prefTimes: {
                required: true
            },
            description: {
                required: false
            }
        },
        highlight: function (element) {
            $(element).closest('.control-group').removeClass('success').addClass('error');
        },
        success: function (element) {
            element.text('OK!').addClass('valid')
                .closest('.control-group').removeClass('error').addClass('success');
        }
    });

});
