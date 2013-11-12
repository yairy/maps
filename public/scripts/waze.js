if (typeof waze === 'undefined') {
    waze = {};
}

waze.notification = Backbone.Model.extend({ 
});

waze.notificationList = Backbone.Collection.extend({ 
    model : waze.notification
});

waze.singleNotificationView = Backbone.View.extend({
    tagName:  "li",
    render: function() {
      this.$el.html("<span>hello</span>");
      return this;
    }
});

waze.allNotificationsView = Backbone.View.extend({
    el: $('div.notification-list'),
    initialize: function() {
        this.listenTo(Todos, 'add', this.addOne);
    },
    addOne: function(notification) {
      var view = new waze.singleNotificationView({ model: notification });
      this.$('div.notification-list').append(view.render().el);
    },
    addAll: function() {
      Todos.each(this.addOne, this);
    };
    
});

waze.map = (function() {
    var map,
        notifications;

	function _initMap() {
		map = L.map('map').setView([51.505, -0.09], 13);

		L.tileLayer('http://{s}.tile.cloudmade.com/d1954fa5c5934eecbd0f07c6f7d2d339/997/256/{z}/{x}/{y}.png', {
    					attribution: 'Map data &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors, <a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, Imagery © <a href="http://cloudmade.com">CloudMade</a>',
    					maxZoom: 18
					}).addTo(map);

		map.on('click', function(e) {
			var marker = L.marker(e.latlng);
			marker.addTo(map);
			marker.bindPopup("<p>Hello world!</p>").openPopup();
			

		});
        
        _refreshBounds();

        map.on('viewreset', function(e) {
        	_refreshBounds();
        });

        map.on('drag', function(e) {
        	_refreshBounds();
        });
	};

	function _refreshBounds() {
       	var bounds = map.getBounds();
        $("#mapInfo .west").text(bounds.getWest().toFixed(4));
    	$("#mapInfo .south").text(bounds.getSouth().toFixed(4));		
	}

	function _initNotifications(e) {
        notifications = new waze.notificationList;
		$.ajax({ 
				url: "notifications",
				cache: false
			}).done(function(data) {
                var notificationsArray = _.map(data, function(el) {
                    return new waze.notification({ 
                        id : el.id,
                        title : el.title,
                        description : el.description,
                        lon : el.lon,
                        lat : el.lat
                    });    
                });
                notifications.add(notificationsArray);
            });
	}
    
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
			_initNotifications();
            _initUpdate();
		}
	}

})();

$(waze.map.init);