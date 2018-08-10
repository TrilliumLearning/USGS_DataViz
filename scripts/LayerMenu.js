/*
* Copyright 2015-2017 WorldWind Contributors
*
* Licensed under the Apache License, Version 2.0 (the "License");
* you may not use this file except in compliance with the License.
* You may obtain a copy of the License at
*
*     http://www.apache.org/licenses/LICENSE-2.0
*
* Unless required by applicable law or agreed to in writing, software
* distributed under the License is distributed on an "AS IS" BASIS,
* WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
* See the License for the specific language governing permissions and
* limitations under the License.
*/

requirejs(['./WorldWindShim',
        './LayerManager',
        './OptionList',
        '../src/heatmap/GlobeInterface',
        '../src/heatmap/Globe',
        '../src/heatmap/Controls',
        '../src/heatmap/HeatmapPanel',
        '../src/ogc/wms/WmsLayerCapabilities'
        ],
    function (WorldWind,
              LayerManager,
              OptionList,
              GlobeInterface,
              Globe,
              Controls,
              HeatmapPanel) {
        "use strict";

        var globe = new Globe({id: "canvasOne"});
        var controls = new Controls(globe);
        var gInterface = new GlobeInterface(globe);
        // var heatmapPanel = new HeatmapPanel(globe, gInterface.globe.navigator, gInterface.globe.worldWindowController, controls);

        // Create a layer manager for controlling layer visibility.
        var layerManager = new LayerManager(globe);

        //Tell wouldwind to log only warnings and errors.
        WorldWind.Logger.setLoggingLevel(WorldWind.Logger.LEVEL_WARNING);

        globe.goTo(new WorldWind.Position(37.0902, -95.7129, 9000000));

        // Web Map Service information from NASA's Near Earth Observations WMS
        // var serviceAddress = "http://cs.aworldbridgelabs.com:8080/geoserver/ows?service=WMS&request=GetCapabilities&version=1.1.1";
        var serviceAddress = "https://cors.aworldbridgelabs.com/http://cs.aworldbridgelabs.com:8080/geoserver/ows?service=wms&version=1.3.0&request=GetCapabilities";

        var layerName = [];
        var preloadLayer = [];
        var layers = globe.layers;
        var checked = [];
        var val;
        var alertVal = true;
        var LayerSelected;
        var ThirdLayer = [];
        var j = 0;
        var LayerPosition = [];
        var Altitude;


        $(document).ready(function () {
            document.getElementById("openedLayer").value = "No Layer Selected";
            document.getElementById("previousL").disabled = true;
            document.getElementById("nextL").disabled = true;

            $(".wmsLayer").each(function (i) {
                preloadLayer[i] = $(this).val();
            });

            $('#previousL').click(function(){
                document.getElementById("nextL").disabled = false;
                if(j < 1){
                    document.getElementById("previousL").disabled = true;
                }else{
                    j = j - 1;
                    document.getElementById("openedLayer").value = ThirdLayer[j];
                    if (j === 0){
                        document.getElementById("previousL").disabled = true;
                        // document.getElementById("previousL").style.color = "#ddd"
                    }
                }
            });

            $('#nextL').click(function(){
                if(j !== ThirdLayer.length - 1){
                    if(j === ThirdLayer.length - 2){
                        document.getElementById("nextL").disabled = true;
                    }
                    j = j + 1;
                    document.getElementById("previousL").disabled = false;
                    document.getElementById("openedLayer").value = ThirdLayer[j];
                }else{
                    document.getElementById("nextL").disabled = true;
                }
            });

            var strs = preloadLayer + '';

            layerName = strs.split(",");
            var checkedCount = 0;
            var currentCheckedArray;
            $('.wmsLayer').click(function () {
                var layer1 = $(this).val();
                currentCheckedArray = $(':checkbox:checked');

                if (currentCheckedArray.length > 0 && alertVal){
                    confirm("Some layers may take awhile to load. Please be patient.")
                }

                var layername = "layername=" + layer1;
                $.ajax({
                    url: 'position',
                    type: 'GET',
                    dataType: 'json',
                    data:layername,
                    async: false,
                    success: function (results) {
                        LayerSelected = results;
                        console.log(LayerSelected.FirstLayer);
                    }
                });


                if (currentCheckedArray.length > checkedCount){
                    checked.push(layer1); //insert current value to checked
                    val = checked[checked.length - 1];
                    checkedCount = currentCheckedArray.length;
                    alertVal = false;
                    document.getElementById("openedLayer").value =  LayerSelected.ThirdLayer;
                    ThirdLayer.push(LayerSelected.ThirdLayer);//insert current ThirdLayer value to ThirdLayer
                    j = ThirdLayer.length - 1;
                    if(ThirdLayer.length === 1){
                        document.getElementById("nextL").disabled = true;
                        document.getElementById("previousL").disabled = true;
                    }else{
                        document.getElementById("previousL").disabled = false;
                        document.getElementById("nextL").disabled = true;
                    }
                    LayerPosition.push(LayerSelected);
                    console.log(LayerPosition);
                } else {
                    for( var i = 0 ; i < checked.length; i++) {
                        if (checked[i] === layer1) {
                            checked.splice(i,1); //remove current value from checked array
                            ThirdLayer.splice(i,1); //remove current ThirdLayer from the array
                        }
                    }
                    // val = checked[checked.length - 1];
                    checkedCount = currentCheckedArray.length;
                    alertVal = false;
                    document.getElementById("openedLayer").value = ThirdLayer[ThirdLayer.length - 1];
                    j = ThirdLayer.length - 1;
                    if(ThirdLayer.length === 1){
                        document.getElementById("nextL").disabled = true;
                        document.getElementById("previousL").disabled = true;
                    }else{
                        document.getElementById("previousL").disabled = false;
                        document.getElementById("nextL").disabled = true;
                    }
                    if(ThirdLayer.length === 0){
                        document.getElementById("openedLayer").value = "No Layer Selected";
                        document.getElementById("previousL").disabled = true;
                        document.getElementById("nextL").disabled = true;
                        globe.goTo(new WorldWind.Position(37.0902, -95.7129, 10000));
                    }
                }


                for (var a = 0; a < layers.length; a++) {
                        $(':checkbox:checked').each(function () {
                            if (layers[a].displayName === $(this).val()) {
                                layers[a].enabled = true;
                            }
                        });
                        $(":checkbox:not(:checked)").each(function () {
                            if (layers[a].displayName === $(this).val()) {
                                layers[a].enabled = false;
                            }
                        })
                }

                Altitude = LayerSelected.Altitude * 1000;
                globe.goTo(new WorldWind.Position(LayerSelected.Latitude,LayerSelected.Longitude,Altitude));


                $('#openedLayer').click(function(){
                    for(var p = 0; p < LayerPosition.length; p++){
                        if (ThirdLayer[j] === LayerPosition[p].ThirdLayer){
                            Altitude = LayerPosition[p].Altitude * 1000;
                            globe.goTo(new WorldWind.Position(LayerPosition[p].Latitude,LayerPosition[p].Longitude,Altitude));
                        }
                    }
                    var a = document.getElementById("accordion").children; //eight layer menus

                    // console.log(a);

                    for(var i = 0;i < a.length; i++){
                        console.log(a[i].id);
                        // var c = a[i].className.split(' ');
                        // console.log(c[c.length - 1]);
                        if(LayerSelected.FirstLayer === a[i].id){

                            // var b = a[i].children;
                            // console.log(b);
                            // b[1].classList.add("in");
                            // b[1].setAttribute("aria-expanded","true");
                        }
                        // var b = document.getElementsByClassName(LayerSelected.LayerName);
                        // console.log(b);
                        var LAYER = document.getElementById(LayerSelected.ThirdLayer)
                        // console.log(LAYER.id);
                        // if(LayerSelected.ThirdLayer === LAYER.id){
                        //     b.classList.add("in");
                        //     b.setAttribute("aria-expanded","true");
                        // }
                    }

                    // $('.ColorShadedRelief').click();

                    // var b = a[1].children; //second layer menu small-scale's children
                    // var c = b[1].children; //class = panel-body
                    // var d = c[0].children; //id = nested1
                    // var e = d[0].children; //nine categories
                    // var f = e[0].children; //two divs
                    // var b = document.getElementById("collapse2");

                    // b.classList.add("in");
                    // b.setAttribute("aria-expanded","true");
                    // f[1].classList.add("in");
                    // f[1].setAttribute("aria-expanded","true");
                });

                // $('.Small_Scale-ColorShadedRelief h4').click(function() {
                //     console.log("123");
                //     $('#Small_Scale-ColorShadedRelief').collapse('toggle');
                //
                // })
            });


            var createWMSLayer = function (xmlDom) {
                // Create a WmsCapabilities object from the XML DOM
                var wms = new WorldWind.WmsCapabilities(xmlDom);

                // Retrieve a WmsLayerCapabilities object by the desired layer name
                for (var n = 0; n < layerName.length; n++) {

                    var wmsLayerCapability = wms.getNamedLayer(layerName[n]);

                    // Form a configuration object from the WmsLayerCapability object
                    var wmsConfig = WorldWind.WmsLayer.formLayerConfiguration(wmsLayerCapability);

                    // Modify the configuration objects title property to a more user friendly title
                    wmsConfig.title = layerName[n];

                    // Create the WMS Layer from the configuration object
                    var wmsLayer = new WorldWind.WmsLayer(wmsConfig);

                    // Add the layers to WorldWind and update the layer manager
                    globe.addLayer(wmsLayer);
                    layerManager.synchronizeLayerList();
                }
            };

            // Called if an error occurs during WMS Capabilities document retrieval
            var logError = function (jqXhr, text, exception) {
                console.log("There was a failure retrieving the capabilities document: " + text + " exception: " + exception);
            };

            $.get(serviceAddress).done(createWMSLayer).fail(logError);

        });
    });
