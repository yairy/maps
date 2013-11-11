var waze = {};

waze.map = (function() {
    var map;

	function _initMap() {
		map = L.map('map').setView([51.505, -0.09], 13);

		L.tileLayer('http://{s}.tile.cloudmade.com/d1954fa5c5934eecbd0f07c6f7d2d339/997/256/{z}/{x}/{y}.png', {
    					attribution: 'Map data &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors, <a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, Imagery © <a href="http://cloudmade.com">CloudMade</a>',
    					maxZoom: 18
					}).addTo(map);

		map.on('click', function(e) {
			var marker = L.marker(e.latlng), 
                xy;
			marker.addTo(map);
			xy = marker.bindPopup("<p>Hello world!<br />This is a nice popup.</p>", { closeOnClick : false } );
            xy.openPopup;
			marker.on('click', function (e) {
				marker.openPopup();
			});

		});
        
        map.on('viewreset', function(e) {
            console.log("viewreset");
        });
	};
    
    function _initUpdate() {
    
        var latlng = map.getCenter();
        $("#lat").val(latlng.lat);
        $("#lon").val(latlng.lng);
        $("#mapInfo button").click(function() {
            var latlng = new L.LatLng($("#lat").val(), $("#lon").val());
            
            map.setView(latlng, map.getZoom());
            
        });
    }

	return {
		init : function() {
			_initMap();
            _initUpdate();
		}
	}

})();

$(waze.map.init);