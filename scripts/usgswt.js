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
                var autoSuggestion = [];

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

                // var placemarkLayer = new WorldWind.RenderableLayer("Custom Placemark");
                //
                // var canvas = document.createElement("canvas"),
                //     ctx2d = canvas.getContext("2d"),
                //     size = 64, c = size / 2  - 0.5, innerRadius = 5, outerRadius = 20;
                //
                // canvas.width = size;
                // canvas.height = size;
                //
                // var gradient = ctx2d.createRadialGradient(c, c, innerRadius, c, c,   outerRadius);
                // gradient.addColorStop(0, 'rgba(204, 255, 255, 0.49)');
                // gradient.addColorStop(0.5, 'rgba(102, 153, 255, 0.25)');
                // gradient.addColorStop(1, 'rgba(102, 0, 255, 0.25)');
                // // gradient.addColorStop(0, 'rgb(204, 255, 255)');
                // // gradient.addColorStop(0.5, 'rgb(102, 153, 255)');
                // // gradient.addColorStop(1, 'rgb(102, 0, 255)');
                //
                // ctx2d.fillStyle = gradient;
                // ctx2d.arc(c, c, outerRadius, 0, 2 * Math.PI, false);
                // ctx2d.fill();
                //
                // var placemarkAttributes = new WorldWind.PlacemarkAttributes(null);
                // placemarkAttributes.imageSource = new WorldWind.ImageSource(canvas);
                // placemarkAttributes.imageScale = 0.5;
                //
                // var highlightAttributes = new WorldWind.PlacemarkAttributes(placemarkAttributes);
                // highlightAttributes.imageScale = 1.0;
                //
                // var placemarkPosition = new WorldWind.Position(0, 0, 0);
                // var placemarks = new WorldWind.Placemark(placemarkPosition, false, placemarkAttributes);
                // placemarks.altitudeMode = WorldWind.RELATIVE_TO_GROUND;
                // placemarks.highlightAttributes = highlightAttributes;
                // // placemarks[i].updateImage = true;
                // placemarkLayer.addRenderable(placemarks);
                // wwd.addLayer(placemarkLayer);
                // console.log(wwd.layers[7].renderables);
                //
                // function handleMouseCLK(o) {
                //
                //     // The input argument is either an Event or a TapRecognizer. Both have the same properties for determining
                //     // the mouse or tap location.
                //     var x = o.clientX,
                //         y = o.clientY;
                //
                //     // Perform the pick. Must first convert from window coordinates to canvas coordinates, which are
                //     // relative to the upper left corner of the canvas rather than the upper left corner of the page.
                //     // console.log(o.x, o.clientX, o.layerX, o.offsetX, o.pageX, o.screenX);
                //     // console.log(o.y, o.clientY, o.layerY, o.offsetY, o.pageY, o.screenY);
                //     // console.log(x + ", " + y + "   " + wwd.canvasCoordinates(x, y));
                //     var pickList = wwd.pick(wwd.canvasCoordinates(x, y));
                //     console.log(pickList.objects);
                //     for (var q = 0; q < pickList.objects.length; q++) {
                //         var pickedPL = pickList.objects[q].userObject;
                //         // console.log(pickedPL);
                //         if (pickedPL instanceof WorldWind.Placemark) {
                //             // console.log(pickedPL);
                //             // console.log("A");
                //             // autoZoom(pickedPL.position, pickedPL.userProperties);
                //         }
                //     }
                //
                //     pickList = [];
                // }
                //
                // // Listen for mouse double clicks placemarks and then pop up a new dialog box.
                // wwd.addEventListener("click", handleMouseCLK);

                $("#none, #p_year_color, #p_avgcap_color, #t_ttlh_color").on("click", function () {
                    var category = this.id;
                    // console.log(category);
                    var color = {
                        "grey": "rgba(192, 192, 192, 0.5)",
                        "blue": "rgba(0, 0, 255, 0.5)",
                        "green": "rgba(0, 255, 0, 0.5)",
                        "yellow": "rgba(255, 255, 0, 0.5)",
                        "orange": "rgba(255, 127.5, 0, 0.5)",
                        "red": "rgba(255, 0, 0, 0.5)",
                        'undefined': "rgba(255, 255, 255, 1)"
                    };

                    var scale = {
                        "none": ["", ""],
                        "p_year_color": ["1980", "2017"],
                        "p_avgcap_color": ["<1MW", ">3 MW"],
                        "t_ttlh_color": ["5m", "185m"],
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
                    // 7 basis layers
                    // console.log(this.checked + "   " + !this.checked);

                    document.getElementById("placemarkButton").style.pointerEvents = (this.checked === true) ? "auto" : "none";

                    for (var i = 7; i < wwd.layers.length; i++) {
                        if (i === wwd.layers.length - 1) {
                            wwd.layers[i].enabled = !this.checked;
                            // console.log(wwd.layers);
                        } else {
                            wwd.layers[i].enabled = this.checked;
                        }
                    }
                });

                function handleMouseMove(o) {

                    if ($("#popover").is(":visible")) {
                        $("#popover").hide();
                    }

                    // The input argument is either an Event or a TapRecognizer. Both have the same properties for determining
                    // the mouse or tap location.
                    var x = o.clientX,
                        y = o.clientY;

                    // Perform the pick. Must first convert from window coordinates to canvas coordinates, which are
                    // relative to the upper left corner of the canvas rather than the upper left corner of the page.

                    // var xOffset = Math.max(document.documentElement.scrollLeft, document.body.scrollLeft);
                    // var yOffset = Math.max(document.documentElement.scrollTop, document.body.scrollTop);
                    //
                    // var popover = document.getElementById('popover');
                    // popover.style.position = "absolute";
                    // popover.style.left = (x + xOffset) + 'px';
                    // popover.style.top = (y + yOffset) + 'px';
                    //
                    // $("#popover").show();


                    var pickList = wwd.pick(wwd.canvasCoordinates(x, y));
                    // console.log(pickList.objects);
                    for (var q = 0; q < pickList.objects.length; q++) {
                        var pickedPL = pickList.objects[q].userObject;
                        // console.log(pickedPL);
                        if (pickedPL instanceof WorldWind.Placemark) {
                            // console.log("A");

                            var xOffset = Math.max(document.documentElement.scrollLeft, document.body.scrollLeft);
                            var yOffset = Math.max(document.documentElement.scrollTop, document.body.scrollTop);

                            var popover = document.getElementById('popover');
                            popover.style.position = "absolute";
                            popover.style.left = (x + xOffset) + 'px';
                            popover.style.top = (y + yOffset) + 'px';

                            var content = "<p><strong>Project Name:</strong> " + pickedPL.layer.displayName +
                                "<br>" + "<strong>Year Online:</strong> " + pickedPL.userProperties.p_year +
                                "<br>" + "<strong>Rated Capacity:</strong> " + pickedPL.userProperties.p_avgcap +
                                "<br>" + "<strong>Total Height:</strong> " + pickedPL.userProperties.t_ttlh + "</p>";

                            $("#popover").attr('data-content', content);
                            $("#popover").show();
                        }
                    }

                    pickList = [];
                }

                $.ajax({
                    url: '/uswtdb',
                    type: 'GET',
                    dataType: 'json',
                    // data: data,
                    async: false,
                    success: function (resp) {
                        if (!resp.error) {
                            var data = [];
                            // var layerNames = [];
                            // var placemarkLayers = [];

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

                                var highlightAttributes = new WorldWind.PlacemarkAttributes(placemarkAttributes);
                                highlightAttributes.imageScale = 0.6;

                                var placemarkPosition = new WorldWind.Position(resp.data[i].ylat, resp.data[i].xlong, 0);
                                placemark[i] = new WorldWind.Placemark(placemarkPosition, false, placemarkAttributes);
                                placemark[i].altitudeMode = WorldWind.RELATIVE_TO_GROUND;
                                placemark[i].highlightAttributes = highlightAttributes;
                                placemark[i].userProperties.p_year = resp.data[i].p_year;
                                placemark[i].userProperties.p_avgcap = resp.data[i].p_avgcap;
                                placemark[i].userProperties.t_ttlh = resp.data[i].t_ttlh;
                                placemark[i].userProperties.p_year_color = resp.data[i].p_year_color;
                                placemark[i].userProperties.p_avgcap_color = resp.data[i].p_avgcap_color;
                                placemark[i].userProperties.t_ttlh_color = resp.data[i].t_ttlh_color;

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
                                    autoSuggestion.push({"value": resp.data[i].p_name, "lati": resp.data[i].ylat, "long": resp.data[i].xlong});
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

                                    // console.log(data);
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

                $("#autoSuggestion").autocomplete({
                    lookup: autoSuggestion,
                    lookupLimit: 5,
                    onSelect: function(suggestion) {
                        console.log(suggestion);
                        wwd.goTo(new WorldWind.Position(suggestion.lati, suggestion.long, 50000));
                        $("#autoSuggestion").val("");
                    }
                });

                $("#p_avgcap_color").click();

                // Listen for mouse moves and highlight the placemarks that the cursor rolls over.
                wwd.addEventListener("mousemove", handleMouseMove);
                $("#popover").popover({html: true, placement: "top", trigger: "hover"});
            })
        });
    });