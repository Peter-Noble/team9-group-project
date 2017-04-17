var tags = [];

$.get("/api/all-tags", function(data) {
    for (var i in data) {
        tags.push(data[i].Tag_Name);
    }
})

var input = $("#tagInput").get(0);
var optionsVal = $("#tagsList").get(0);

var addedTags = [];

$("#tagsList").click(function () {
    addTag(this.value);
    input.value = "";
    updateTagsDropdown();

})

//Use this function to replace potential characters that could break the regex
RegExp.escape = function (s) {
    return s.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
};

function updateTagsDropdown() {
    var dropdown = $(".dropdown").get(0);
    dropdown.style.display = "none";

    optionsVal.options.length = 0;

    if (input.value) {
        dropdown.style.display = "block";
        optionsVal.size = 3;
        var text = input.value;

        var testableRegExp = new RegExp(RegExp.escape(text), "i");
        for (var i = 0; i < tags.length; i++) {
            if (tags[i].match(testableRegExp)) {
                addValue(tags[i]);
            }
        }

        var size = dropdown.children[0].children;
        if (size.length > 0) {
            var defaultSize = 16;
            if (size.length < 10) {
                defaultSize *= size.length;
            } else {
                defaultSize *= 10;
            }
            dropdown.children[0].style.height = defaultSize + "px";
        }
    }
}

$("#tagInput").keyup(updateTagsDropdown);

function addValue(text) {
    $("#tagsList").append($("<option>")
                            .attr("value", text)
                            .text(text));
}

function addTag(val) {
    var index = addedTags.indexOf(val);
    if (index == -1) {
        $(".selectedTags").append($("<a>")
                                    .text(val)
                                    .addClass("label label-success")
                                    .mouseup(function() {
                                        var text = $(this).text();
                                        var index = addedTags.indexOf(text);
                                        if (index > -1) {
                                            addedTags.splice(index, 1);
                                            $(".selectedTags").find("a").slice(index, index+1).remove();
                                            $("#selectedTagsSubmit").get(0).value = addedTags.join();
                                        }
                                    }))
        addedTags.push(val);
        $("#selectedTagsSubmit").get(0).value = addedTags.join();
    }
}

function updateselectedTagsSubmit() {
    $("#selectedTagsSubmit").value;
}
