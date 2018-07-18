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

        // Web Map Service information from NASA's Near Earth Observations WMS
        // var serviceAddress = "http://cs.aworldbridgelabs.com:8080/geoserver/ows?service=WMS&request=GetCapabilities&version=1.1.1";
        var serviceAddress = "http://cs.aworldbridgelabs.com:8080/geoserver/ows?service=wms&version=1.3.0&request=GetCapabilities";

        var layerName = [];
        var preloadLayer = [];
        var Position = [];
        var layers = globe.layers;

        $(document).ready(function () {
            $(".wmsLayer").each(function (i) {
                preloadLayer[i] = $(this).val();
            });

            var strs = preloadLayer + '';

            layerName = strs.split(",");

            $('.wmsLayer').click(function(){
                for (var a = 0; a < layers.length; a++) {
                    if ($('.wmsLayer').is(":checkbox:checked")) {
                        $(':checkbox:checked').each(function () {
                            console.log(layers);
                            if (layers[a].displayName === $(this).val()) {
                                layers[a].enabled = true;
                            }
                        });
                    }

                    if($('.wmsLayer').is(":not(:checked)")) {
                        $(":checkbox:not(:checked)").each(function (i) {
                            if (layers[a].displayName === $(this).val()) {
                                layers[a].enabled = false;
                            }
                        })
                    }
                }

                for(var c = 0; c < layerName.length; c ++) {
                    if ($('.wmsLayer').is(":checkbox:checked")) {
                        $(':checkbox:checked').each(function () {
                            if (Position[c][0] === $(this).val()) {
                                if (Position[c][1].westBoundLongitude < 0 && Position[c][1].eastBoundLongitude < 0 && Position[c][1].northBoundLatitude < 0 && Position[c][1].southBoundLatitude < 0) {
                                    var Getlatitude = (Position[c][1].northBoundLatitude + Position[c][1].southBoundLatitude) / 2;
                                    var GetLongitude = (Position[c][1].westBoundLongitude + Position[c][1].eastBoundLongitude) / 2;

                                    globe.goTo(new WorldWind.Location(Getlatitude, GetLongitude));
                                    console.log("1")
                                } else if(Position[c][1].westBoundLongitude > 0 && Position[c][1].eastBoundLongitude > 0 && Position[c][1].northBoundLatitude > 0 && Position[c][1].southBoundLatitude > 0){
                                    Getlatitude = (Position[c][1].northBoundLatitude + Position[c][1].southBoundLatitude) / 2;
                                    GetLongitude = (Position[c][1].westBoundLongitude + Position[c][1].eastBoundLongitude) / 2;

                                    globe.goTo(new WorldWind.Location(Getlatitude, GetLongitude));
                                    console.log("2")
                                }else if (Position[c][1].eastBoundLongitude > 0 && Position[c][1].westBoundLongitude < 0 && Position[c][1].northBoundLatitude > 0 && Position[c][1].southBoundLatitude < 0){
                                    Getlatitude = (Position[c][1].eastBoundLongitude - Position[c][1].westBoundLongitude) / 2;
                                    GetLongitude = (Position[c][1].northBoundLatitude - Position[c][1].southBoundLatitude) / 2;

                                    globe.goTo(new WorldWind.Location(Getlatitude, GetLongitude));
                                    console.log("3")
                                }else if(Position[c][1].westBoundLongitude < 0 && Position[c][1].eastBoundLongitude < 0 && Position[c][1].northBoundLatitude > 0 && Position[c][1].southBoundLatitude > 0){
                                    Getlatitude = (Position[c][1].northBoundLatitude + Position[c][1].southBoundLatitude) / 2;
                                    GetLongitude = (Position[c][1].westBoundLongitude + Position[c][1].eastBoundLongitude) / 2;

                                    globe.goTo(new WorldWind.Location(Getlatitude, GetLongitude));
                                    console.log("4")
                                }else if (Position[c][1].westBoundLongitude < 0 && Position[c][1].eastBoundLongitude < 0 && Position[c][1].northBoundLatitude > 0 && Position[c][1].southBoundLatitude < 0){
                                    Getlatitude = (Position[c][1].northBoundLatitude - Position[c][1].southBoundLatitude) / 2;
                                    GetLongitude = (Position[c][1].westBoundLongitude + Position[c][1].eastBoundLongitude) / 2;

                                    globe.goTo(new WorldWind.Location(Getlatitude, GetLongitude));
                                    console.log("5")
                                }else if(Position[c][1].westBoundLongitude > 0 && Position[c][1].eastBoundLongitude > 0 && Position[c][1].northBoundLatitude < 0 && Position[c][1].southBoundLatitude < 0){
                                    Getlatitude = (Position[c][1].northBoundLatitude + Position[c][1].southBoundLatitude) / 2;
                                    GetLongitude = (Position[c][1].westBoundLongitude + Position[c][1].eastBoundLongitude) / 2;

                                    globe.goTo(new WorldWind.Location(Getlatitude, GetLongitude));
                                    console.log("6")
                                }else if(Position[c][1].westBoundLongitude > 0 && Position[c][1].eastBoundLongitude > 0 && Position[c][1].northBoundLatitude > 0 && Position[c][1].southBoundLatitude < 0){
                                    Getlatitude = (Position[c][1].northBoundLatitude - Position[c][1].southBoundLatitude) / 2;
                                    GetLongitude = (Position[c][1].westBoundLongitude + Position[c][1].eastBoundLongitude) / 2;

                                    globe.goTo(new WorldWind.Location(Getlatitude, GetLongitude));
                                    console.log("7")
                                }else if(Position[c][1].eastBoundLongitude > 0 && Position[c][1].westBoundLongitude < 0 && Position[c][1].northBoundLatitude > 0 && Position[c][1].southBoundLatitude > 0){
                                    Getlatitude = (Position[c][1].northBoundLatitude + Position[c][1].southBoundLatitude) / 2;
                                    GetLongitude = (Position[c][1].westBoundLongitude - Position[c][1].eastBoundLongitude) / 2;

                                    globe.goTo(new WorldWind.Location(Getlatitude, GetLongitude));
                                    console.log("8")
                                }else if(Position[c][1].eastBoundLongitude > 0 && Position[c][1].westBoundLongitude < 0 && Position[c][1].northBoundLatitude < 0 && Position[c][1].southBoundLatitude < 0){
                                    Getlatitude = (Position[c][1].northBoundLatitude + Position[c][1].southBoundLatitude) / 2;
                                    GetLongitude = (Position[c][1].westBoundLongitude - Position[c][1].eastBoundLongitude) / 2;

                                    globe.goTo(new WorldWind.Location(Getlatitude, GetLongitude));
                                    console.log("9")
                                }
                            }
                        });
                    }
                }

            });
        });

        var wmsLayerCapabilities;
        var createWMSLayer = function (xmlDom) {
            // Create a WmsCapabilities object from the XML DOM
            var wms = new WorldWind.WmsCapabilities(xmlDom);

            // Retrieve a WmsLayerCapabilities object by the desired layer name
            for (var n = 0; n < layerName.length; n++) {

                wmsLayerCapabilities = wms.getNamedLayers();

                // Form a configuration object from the WmsLayerCapability object
                var wmsConfig = WorldWind.WmsLayer.formLayerConfiguration(wmsLayerCapabilities[n]);

                // Modify the configuration objects title property to a more user friendly title
                wmsConfig.title = layerName[n];

                // Create the WMS Layer from the configuration object
                var wmsLayer = new WorldWind.WmsLayer(wmsConfig);

                // Add the layers to WorldWind and update the layer manager
                globe.addLayer(wmsLayer);
                layerManager.synchronizeLayerList();
            }
        };

        // The common gesture-handling function.
        var handleClick = function () {
            for(var i = 0; i < layerName.length; i++) {
                var geographicBoundingBox = wmsLayerCapabilities[i].geographicBoundingBox;
                var LayerName = wmsLayerCapabilities[i].name;
                var GOTOLayerName = LayerName.split(",");
                GOTOLayerName.push(geographicBoundingBox);
                Position.push(GOTOLayerName);
            }
        };

        // Called if an error occurs during WMS Capabilities document retrieval
        var logError = function (jqXhr, text, exception) {
            console.log("There was a failure retrieving the capabilities document: " + text + " exception: " + exception);
        };

        $.get(serviceAddress).done(createWMSLayer,handleClick).fail(logError);

    });
