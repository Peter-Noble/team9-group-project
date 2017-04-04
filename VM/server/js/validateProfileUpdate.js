$(document).ready(function () {

    $('#update-profile').validate({
        rules: {
            Name: {
                minlength: 2,
                required: true
            },
            Email: {
                required: true,
                email: true
            },
            Postcode: {
                minlength: 2,
                required: true
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
