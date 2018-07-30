    let Continentlevel, Countrylevel,continentObj1,continentObj2;

    $(document).ready(function() {
        let x = document.getElementById("myListContinent");
        $.ajax({
            url: "ContinentList",
            dataType: 'json',
            success: function (results) {
                let option;
                for (let i = 0; i < results.length; i++) {
                    option = new Option(results[i].ContinentName, results[i].ContinentName);
                    x.add(option);
                }
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
        Continentlevel = continentlevel;
        $('.Menu').hide();
        $('.State').hide();
        var countryList = document.getElementById("myListCountry");
        while (countryList.options.length) {
            countryList.remove(0);
        }

        if (continentlevel === "AL"){
            $("#myListCountry").html("<option value='AL'> All Layer </option>");
            $("#myListState").html("<option value= 'AL'> All Layer </option>");
            document.getElementById("myListCountry").disabled = true;
            document.getElementById("myListCountry").style.backgroundColor = "lightgray";
            document.getElementById("myListState").disabled = true;
            document.getElementById("myListState").style.backgroundColor = "lightgray";
            $('.Menu').show();
            $('.State').show();
        } else{
            $("#myListCountry").html("<option value = 'SAS'> -Select a Country- </option>");
            $("#myListState").html("<option> -Select a State- </option>");
            document.getElementById("myListCountry").disabled = false;
            document.getElementById("myListCountry").style.backgroundColor = "white";
            $('.Menu').hide();
        }

        $.ajax({
            url: "CountryList",
            dataType: 'json',
            success: function (results) {
                var option;
                for (var i = 0; i < results.length; i++) {
                    if (continentlevel === results[i].ContinentName) {
                        option = new Option(results[i].CountryName, results[i].CountryName);
                        countryList.add(option);
                        if(continentlevel === "All Continents"){
                            $.ajax({
                                url: "ClassName",
                                success: function (res) {
                                    console.log(res);
                                    continentObj1 = res;
                                }
                            })
                        }else{
                            $.ajax({
                                url: "ClassName",
                                success: function (res) {
                                    continentObj1 = getObjects(res, 'ContinentName', continentlevel);
                                    // localStorage.setItem("returnvalue1",JSON.stringify(continentObj1));
                                }
                            });
                        }
                    }
                }
            }
        });
    }

    function ChangeStateList(countrylevel) {
        Countrylevel = countrylevel;
        // var returnvalue1 = JSON.parse(localStorage.getItem("returnvalue1"));
        $('.Menu').hide();
        $('.State').hide();
        var stateList = document.getElementById("myListState");
        while (stateList.options.length) {
            stateList.remove(0);
        }
        console.log(countrylevel);
        if (countrylevel === "SAS"){
            $("#myListState").html("<option> -Select a State-</option>");
            document.getElementById("myListState").disabled = true;
            document.getElementById("myListState").style.backgroundColor = "lightgray";
        } else{
            $("#myListState").html("<option> -Select a State- </option>");
            document.getElementById("myListState").disabled = false;
            document.getElementById("myListState").style.backgroundColor = "white";
        }

        $.ajax({
            url: "StateList",
            dataType: 'json',
            success: function (results) {
                console.log(results);
                for(var j = 0; j < results.length; j++){
                    if(countrylevel === results[j].CountryName){
                        var option = new Option(results[j].StateName, results[j].StateName);
                        stateList.add(option);
                    }
                }
            }
        });

        for(var i = 0; i < continentObj1.length; i++){
            if(Continentlevel === continentObj1[i].ContinentName && countrylevel === continentObj1[i].CountryName){
                if(countrylevel === "All Countries"){
                    continentObj2 = continentObj1;
                }else{
                    continentObj2 = getObjects(continentObj2, 'CountryName', countrylevel);
                    localStorage.setItem("returnvalue2",JSON.stringify(continentObj2));
                }
            }
        }
    }

    function ChangeLayerList(statelevel) {
        $('.Menu').hide();
        $('.State').hide();

        var returnvalue2 = JSON.parse(localStorage.getItem("returnvalue2"));
        console.log(returnvalue2);

        for(var i =0; i< returnvalue2.length; i++) {
            if(Continentlevel === returnvalue2[i].ContinentName && Countrylevel === continentObj2[i].CountryName) {
                if(Countrylevel === returnvalue2[i].CountryName) {
                    if (statelevel === returnvalue2[i].StateName) {
                        var obj1 = returnvalue2[i].FirstLayer;
                        var obj2 = returnvalue2[i].SecondLayer;
                        var obj3 = returnvalue2[i].ThirdLayer;
                        var className1 = '.' + obj1;
                        var className2 = '.' + obj2;
                        var className3 = '.' + obj3;
                        $(className1).show();
                        $(className2).show();
                        $(className3).show();
                    }
                }
            }
        }
    }

