requirejs(['./worldwind.min',
        './LayerManager',
        './RadiantCircleTile',
        '../config/mainconf'],
    function (WorldWind,
              LayerManager,
              RadiantCircleTile) {
        "use strict";

        $(document).ready(function() {
            $(function () {

                var placemark = [];
                var autoSuggestion = [];

                // reading configGlobal from mainconf.js
                var mainconfig = config;

                // Tell WorldWind to log only warnings and errors.
                WorldWind.Logger.setLoggingLevel(WorldWind.Logger.LEVEL_WARNING);

                // Create the WorldWindow.
                var wwd = new WorldWind.WorldWindow("canvasOne");
                // console.log(wwd.layers);

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

                $(".sortButton").on("click", function () {
                    var category = this.id;

                    // this.setAttribute('data-status', (this.getAttribute("data-status") === 'true') ? 'false' : 'true');
                    var status = this.getAttribute("data-status");
                    $(".sortButton").attr('data-status', 'false');
                    this.setAttribute('data-status', (status === 'true') ? 'false' : 'true');
                    status = !(status === 'true');

                    $(".sortButton").find("span").html("");
                    $(this).find("span").html(status ? " &#9650;" : " &#9660;");

                    $(".sortButton").css("background-color", "rgb(128, 128, 128)");
                    $(this).css("background-color", "rgb(0, 128, 255)");

                    // if (status === true) {
                    //     console.log("A");
                    // } else if (status === false) {
                    //     console.log("B");
                    // }

                    function sort(arr, isNotReverse){
                        arr.sort(function(a, b){
                            // console.log($(a).attr("data-" + category), $(b).attr("data-" + category));
                            // if(a.id > b.id) return  isReverse ? -1 : 1;
                            // if(a.id < b.id) return isReverse ? 1 : -1;
                            if($(a).attr("data-" + category) > $(b).attr("data-" + category)) return  isNotReverse ? 1 : -1;
                            if($(a).attr("data-" + category) < $(b).attr("data-" + category)) return isNotReverse ? -1 : 1;
                            return 0;
                        });
                        return arr;
                    }

                    var parent = $("#layerMenu");
                    // console.log(status);
                    var arr = sort(parent.children(), status);
                    // console.log(arr);
                    arr.detach().appendTo(parent);
                });

                // $("#test").on('click', function () {
                //     // console.log(wwd.layers[7].isLayerInView(wwd.drawContext));
                //     // var altitude = wwd.layers[5].eyeText.text;
                //     // console.log(altitude.substring(5, altitude.length - 3));
                //     // for (var i = 7; i < wwd.layers.length; i++) {
                //     //     console.log(wwd.layers[i].inCurrentFrame);
                //     // }
                //     // $("#switchLayer").click();
                //     // var altitude = wwd.layers[5].eyeText.text.substring(5, wwd.layers[5].eyeText.text.length - 3);
                //
                //     console.log(wwd.layers);
                // });

                function highlightLayer(e) {
                    // console.log(this.id);
                    var category = $("input[name='category']:checked")[0].id;

                    // var color = {
                    //     "grey": "rgba(192, 192, 192, 0.5)",
                    //     "blue": "rgba(0, 0, 255, 0.5)",
                    //     "green": "rgba(0, 255, 0, 0.5)",
                    //     "yellow": "rgba(255, 255, 0, 0.5)",
                    //     "orange": "rgba(255, 127.5, 0, 0.5)",
                    //     "red": "rgba(255, 0, 0, 0.5)",
                    //     'undefined': "rgba(255, 255, 255, 1)"
                    // };

                    var renderables = wwd.layers[this.id].renderables;
                    // console.log(renderables);

                    // var canvas = document.createElement("canvas");
                    // var img = canvas.getContext('2d');
                    // canvas.width = canvas.height = 30;
                    // img.beginPath();
                    // img.arc(15, 15, 15, 0, Math.PI * 2, true);
                    // img.fillStyle = "#ccff99";
                    // img.fill();
                    // var imgData = img.getImageData(0, 0, 30, 30);

                    for (var i = 0; i < renderables.length; i++) {
                        // var circle = document.createElement("canvas"),
                        //     ctx = circle.getContext('2d'),
                        //     radius = 10,
                        //     r2 = radius + radius;
                        //
                        // circle.width = circle.height = r2;
                        //
                        // if (e.handleObj.type === "mouseover") {
                        //     circle.width = circle.height = radius + radius + radius;
                        //     ctx.putImageData(imgData, 0, 0);
                        // }
                        //
                        // var gradient = ctx.createRadialGradient(radius, radius, 0, radius, radius, radius);
                        // gradient.addColorStop(0, color[renderables[i].userProperties[category]]);
                        //
                        // ctx.beginPath();
                        // ctx.arc(radius, radius, radius, 0, Math.PI * 2, true);
                        //
                        // ctx.fillStyle = gradient;
                        // ctx.fill();
                        // // ctx.strokeStyle = "rgb(255, 255, 255)";
                        // // ctx.stroke();
                        //
                        // ctx.closePath();
                        //
                        // renderables[i].attributes.imageSource.image = circle;
                        // renderables[i].updateImage = true;

                        renderables[i].highlighted = (e.handleObj.type === "mouseover") ? true : false;
                    }
                }

                wwd.worldWindowController.__proto__.handleWheelEvent = function (event) {
                    var navigator = this.wwd.navigator;
                    // Normalize the wheel delta based on the wheel delta mode. This produces a roughly consistent delta across
                    // browsers and input devices.
                    var normalizedDelta;
                    if (event.deltaMode === WheelEvent.DOM_DELTA_PIXEL) {
                        normalizedDelta = event.deltaY;
                    } else if (event.deltaMode === WheelEvent.DOM_DELTA_LINE) {
                        normalizedDelta = event.deltaY * 40;
                    } else if (event.deltaMode === WheelEvent.DOM_DELTA_PAGE) {
                        normalizedDelta = event.deltaY * 400;
                    }

                    // Compute a zoom scale factor by adding a fraction of the normalized delta to 1. When multiplied by the
                    // navigator's range, this has the effect of zooming out or zooming in depending on whether the delta is
                    // positive or negative, respectfully.
                    var scale = 1 + (normalizedDelta / 1000);

                    // Apply the scale to this navigator's properties.
                    navigator.range *= scale;
                    this.applyLimits();
                    this.wwd.redraw();

                    autoSwitch();
                    layerMenu();
                };

                // wwd.worldWindowController.__proto__.handlePanOrDrag3D = function (recognizer) {
                //     var state = recognizer.state,
                //         tx = recognizer.translationX,
                //         ty = recognizer.translationY;
                //
                //     var navigator = this.wwd.navigator;
                //     if (state === WorldWind.BEGAN) {
                //         this.lastPoint.set(0, 0);
                //     } else if (state === WorldWind.CHANGED) {
                //         // Convert the translation from screen coordinates to arc degrees. Use this navigator's range as a
                //         // metric for converting screen pixels to meters, and use the globe's radius for converting from meters
                //         // to arc degrees.
                //         var canvas = this.wwd.canvas,
                //             globe = this.wwd.globe,
                //             globeRadius = WWMath.max(globe.equatorialRadius, globe.polarRadius),
                //             distance = WWMath.max(1, navigator.range),
                //             metersPerPixel = WWMath.perspectivePixelSize(canvas.clientWidth, canvas.clientHeight, distance),
                //             forwardMeters = (ty - this.lastPoint[1]) * metersPerPixel,
                //             sideMeters = -(tx - this.lastPoint[0]) * metersPerPixel,
                //             forwardDegrees = (forwardMeters / globeRadius) * Angle.RADIANS_TO_DEGREES,
                //             sideDegrees = (sideMeters / globeRadius) * Angle.RADIANS_TO_DEGREES;
                //
                //         // Apply the change in latitude and longitude to this navigator, relative to the current heading.
                //         var sinHeading = Math.sin(navigator.heading * Angle.DEGREES_TO_RADIANS),
                //             cosHeading = Math.cos(navigator.heading * Angle.DEGREES_TO_RADIANS);
                //
                //         navigator.lookAtLocation.latitude += forwardDegrees * cosHeading - sideDegrees * sinHeading;
                //         navigator.lookAtLocation.longitude += forwardDegrees * sinHeading + sideDegrees * cosHeading;
                //         this.lastPoint.set(tx, ty);
                //         this.applyLimits();
                //         this.wwd.redraw();
                //     }
                // };

                function autoSwitch() {
                    var altitude = wwd.layers[5].eyeText.text.replace(/Eye  |,| km/g, '');

                    if (altitude <= mainconfig.eyeDistance_Heatmap && !$("#switchLayer").is(':checked')) {
                        $("#switchLayer").click();
                    } else if (altitude > mainconfig.eyeDistance_Heatmap && $("#switchLayer").is(':checked')) {
                        $("#switchLayer").click();
                    }
                }

                function layerMenu() {
                   var altitude = wwd.layers[5].eyeText.text.substring(5, wwd.layers[5].eyeText.text.length - 3);
                   $("#layerMenu").empty();
                    $("#layerMenuButton").hide();
                   var projectNumber = 0;
                   if (altitude <= mainconfig.eyeDistance_PL && $("#switchLayer").is(':checked')) {
                       for (var i = 7; i < wwd.layers.length - 1; i++) {

                           if (wwd.layers[i].inCurrentFrame) {
                               var projectName = wwd.layers[i].displayName,
                                   state = wwd.layers[i].renderables[0].userProperties.t_state,
                                   year = wwd.layers[i].renderables[0].userProperties.p_year,
                                   number = wwd.layers[i].renderables[0].userProperties.p_tnum,
                                   cap = wwd.layers[i].renderables[0].userProperties.p_cap,
                                   avgcap = wwd.layers[i].renderables[0].userProperties.p_avgcap;

                               $("#layerMenu").append($("<div id='" + i + "' data-name='" + projectName + "' data-year='" + year + "' data-capacity='" + avgcap + "' class='layers'>" +
                                   "<p><strong>" + projectName + ", " + state + "</strong></p>" +
                                   "<p>&nbsp;&nbsp;&nbsp;&nbsp;Year Online: " + year + "</p>" +
                                   "<p>&nbsp;&nbsp;&nbsp;&nbsp;" + number + " Turbines</p>" +
                                   "<p>&nbsp;&nbsp;&nbsp;&nbsp;Total Rated Capacity: " + cap + ((cap === "N/A") ? "" : " MW") + "</p>" +
                                   "<p>&nbsp;&nbsp;&nbsp;&nbsp;Rated Capacity: " + avgcap + ((avgcap === "N/A") ? "" : " MW") + "</p>" +
                                   "</div>"));
                               projectNumber++;
                           }

                           if (i === wwd.layers.length - 2) {
                               $("#projectNumber").html(projectNumber);
                               $("#layerMenuButton").show();
                               $(".layers").on('mouseenter', highlightLayer);
                               $(".layers").on('mouseleave', highlightLayer);
                           }
                       }
                   }
                }

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
                                highlightAttributes.imageScale = 1.0;

                                var placemarkPosition = new WorldWind.Position(resp.data[i].ylat, resp.data[i].xlong, 0);
                                placemark[i] = new WorldWind.Placemark(placemarkPosition, false, placemarkAttributes);
                                placemark[i].altitudeMode = WorldWind.RELATIVE_TO_GROUND;
                                placemark[i].highlightAttributes = highlightAttributes;
                                placemark[i].userProperties.t_state = resp.data[i].t_state;
                                placemark[i].userProperties.p_year = (resp.data[i].p_year === -9999) ? 'N/A' : resp.data[i].p_year;
                                placemark[i].userProperties.p_tnum = resp.data[i].p_tnum;
                                placemark[i].userProperties.p_cap = (resp.data[i].p_cap === -9999) ? 'N/A' : resp.data[i].p_cap;
                                placemark[i].userProperties.p_avgcap = (resp.data[i].p_avgcap === -9999) ? 'N/A' : resp.data[i].p_avgcap;
                                placemark[i].userProperties.t_ttlh = (resp.data[i].t_ttlh === -9999) ? 'N/A' : resp.data[i].t_ttlh;
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
                                    placemarkLayer.enabled = false;
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

                                    // HeatMapLayer.enabled = false;
                                    wwd.addLayer(HeatMapLayer);

                                    wwd.goTo(new WorldWind.Position(37.0902, -95.7129, mainconfig.eyeDistance_initial));
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
                        // console.log(suggestion);
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