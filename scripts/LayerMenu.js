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
        var serviceAddress = "https://cors.aworldbridgelabs.com:9084/http://cs.aworldbridgelabs.com:8080/geoserver/ows?service=wms&version=1.3.0&request=GetCapabilities";

        var layerName = [];
        var preloadLayer = [];
        var layers = globe.layers;

        $(document).ready(function () {
            $(".wmsLayer").each(function (i) {
                preloadLayer[i] = $(this).val();
            });

            var strs = preloadLayer + '';

            layerName = strs.split(",");

            $('.wmsLayer').click(function () {
                for (var a = 0; a < layers.length; a++) {
                    if ($('.wmsLayer').is(":checkbox:checked")) {
                        $(':checkbox:checked').each(function () {
                            if (layers[a].displayName === $(this).val()) {
                                layers[a].enabled = true;
                                var layername = "layername=" + layers[a].displayName;
                                $.ajax({
                                    url: 'position',
                                    type: 'GET',
                                    dataType: 'json',
                                    data:layername,
                                    success: function (results) {
                                        var Altitude = results.Altitude * 1000;
                                        // globe.goTo(new WorldWind.Position(39.72,-100.89844));//US center
                                        // globe.goTo(new WorldWind.Position(54.953071,-130.385742));//all state center
                                        // globe.goTo(new WorldWind.Position(39.811046,-101.042378,1000));
                                        globe.goTo(new WorldWind.Position(results.Latitude,results.Longitude,Altitude));
                                    }
                                });
                            }
                        });
                    }

                    if ($('.wmsLayer').is(":not(:checked)")) {
                        $(":checkbox:not(:checked)").each(function () {
                            if (layers[a].displayName === $(this).val()) {
                                layers[a].enabled = false;
                            }
                        })
                    }
                }

            });

            var wmsLayerCapabilities;
            var createWMSLayer = function (xmlDom) {
                // Create a WmsCapabilities object from the XML DOM
                var wms = new WorldWind.WmsCapabilities(xmlDom);

                // Retrieve a WmsLayerCapabilities object by the desired layer name
                for (var n = 0; n < layerName.length; n++) {

                    wmsLayerCapabilities = wms.getNamedLayers();

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
