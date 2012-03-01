// This function might be passed either an OpenLayers.LonLat (so has
// lon and lat) or an OpenLayers.Geometry.Point (so has x and y)
function fixmystreet_update_pin(lonlat) {
    lonlat.transform(
        fixmystreet.map.getProjectionObject(),
        new OpenLayers.Projection("EPSG:4326")
    );
    document.getElementById('fixmystreet.latitude').value = lonlat.lat || lonlat.y;
    document.getElementById('fixmystreet.longitude').value = lonlat.lon || lonlat.x;
}

function fixmystreet_activate_drag() {
    fixmystreet.drag = new OpenLayers.Control.DragFeature( fixmystreet.markers, {
        onComplete: function(feature, e) {
            fixmystreet_update_pin( feature.geometry.clone() );
        }
    } );
    fixmystreet.map.addControl( fixmystreet.drag );
    fixmystreet.drag.activate();
}

function fms_markers_list(pins, transform) {
    var markers = [];
    for (var i=0; i<pins.length; i++) {
        var pin = pins[i];
        var loc = new OpenLayers.Geometry.Point(pin[1], pin[0]);
        if (transform) {
            // The Strategy does this for us, so don't do it in that case.
            loc.transform(
                new OpenLayers.Projection("EPSG:4326"),
                fixmystreet.map.getProjectionObject()
            );
        }
        var marker = new OpenLayers.Feature.Vector(loc, {
            colour: pin[2],
            size: pin[5] || 'normal',
            id: pin[3],
            title: pin[4] || ''
        });
        markers.push( marker );
    }
    return markers;
}

