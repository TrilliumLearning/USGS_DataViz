    let Continentlevel, Countrylevel;

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

        $("#myListContinent").change(function () {
            let val = $(this).val();
            if (val == "AL"){
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
        });

        $("#myListCountry").change(function () {
            var value = $(this).val();
            if (value == "SAS"){
                $("#myListState").html("<option> -Select a State-</option>");
                document.getElementById("myListState").disabled = true;
                document.getElementById("myListState").style.backgroundColor = "lightgray";
                $('.Menu').show();
                $('.State').show();
            } else{
                $("#myListState").html("<option> -Select a State- </option>");
                document.getElementById("myListState").disabled = false;
                document.getElementById("myListState").style.backgroundColor = "white";
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
        var countryList = document.getElementById("myListCountry");
        while (countryList.options.length) {
            countryList.remove(0);
        }
        $.ajax({
            url: "CountryList",
            dataType: 'json',
            success: function (results) {
                var option;
                for (var i = 0; i < results.length; i++) {
                    if (continentlevel === results[i].ContinentName) {
                        option = new Option(results[i].CountryName, results[i].CountryName);
                        console.log(option);
                        countryList.add(option);
                        if(continentlevel === "All Continents") {
                            $('.Menu').show();
                            $('.State').show();
                        } else{
                            $.ajax({
                                url: "ClassName",
                                success: function (res) {
                                    var continentObj1 = getObjects(res, 'ContinentName', continentlevel);
                                    localStorage.setItem("returnvalue1",JSON.stringify(continentObj1));
                                }
                            });
                        }
                    }
                }
            }
        });
    }

    function ChangeStateList(countrylevel) {
        var stateList = document.getElementById("myListState");
        while (stateList.options.length) {
            stateList.remove(0);
        }
        var returnvalue1 = JSON.parse(localStorage.getItem("returnvalue1"));
        var option;
        for(var i = 0; i < returnvalue1.length; i++){
            if(countrylevel === returnvalue1[i].CountryName) {
                console.log(returnvalue1);
                console.log("work?");
               option = new Option(returnvalue1[i].StateName,returnvalue1[i].StateName);
               console.log(option);
                stateList.add(option);
                if (countrylevel === "All Countries") {
                    $('.Menu').show();
                    $('.State').show();
                }else{
                    let continentnamestr = returnvalue1[i].ContinentName.replace(/\s+/g, '');
                    let countrynamestr = returnvalue1[i].CountryName.replace(/\s+/g, '');
                    var obj1 = returnvalue1[i].FirstLayer;
                    var obj2 = returnvalue1[i].SecondLayer;
                    var obj3 = continentnamestr + "." + countrynamestr;
                    var className1 = '.' + obj1;
                    var className2 = '.' + obj2;
                    var className3 = '.' + obj3;
                    $(className1).show();
                    $(className2).show();
                    $(className3).show();
                    var continentObj2 = getObjects(returnvalue1, 'ContinentName', countrylevel);
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
        for(var i =0; i< returnvalue.length; i++) {
            if(Continentlevel === returnvalue[i].ContinentName) {
                if(Countrylevel === returnvalue[i].CountryName) {
                    if (statelevel === returnvalue[i].StateName) {
                        let continentnamestr = returnvalue[i].ContinentName.replace(/\s+/g, '');
                        let countrynamestr = returnvalue[i].CountryName.replace(/\s+/g, '');
                        let statenamestr = returnvalue[i].StateName.replace(/\s+/g, '');
                        var obj1 = returnvalue[i].FirstLayer;
                        var obj2 = returnvalue[i].SecondLayer;
                        var obj3 = statenamestr + countrynamestr + continentnamestr;
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

