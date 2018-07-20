requirejs(['./worldwind.min',
        './LayerManager',
        './RadiantCircleTile'],
    function (WorldWind,
              LayerManager,
              RadiantCircleTile) {
        "use strict";

        $(document).ready(function() {
            $(function () {

                var placemark = [];

                // Tell WorldWind to log only warnings and errors.
                WorldWind.Logger.setLoggingLevel(WorldWind.Logger.LEVEL_WARNING);

                // Create the WorldWindow.
                var wwd = new WorldWind.WorldWindow("canvasOne");

                // Create and add layers to the WorldWindow.
                var layers = [
                    // Imagery layers.
                    {layer: new WorldWind.BMNGLayer(), enabled: true},
                    {layer: new WorldWind.BMNGLandsatLayer(), enabled: true},
                    // {layer: new WorldWind.BingAerialLayer(null), enabled: false},
                    {layer: new WorldWind.BingAerialWithLabelsLayer(null), enabled: true},
                    // {layer: new WorldWind.BingRoadsLayer(null), enabled: false},
                    // {layer: new WorldWind.OpenStreetMapImageLayer(null), enabled: false},
                    // Add atmosphere layer on top of all base layers.
                    {layer: new WorldWind.AtmosphereLayer(), enabled: true},
                    // WorldWindow UI layers.
                    {layer: new WorldWind.CompassLayer(), enabled: true},
                    {layer: new WorldWind.CoordinatesDisplayLayer(wwd), enabled: true},
                    {layer: new WorldWind.ViewControlsLayer(wwd), enabled: true}
                ];

                for (var l = 0; l < layers.length; l++) {
                    layers[l].layer.enabled = layers[l].enabled;
                    wwd.addLayer(layers[l].layer);
                }

                $("#none, #p_year, #p_avgcap, #t_ttlh").on("click", function () {
                    var category = this.id;
                    // console.log(category);
                    var color = {
                        "grey": "rgba(192, 192, 192, 0.25)",
                        "blue": "rgba(0, 0, 255, 0.25)",
                        "green": "rgba(0, 255, 0, 0.25)",
                        "yellow": "rgba(255, 255, 0, 0.25)",
                        "orange": "rgba(255, 127.5, 0, 0.25)",
                        "red": "rgba(255, 0, 0, 0.25)",
                        'undefined': "rgba(255, 255, 255, 1)"
                    };

                    var scale = {
                        "none": ["", ""],
                        "p_year": ["1980", "2017"],
                        "p_avgcap": ["< 1MW", ">3 MW"],
                        "t_ttlh": ["5m", "185m"],
                    };

                    $("#leftScale").html(scale[category][0]);
                    $("#rightScale").html(scale[category][1]);

                    // console.log(color['undefined']);
                    // console.log(color[undefined]);
                    // console.log(color[placemark[0].userProperties["none"]]);

                    for (var i = 0; i < placemark.length; i++) {
                        var circle = document.createElement("canvas"),
                            ctx = circle.getContext('2d'),
                            radius = 10,
                            r2 = radius + radius;

                        circle.width = circle.height = r2;

                        var gradient = ctx.createRadialGradient(radius, radius, 0, radius, radius, radius);
                        gradient.addColorStop(0, color[placemark[i].userProperties[category]]);

                        ctx.beginPath();
                        ctx.arc(radius, radius, radius, 0, Math.PI * 2, true);

                        ctx.fillStyle = gradient;
                        ctx.fill();
                        // ctx.strokeStyle = "rgb(255, 255, 255)";
                        // ctx.stroke();

                        ctx.closePath();

                        placemark[i].attributes.imageSource.image = circle;
                        placemark[i].updateImage = true;

                        if (i === placemark.length - 1) {
                            // console.log("B");
                            // console.log(placemark);
                        }
                    }
                });

                $("#switchLayer").on("click", function () {
                    // this.checked, true: placemark, false: heatmap
                    // 10 basis layers
                    // console.log(this.checked + "   " + !this.checked);

                    document.getElementById("placemarkButton").style.pointerEvents = (this.checked === true) ? "auto" : "none";


                    for (var i = 10; i < wwd.layers.length; i++) {
                        if (i === wwd.layers.length - 1) {
                            wwd.layers[i].enabled = !this.checked;
                        } else {
                            wwd.layers[i].enabled = this.checked;
                        }
                    }
                });

                $.ajax({
                    url: 'http://localhost:9085/uswtdb',
                    type: 'GET',
                    dataType: 'json',
                    // data: data,
                    async: false,
                    success: function (resp) {
                        if (!resp.error) {
                            var data = [];
                            var layerNames = [];
                            var placemarkLayers = [];

                            var circle = document.createElement("canvas"),
                                ctx = circle.getContext('2d'),
                                radius = 10,
                                r2 = radius + radius;

                            circle.width = circle.height = r2;

                            var gradient = ctx.createRadialGradient(radius, radius, 0, radius, radius, radius);
                            gradient.addColorStop(0, "rgba(192, 192, 192, 0.25)");
                            // gradient.addColorStop(0.5, "rgba(0,0,0,0)");

                            ctx.beginPath();
                            ctx.arc(radius, radius, radius, 0, Math.PI * 2, true);

                            ctx.fillStyle = gradient;
                            ctx.fill();
                            // ctx.strokeStyle = "rgb(255, 255, 255)";
                            // ctx.stroke();

                            ctx.closePath();
                            // console.log(new Date());

                            // var placemarkLayer = new WorldWind.RenderableLayer("USWTDB");

                            for (var i = 0; i < resp.data.length; i++) {
                                data[i] = new WorldWind.IntensityLocation(resp.data[i].ylat, resp.data[i].xlong, 1);

                                var placemarkAttributes = new WorldWind.PlacemarkAttributes(null);
                                placemarkAttributes.imageSource = new WorldWind.ImageSource(circle);
                                placemarkAttributes.imageScale = 0.5;

                                var placemarkPosition = new WorldWind.Position(resp.data[i].ylat, resp.data[i].xlong, 0);
                                placemark[i] = new WorldWind.Placemark(placemarkPosition, false, placemarkAttributes);
                                placemark[i].altitudeMode = WorldWind.RELATIVE_TO_GROUND;
                                placemark[i].userProperties.p_year = resp.data[i].p_year_color;
                                placemark[i].userProperties.p_avgcap = resp.data[i].p_avgcap_color;
                                placemark[i].userProperties.t_ttlh = resp.data[i].t_ttlh_color;

                                // if ($.inArray(resp.data[i].p_name, layerNames) === -1) {
                                //     layerNames.push(resp.data[i].p_name);
                                //     placemarkLayers.push(new WorldWind.RenderableLayer(resp.data[i].p_name));
                                //     placemarkLayers[placemarkLayers.length - 1].enabled = false;
                                //     wwd.addLayer(placemarkLayers[placemarkLayers.length - 1]);
                                //     placemarkLayers[placemarkLayers.length - 1].addRenderable(placemark[i]);
                                // } else {
                                //     var index = $.inArray(resp.data[i].p_name, layerNames);
                                //     placemarkLayers[index].addRenderable(placemark[i]);
                                // }

                                if (i === 0 || resp.data[i].p_name !== resp.data[i - 1].p_name) {
                                    var placemarkLayer = new WorldWind.RenderableLayer(resp.data[i].p_name);
                                    // placemarkLayer.enabled = false;
                                    wwd.addLayer(placemarkLayer);
                                    wwd.layers[wwd.layers.length - 1].addRenderable(placemark[i]);
                                } else {
                                    wwd.layers[wwd.layers.length - 1].addRenderable(placemark[i]);
                                }

                                // placemarkLayer.addRenderable(placemark[i]);

                                if (i === resp.data.length - 1) {
                                    // wwd.addLayer(placemarkLayer);
                                    // console.log("A");
                                    // console.log(new Date());
                                    // console.log(layerNames);
                                    // console.log(wwd.layers.length);
                                    // console.log(wwd.layers);

                                    // var z = 10;
                                    // var x = z;
                                    // setTimeout(function() {
                                    //     var showLayers = setInterval(function() {
                                    //         console.log(new Date());
                                    //         x += 100;
                                    //         for (; z < x; z++) {
                                    //             wwd.layers[z].enabled = true;
                                    //
                                    //             if (z === wwd.layers.length - 1) {
                                    //                 console.log(new Date());
                                    //                 clearInterval(showLayers);
                                    //                 break;
                                    //             }
                                    //         }
                                    //         // wwd.redraw();
                                    //     }, 500);
                                    // }, 10000);

                                    console.log(data);
                                    var HeatMapLayer = new WorldWind.HeatMapLayer("Heatmap", data, {
                                        tile: RadiantCircleTile,
                                        incrementPerIntensity: 0.2,
                                        blur: 10,
                                        scale: ['rgba(255, 255, 255, 0)', 'rgba(172, 211, 236, 0.25)', 'rgba(204, 255, 255, 0.5)', 'rgba(77, 158, 25, 0.5)']
                                    });

                                    HeatMapLayer.enabled = false;

                                    wwd.addLayer(HeatMapLayer);

                                    console.log(wwd.layers);
                                }
                            }
                        }
                    }
                });

                $("#p_avgcap").click();
            })
        });
    });