function fixmystreet_onload() {
    if ( fixmystreet.area ) {
        var area = new OpenLayers.Layer.Vector("KML", {
            strategies: [ new OpenLayers.Strategy.Fixed() ],
            protocol: new OpenLayers.Protocol.HTTP({
                url: "/mapit/area/" + fixmystreet.area + ".kml?simplify_tolerance=0.0001",
                format: new OpenLayers.Format.KML()
            })
        });
        fixmystreet.map.addLayer(area);
        area.events.register('loadend', null, function(a,b,c) {
            var bounds = area.getDataExtent();
            if (bounds) { fixmystreet.map.zoomToExtent( bounds ); }
        });
    }

    var pin_layer_style_map = new OpenLayers.StyleMap({
        'default': new OpenLayers.Style({
            graphicTitle: "${title}",
            graphicOpacity: 1,
            graphicZIndex: 11,
            backgroundGraphicZIndex: 10
        })
    });
    pin_layer_style_map.addUniqueValueRules('default', 'size', {
        'normal': {
            externalGraphic: "/i/pin-${colour}.png",
            graphicWidth: 48,
            graphicHeight: 64,
            graphicXOffset: -24,
            graphicYOffset: -64,
            backgroundGraphic: "/i/pin-shadow.png",
            backgroundWidth: 60,
            backgroundHeight: 30,
            backgroundXOffset: -7,
            backgroundYOffset: -30
        },
        'big': {
            externalGraphic: "/i/pin-${colour}-big.png",
            graphicWidth: 78,
            graphicHeight: 105,
            graphicXOffset: -39,
            graphicYOffset: -105,
            backgroundGraphic: "/i/pin-shadow-big.png",
            backgroundWidth: 88,
            backgroundHeight: 40,
            backgroundXOffset: -10,
            backgroundYOffset: -35
        }
    });
    var pin_layer_options = {
        rendererOptions: {
            yOrdering: true
        },
        styleMap: pin_layer_style_map
    };
    if (fixmystreet.page == 'around') {
        fixmystreet.bbox_strategy = new OpenLayers.Strategy.BBOX({ ratio: 1 });
        pin_layer_options.strategies = [ fixmystreet.bbox_strategy ];
        pin_layer_options.protocol = new OpenLayers.Protocol.HTTP({
            url: '/ajax',
            params: fixmystreet.all_pins ? { all_pins: 1 } : { },
            format: new OpenLayers.Format.FixMyStreet()
        });
    }
    fixmystreet.markers = new OpenLayers.Layer.Vector("Pins", pin_layer_options);
    fixmystreet.markers.events.register( 'loadend', fixmystreet.markers, function(evt) {
        if (fixmystreet.map.popups.length) fixmystreet.map.removePopup(fixmystreet.map.popups[0]);
    });

    var markers = fms_markers_list( fixmystreet.pins, true );
    fixmystreet.markers.addFeatures( markers );
    if (fixmystreet.page == 'around' || fixmystreet.page == 'reports' || fixmystreet.page == 'my') {
        var select = new OpenLayers.Control.SelectFeature( fixmystreet.markers );
        var selectedFeature;
        function onPopupClose(evt) {
            select.unselect(selectedFeature);
            OpenLayers.Event.stop(evt);
        }
        fixmystreet.markers.events.register( 'featureunselected', fixmystreet.markers, function(evt) {
            var feature = evt.feature, popup = feature.popup;
            fixmystreet.map.removePopup(popup);
            popup.destroy();
            feature.popup = null;
        });
        fixmystreet.markers.events.register( 'featureselected', fixmystreet.markers, function(evt) {
            var feature = evt.feature;
            selectedFeature = feature;
            var popup = new OpenLayers.Popup.FramedCloud("popup",
                feature.geometry.getBounds().getCenterLonLat(),
                null,
                feature.attributes.title + "<br><a href=/report/" + feature.attributes.id + ">More details</a>",
                null, true, onPopupClose);
            feature.popup = popup;
            fixmystreet.map.addPopup(popup);
        });
        fixmystreet.map.addControl( select );
        select.activate();
    } else if (fixmystreet.page == 'new') {
        fixmystreet_activate_drag();
    }
    fixmystreet.map.addLayer(fixmystreet.markers);

    if ( fixmystreet.zoomToBounds ) {
        var bounds = fixmystreet.markers.getDataExtent();
        if (bounds) { fixmystreet.map.zoomToExtent( bounds ); }
    }

    $('#hide_pins_link').click(function(e) {
        e.preventDefault();
        var showhide = [
            'Show pins', 'Hide pins',
            'Dangos pinnau', 'Cuddio pinnau',
            "Vis nåler", "Gjem nåler"
        ];
        for (var i=0; i<showhide.length; i+=2) {
            if (this.innerHTML == showhide[i]) {
                fixmystreet.markers.setVisibility(true);
                this.innerHTML = showhide[i+1];
            } else if (this.innerHTML == showhide[i+1]) {
                fixmystreet.markers.setVisibility(false);
                this.innerHTML = showhide[i];
            }
        }
    });

    $('#all_pins_link').click(function(e) {
        e.preventDefault();
        fixmystreet.markers.setVisibility(true);
        var texts = [
            'en', 'Include old reports', 'Hide old reports',
            'nb', 'Inkluder utdaterte problemer', 'Skjul utdaterte rapporter',
            'cy', 'Cynnwys hen adroddiadau', 'Cuddio hen adroddiadau'
        ];
        for (var i=0; i<texts.length; i+=3) {
            if (this.innerHTML == texts[i+1]) {
                this.innerHTML = texts[i+2];
                fixmystreet.markers.protocol.options.params = { all_pins: 1 };
                fixmystreet.markers.refresh( { force: true } );
                lang = texts[i];
            } else if (this.innerHTML == texts[i+2]) {
                this.innerHTML = texts[i+1];
                fixmystreet.markers.protocol.options.params = { };
                fixmystreet.markers.refresh( { force: true } );
                lang = texts[i];
            }
        }
        if (lang == 'cy') {
            document.getElementById('hide_pins_link').innerHTML = 'Cuddio pinnau';
        } else if (lang == 'nb') {
            document.getElementById('hide_pins_link').innerHTML = 'Gjem nåler';
        } else {
            document.getElementById('hide_pins_link').innerHTML = 'Hide pins';
        }
    });

}

