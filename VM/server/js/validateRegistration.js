$(document).ready(function () {

    $('#registration-form').validate({
        rules: {
            username: {
                minlength: 2,
                required: true
            },
            name: {
                minlength: 2,
                required: true
            },
            email: {
                required: true,
                email: true
            },
            postcode: {
                minlength: 2,
                required: true
            },
            password: {
                minlength: 5
            },
            confirmPassword: {
                minlength: 5,
                equalTo: "#password"
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
