$(document).ready(function () {
    var x = document.getElementById("myListCountry");
    var option = document.createElement("option");
    $.ajax({
        url: "http://localhost:9090/CountryList",
        dataType: 'json',
        success: function (results) {
            console.log(results);
            for (i = 0; i < results.length; i++) {
                option.text = results[i].CountryName;
                x.add(option);
            }
        }
    });
});

$(document).ready(function () {
    $("#myListCountry").change(function () {
        var val = $(this).val();
        // console.log(val);
        if (val == "AL"){
            $("#myListState").html("<option value='AL'> All Layer </option>");
            $("#myListCity").html("<option value= 'AL'> All Layer </option>");
        }else{
            $("#myListState").html("<option value = 'SAS'> -Select a State- </option>");
            $("#myListCity").html("<option> -Select a City- </option>");
        }
    });
    $("#myListState").change(function () {
        var value = $(this).val();
        console.log(value);
        if (value == "SAS"){
            $("#myListCity").html("<option> -Select a City-</option>");
            document.getElementById("myListCity").disabled = true;
            document.getElementById("myListCity").style.backgroundColor = "lightgray";
            $('.Menu').show();
        }else{
            $("#myListCity").html("<option> -Select a City- </option>");
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

function ChangeSelectList(countrylevel) {
    // console.log(countrylevel);
    var stateList = document.getElementById("myListState");
    while (stateList.options.length) {
        stateList.remove(0);
    }
    $.ajax({
        url: "http://localhost:9090/StateList",
        dataType: 'json',
        success: function (results) {
            console.log(results);
            var option;
            for (var i = 0; i < results.length; i++) {
                if (countrylevel === results[i]. CountryName) {
                        option = new Option(results[i].StateName, results[i].StateName);
                        stateList.add(option);
                        $('.Menu').hide();
                        document.getElementById("myListState").disabled = false;
                        document.getElementById("myListState").style.backgroundColor = "white";
                }
            }
        }
    });
    if (countrylevel === "AL") {
        $('.Menu').show();
        document.getElementById("myListState").disabled = true;
        document.getElementById("myListState").style.backgroundColor = "lightgray";
        document.getElementById("myListCity").disabled = true;
        document.getElementById("myListCity").style.backgroundColor = "lightgray";
    }
}

function ChangeStateList(statelevel) {
    console.log(statelevel);
    var cityList = document.getElementById("myListCity");
    while (cityList.options.length) {
        cityList.remove(0);
    }
    $.ajax({
        url: "http://localhost:9090/ChangeCityName",
        dataType: 'json',
        success: function (results) {
            // console.log(results);
            var option;
            for (var i = 0; i < results.length; i++) {
                if (statelevel === results[i].StateName) {
                    option = new Option(results[i].CityName, results[i].CityName);
                    cityList.add(option);
                    $('.Menu').hide();
                    document.getElementById("myListCity").disabled = false;
                    document.getElementById("myListCity").style.backgroundColor = "white";
                }
            }
        }
    });

    $.ajax({
        url: "http://localhost:9090/CityList",
        success: function (res) {
            var returnCityObj1 = getObjects(res, 'StateName', statelevel);
            console.log(returnCityObj1);
                localStorage.setItem("returnvalue",JSON.stringify(returnCityObj1));
        }
    });
}

function ChangeLayerList(citylevel) {
    // console.log(citylevel);
    var returnvalue = JSON.parse(localStorage.getItem("returnvalue"));
    // console.log(returnvalue);
    $('.Menu').hide();
    $('.State').hide();
    for(var i =0; i< returnvalue.length; i++) {
        if (citylevel === returnvalue[i].CityName) {
            console.log(returnvalue[i].CityName);
            // console.log("work2");
            var obj1 = returnvalue[i].FirstLayer;
            var obj2 = returnvalue[i].SecondLayer;
            var obj3 = returnvalue[i].CityName + returnvalue[i].StateName;
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