$(function(){

    set_map_config();

    fixmystreet.map = new OpenLayers.Map("map", {
        controls: fixmystreet.controls,
        displayProjection: new OpenLayers.Projection("EPSG:4326")
    });

    fixmystreet.layer_options = OpenLayers.Util.extend({
        zoomOffset: fixmystreet.zoomOffset,
        transitionEffect: 'resize',
        numZoomLevels: fixmystreet.numZoomLevels
    }, fixmystreet.layer_options);
    var layer = new fixmystreet.map_type("", fixmystreet.layer_options);
    fixmystreet.map.addLayer(layer);

    if (!fixmystreet.map.getCenter()) {
        var centre = new OpenLayers.LonLat( fixmystreet.longitude, fixmystreet.latitude );
        centre.transform(
            new OpenLayers.Projection("EPSG:4326"),
            fixmystreet.map.getProjectionObject()
        );
        fixmystreet.map.setCenter(centre, fixmystreet.zoom || 3);
    }

    if ($('#map_box').data('size')=='full') {
        // TODO Work better with window resizing, this is pretty 'set up' only at present
        var q = $(window).width() / 4;
        // Need to try and fake the 'centre' being 75% from the left
        fixmystreet.map.pan(-q, -25, { animate: false });
        fixmystreet.map.events.register("movestart", null, function(e){
            fixmystreet.map.moveStart = { zoom: this.getZoom(), center: this.getCenter() };
        });
        fixmystreet.map.events.register("zoomend", null, function(e){
            if ( !fixmystreet.map.moveStart || !this.getCenter().equals(fixmystreet.map.moveStart.center) ) {
                // Centre has moved, e.g. by double-click. Same whether zoom in or out
                fixmystreet.map.pan(-q, -25, { animate: false });
                return;
            }
            var zoom_change = this.getZoom() - fixmystreet.map.moveStart.zoom;
            if (zoom_change == -1) {
                // Zoomed out, need to re'centre'
                fixmystreet.map.pan(-q/2, 0, { animate: false });
            } else if (zoom_change == 1) {
                // Using a zoom button
                fixmystreet.map.pan(q, 0, { animate: false });
            }
        });
    }

    if (document.getElementById('mapForm')) {
        var click = new OpenLayers.Control.Click();
        fixmystreet.map.addControl(click);
        click.activate();
    }

    $(window).hashchange(function(){
        if (location.hash) { return; }
        // Okay, back to around view.
        fixmystreet.bbox_strategy.activate();
        fixmystreet.markers.refresh( { force: true } );
        fixmystreet.drag.deactivate();
        $('#side-form').hide();
        $('#side').show();
        $('#sub_map_links').show();
        heightFix('#report-a-problem-sidebar:visible', '.content', 26);
        //only on mobile
        $('#mob_sub_map_links').remove();
        $('.mobile-map-banner').text('Place pin on map');
        fixmystreet.page = 'around';
    });

    // Vector layers must be added onload as IE sucks
    if ($.browser.msie) {
        $(window).load(fixmystreet_onload);
    } else {
        fixmystreet_onload();
    }
});

/* Overridding the buttonDown function of PanZoom so that it does
   zoomTo(0) rather than zoomToMaxExtent()
*/
OpenLayers.Control.PanZoomFMS = OpenLayers.Class(OpenLayers.Control.PanZoom, {
    buttonDown: function (evt) {
        if (!OpenLayers.Event.isLeftClick(evt)) {
            return;
        }

        switch (this.action) {
            case "panup":
                this.map.pan(0, -this.getSlideFactor("h"));
                break;
            case "pandown":
                this.map.pan(0, this.getSlideFactor("h"));
                break;
            case "panleft":
                this.map.pan(-this.getSlideFactor("w"), 0);
                break;
            case "panright":
                this.map.pan(this.getSlideFactor("w"), 0);
                break;
            case "zoomin":
                this.map.zoomIn();
                break;
            case "zoomout":
                this.map.zoomOut();
                break;
            case "zoomworld":
                this.map.zoomTo(0);
                break;
        }

        OpenLayers.Event.stop(evt);
    }
});

/* Overriding Permalink so that it can pass the correct zoom to OSM */
OpenLayers.Control.PermalinkFMS = OpenLayers.Class(OpenLayers.Control.Permalink, {
    updateLink: function() {
        var separator = this.anchor ? '#' : '?';
        var href = this.base;
        if (href.indexOf(separator) != -1) {
            href = href.substring( 0, href.indexOf(separator) );
        }

        href += separator + OpenLayers.Util.getParameterString(this.createParams(null, this.map.getZoom()+fixmystreet.zoomOffset));
        // Could use mlat/mlon here as well if we are on a page with a marker
        if (this.anchor && !this.element) {
            window.location.href = href;
        }
        else {
            this.element.href = href;
        }
    }
});

