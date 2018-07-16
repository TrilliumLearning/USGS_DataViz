 var x = document.getElementById("myListContinent");
    var option = document.createElement("option");
    $.ajax({
        url: "ContinentList",
        dataType: 'json',
        success: function (results) {
            for (i = 0; i < results.length; i++) {
                option.text = results[i].ContinentName;
                x.add(option);
            }
        }
    });

$(document).ready(function () {
    $("#myListContinent").change(function () {
        var val = $(this).val();
        // console.log(val);
        if (val == "AL"){
            $("#myListCountry").html("<option value='AL'> All Layer </option>");
            $("#myListState").html("<option value= 'AL'> All Layer </option>");
        }else{
            $("#myListCountry").html("<option value = 'SAS'> -Select a Country- </option>");
            $("#myListState").html("<option> -Select a State- </option>");
        }
    });
    $("#myListCountry").change(function () {
        var value = $(this).val();
        console.log(value);
        if (value == "SAS"){
            $("#myListState").html("<option> -Select a State-</option>");
            document.getElementById("myListState").disabled = true;
            document.getElementById("myListState").style.backgroundColor = "lightgray";
            $('.Menu').show();
        }else{
            $("#myListState").html("<option> -Select a State- </option>");
        }
    });
});



function getObjects(obj, key, val) {
    var objects = [];
    for (var i in obj) {
        if (!obj.hasOwnProperty(i)) continue;
        if (typeof obj[i] == 'object') {
            objects = objects.concat(getObjects(obj[i], key, val));
        } else
        //if key matches and value matches or if key matches and value is not passed (eliminating the case where key matches but passed value does not)
        if (i == key && obj[i] == val || i == key && val == '') { //
            objects.push(obj);
        } else if (obj[i] == val && key == '') {
            //only add if the object is not already in the array
            if (objects.lastIndexOf(obj) == -1) {
                objects.push(obj);
            }
        }
    }
    return objects;
}

function ChangeSelectList(continentlevel) {
    console.log(continentlevel);
    var countryList = document.getElementById("myListCountry");
    while (countryList.options.length) {
        countryList.remove(0);
    }
    $.ajax({
        url: "CountryList",
        dataType: 'json',
        success: function (results) {
            console.log(results);
            var option;
            for (var i = 0; i < results.length; i++) {
                if (continentlevel === results[i]. ContinentName) {
                        option = new Option(results[i].CountryName, results[i].CountryName);
                        countryList.add(option);
                        $('.Menu').hide();
                        document.getElementById("myListCountry").disabled = false;
                        document.getElementById("myListCountry").style.backgroundColor = "white";
                }
            }
        }
    });
    if (continentlevel === "AL") {
        $('.Menu').show();
        document.getElementById("myListCountry").disabled = true;
        document.getElementById("myListCountry").style.backgroundColor = "lightgray";
        document.getElementById("myListState").disabled = true;
        document.getElementById("myListState").style.backgroundColor = "lightgray";
    }
}

function ChangeStateList(countrylevel) {
    console.log(countrylevel);
    var stateList = document.getElementById("myListState");
    while (stateList.options.length) {
        stateList.remove(0);
    }
    $.ajax({
        url: "ChangeStateName",
        dataType: 'json',
        success: function (results) {
            // console.log(results);
            var option;
            for (var i = 0; i < results.length; i++) {
                if (countrylevel === results[i].CountryName) {
                    option = new Option(results[i].StateName, results[i].StateName);
                    stateList.add(option);
                    $('.Menu').hide();
                    document.getElementById("myListState").disabled = false;
                    document.getElementById("myListState").style.backgroundColor = "white";
                }
            }
        }
    });

    $.ajax({
        url: "StateList",
        success: function (res) {
            var returnStateObj1 = getObjects(res, 'CountryName', countrylevel);
            console.log(returnStateObj1);
                localStorage.setItem("returnvalue",JSON.stringify(returnStateObj1));
        }
    });
}

function ChangeLayerList(statelevel) {
    // console.log(citylevel);
    var returnvalue = JSON.parse(localStorage.getItem("returnvalue"));
    // console.log(returnvalue);
    $('.Menu').hide();
    $('.State').hide();
    for(var i =0; i< returnvalue.length; i++) {
        if (statelevel === returnvalue[i].StateName) {
            console.log(returnvalue[i].StateName);
            // console.log("work2");
            var obj1 = returnvalue[i].FirstLayer;
            var obj2 = returnvalue[i].SecondLayer;
            var obj3 = returnvalue[i].StateName + returnvalue[i].CountryName;
            console.log(obj3);
            // console.log(i);
            var className1 = '.' + obj1;
            var className2 = '.' + obj2;
            var className4 = '.' + obj3;
            console.log(className4);
            $(className1).show();
            $(className2).show();
            $(className4).show();
        }
    }
}



