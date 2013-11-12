(function () {
	var notifications, map;

if (typeof waze === 'undefined') {
    waze = {};
}

waze.notification = Backbone.Model.extend({ 
});

waze.notificationList = Backbone.Collection.extend({ 
    model : waze.notification
});

waze.singleNotificationView = Backbone.View.extend({
    tagName:  'div',
    template: _.template($('#notificationTemplate').html()),
    events: {
      'click .title'   : 'expandNotification',
      'click button'   : 'collapseNotification',
    },
    render: function() {
      this.$el.html(this.template(this.model.toJSON()));
      this.model.get('marker').addTo(map);
      return this;
    },
    expandNotification : function() {
      this.$el.find('.more-details').removeClass('hidden');
    },
    collapseNotification : function() {
      this.$el.find('.more-details').addClass('hidden');
    }
});

waze.allNotificationsView = Backbone.View.extend({
    el: $('div.notification-list'),
    initialize: function() {
        this.listenTo(notifications, 'add', this.addOne);
    },
    addOne: function(notification) {
      var view = new waze.singleNotificationView({ model: notification });
      this.$el.append(view.render().el);
    },
    addAll: function() {
      Todos.each(this.addOne, this);
    }
    
});

waze.map = (function() {

function _initMap() {
    map = L.map('map').setView([51.505, -0.09], 13);

    L.tileLayer('http://{s}.tile.cloudmade.com/d1954fa5c5934eecbd0f07c6f7d2d339/997/256/{z}/{x}/{y}.png', {
                        attribution: 'Map data &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors, <a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, Imagery © <a href="http://cloudmade.com">CloudMade</a>',
                        maxZoom: 18
                    }).addTo(map);

        map.on('click', function(e) {
            var marker = L.marker(e.latlng);
            marker.addTo(map);
            marker.bindPopup("<p>Hello world!</p>");
        });
        
        _refreshBounds();

        map.on('viewreset', function(e) {
        	_refreshBounds();
        });

        map.on('move', function(e) {
        	_refreshBounds();
        });
	};

	function _refreshBounds() {
       	var bounds = map.getBounds();
        $("#mapInfo .west").text(bounds.getWest().toFixed(4));
    	$("#mapInfo .south").text(bounds.getSouth().toFixed(4));		
    }

    function _initNotifications(e) {

        var bounds = map.getBounds(),
            app;

        notifications = new waze.notificationList;
        app = new waze.allNotificationsView();
        $.ajax({ 
                url: ["notifications?west=", bounds.getWest(), "&east=", bounds.getEast(), 
                    "&north=", bounds.getNorth(), "&south=", bounds.getSouth()].join(""),
                cache: false
            }).done(function(data) {
                var notificationsArray = _.map(data, function(el) {
                    return new waze.notification({ 
                        id : el.id,
                        title : el.title,
                        description : el.description,
                        lon : el.lon,
                        lat : el.lat,
                        marker : L.marker([el.lat, el.lon]  )
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

})();