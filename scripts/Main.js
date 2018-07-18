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
        var westBoundLongitude, eastBoundLongitude, southBoundLatitude, northBoundLatitude;
        var Longitude, Latitude;
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
            });
        });

        var createWMSLayer = function (xmlDom) {
            // Create a WmsCapabilities object from the XML DOM
            var wms = new WorldWind.WmsCapabilities(xmlDom);

            // Retrieve a WmsLayerCapabilities object by the desired layer name
            for (var n = 0; n < layerName.length; n++) {
                var wmsLayerCapabilities = wms.getNamedLayers();

                //get all the bound value
                westBoundLongitude = wmsLayerCapabilities[n].geographicBoundingBox.westBoundLongitude;
                eastBoundLongitude = wmsLayerCapabilities[n].geographicBoundingBox.eastBoundLongitude;
                southBoundLatitude = wmsLayerCapabilities[n].geographicBoundingBox.southBoundLatitude;
                northBoundLatitude = wmsLayerCapabilities[n].geographicBoundingBox.northBoundLatitude;

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
            console.log(northBoundLatitude);
            console.log(southBoundLatitude);
            Longitude = (northBoundLatitude - southBoundLatitude) / 2;
            console.log(Longitude);
            Latitude = (westBoundLongitude - eastBoundLongitude) / 2;
        };

        // The common gesture-handling function.
        var handleClick = function (recognizer) {
            // Obtain the event location.
            var x = recognizer.Longitude,
                y = recognizer.Latitude;
        };
            // Perform the pick. Must first convert from window coordinates to canvas coordinates, which are
            // relative to the upper left corner of the canvas rather than the upper left corner of the page.
            // var pickList = wwd.pick(wwd.canvasCoordinates(x, y));

        //     // If only one thing is picked and it is the terrain, tell the WorldWindow to go to the picked location.
        //     if (pickList.objects.length === 1 && pickList.objects[0].isTerrain) {
        //         var position = pickList.objects[0].position;
        //         wwd.goTo(new WorldWind.Location(position.latitude, position.longitude));
        //     }
        // };
        //
        // // Listen for mouse clicks.
        // var clickRecognizer = new WorldWind.ClickRecognizer(wwd, handleClick);
        //
        // // Listen for taps on mobile devices.
        // var tapRecognizer = new WorldWind.TapRecognizer(wwd, handleClick);
        //
        // // Create a layer manager for controlling layer visibility.
        // var layerManager = new LayerManager(wwd);

        // Called if an error occurs during WMS Capabilities document retrieval
        var logError = function (jqXhr, text, exception) {
            console.log("There was a failure retrieving the capabilities document: " + text + " exception: " + exception);
        };


        $.get(serviceAddress).done(createWMSLayer).fail(logError);

    });
