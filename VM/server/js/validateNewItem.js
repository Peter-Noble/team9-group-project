$(document).ready(function() {

    // convert date to mm/dd/yyyy format
    function convertDateFormat (fullDate) {
        var twoDigitMonth = ((fullDate.getMonth().length+1) === 1)? (fullDate.getMonth()+1) : '0' + (fullDate.getMonth()+1);
        var currentDate = fullDate.getDate() + "/" + twoDigitMonth + "/" + fullDate.getFullYear();
        return currentDate
    }

    // check that a date entered is in the future (or today's date)
    jQuery.validator.addMethod("inFuture", function(value, element, params) {
        var input = convertDateFormat(new Date(value));
        return input >= params;
    },'Must be greater than {0}.');

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
                required: true,
                inFuture: convertDateFormat(new Date())
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