/* Pan data handler */
OpenLayers.Format.FixMyStreet = OpenLayers.Class(OpenLayers.Format.JSON, {
    read: function(json, filter) {
        if (typeof json == 'string') {
            obj = OpenLayers.Format.JSON.prototype.read.apply(this, [json, filter]);
        } else {
            obj = json;
        }
        var current, current_near;
        if (typeof(obj.current) != 'undefined' && (current = document.getElementById('current'))) {
            current.innerHTML = obj.current;
        }
        if (typeof(obj.current_near) != 'undefined' && (current_near = document.getElementById('current_near'))) {
            current_near.innerHTML = obj.current_near;
        }
        var markers = fms_markers_list( obj.pins, false );
        return markers;
    },
    CLASS_NAME: "OpenLayers.Format.FixMyStreet"
});

/* Click handler */
OpenLayers.Control.Click = OpenLayers.Class(OpenLayers.Control, {                
    defaultHandlerOptions: {
        'single': true,
        'double': false,
        'pixelTolerance': 0,
        'stopSingle': false,
        'stopDouble': false
    },

    initialize: function(options) {
        this.handlerOptions = OpenLayers.Util.extend(
            {}, this.defaultHandlerOptions);
        OpenLayers.Control.prototype.initialize.apply(
            this, arguments
        ); 
        this.handler = new OpenLayers.Handler.Click(
            this, {
                'click': this.trigger
            }, this.handlerOptions);
    }, 

    trigger: function(e) {
        var lonlat = fixmystreet.map.getLonLatFromViewPortPx(e.xy);
        if (fixmystreet.page == 'new') {
            /* Already have a pin */
            fixmystreet.markers.features[0].move(lonlat);
        } else {
            var markers = fms_markers_list( [ [ lonlat.lat, lonlat.lon, 'green' ] ], false );
            fixmystreet.bbox_strategy.deactivate();
            fixmystreet.markers.removeAllFeatures();
            fixmystreet.markers.addFeatures( markers );
            fixmystreet_activate_drag();
        }
        fixmystreet_update_pin(lonlat);
        // check to see if markers are visible. We click the
        // link so that it updates the text in case they go
        // back
        if ( ! fixmystreet.markers.getVisibility() ) {
            $('#hide_pins_link').click();
        }
        if (fixmystreet.page == 'new') {
            return;
        }
        $.getJSON('/report/new/ajax', {
                latitude: $('#fixmystreet\\.latitude').val(),
                longitude: $('#fixmystreet\\.longitude').val()
        }, function(data) {
            $('#councils_text').html(data.councils_text);
            $('#form_category_row').html(data.category);
            /* Need to reset this here as it gets removed when we replace
               the HTML for the dropdown */
            if ( data.has_open311 > 0 ) {
                $('#form_category').change( form_category_onchange );
            }
        });

        $('#side-form, #site-logo').show();
        /* For some reason on IOS5 if you use the jQuery show method it
         * doesn't display the JS validation error messages unless you do this
         * or you cause a screen redraw by changing the phone orientation.
         * NB: This has to happen after the call to show() */
        if ( navigator.userAgent.match(/like Mac OS X/i)) {
            document.getElementById('side-form').style.display = 'block';
        }
        $('#side').hide();
        heightFix('#report-a-problem-sidebar:visible', '.content', 26);

        // If we clicked the map somewhere inconvenient
        var sidebar = $('#report-a-problem-sidebar');
        if (sidebar.css('position') == 'absolute') {
            var w = sidebar.width(), h = sidebar.height(), o = sidebar.offset();
            if (e.xy.y <= o.top) {
                // top of the page, pin hidden by header
                lonlat.transform(
                    new OpenLayers.Projection("EPSG:4326"),
                    fixmystreet.map.getProjectionObject()
                );
                var p = fixmystreet.map.getViewPortPxFromLonLat(lonlat)
                p.x -= $(window).width() / 3;
                lonlat = fixmystreet.map.getLonLatFromViewPortPx(p);
                fixmystreet.map.panTo(lonlat);
            } else if (e.xy.x >= o.left && e.xy.x <= o.left + w + 24 && e.xy.y >= o.top && e.xy.y <= o.top + h + 64) {
                // underneath where the new sidebar will appear
                fixmystreet.map.pan(-w, 0, { animate: true });
            }
        }

        if ($('html').hasClass('mobile')) {
            $('#sub_map_links').hide();
            $('#map_box').append(
                '<p id="mob_sub_map_links">' +
                '<a href="#">Try again</a>' +
                '<a href="#ok" id="mob_ok">OK</a>' +
                '</p>'
            );
            $('.mobile-map-banner').text('Right place?');
        }

        fixmystreet.page = 'new';
        location.hash = 'report';
    }
});

