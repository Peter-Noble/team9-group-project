$(document).ready(function() {

    function getMonth (fullDate) {
        return ((fullDate.getMonth().length+1) === 1)? (fullDate.getMonth()+1) : '0' + (fullDate.getMonth()+1);
    }

    // check that a date entered is in the future (or today's date)
    jQuery.validator.addMethod("inFuture", function(value, element, params) {
        var input = new Date(value);
        var today = params;
        if (input.getFullYear() < today.getFullYear()) {
            return false;
        } else if (input.getFullYear() > today.getFullYear()) {
            return true;
        } else if (getMonth(input) < getMonth(today)) {
            return false;
        } else if (getMonth(input) > getMonth(today)) {
            return true;
        } else if (input.getDate() < today.getDate()) {
            return false;
        } else {
            return true;
        }
    },"Must be greater than today's date!");

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
                inFuture: new Date()
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
