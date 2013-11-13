(function () {
	var notifications, map;

if (typeof waze === 'undefined') {
    waze = {};
}

Notification = Backbone.Model.extend({ 
});

NotificationList = Backbone.Collection.extend({ 
    model : Notification
});

SingleNotificationView = Backbone.View.extend({
    tagName:  'div',
    template: _.template($('#notificationTemplate').html()),
    events: {
      'click .title'   : 'expandNotification',
      'click button'   : 'collapseNotification',
    },
    render: function() {
      this.$el.html(this.template(this.model.toJSON()));
      return this;
    },
    expandNotification : function() {
      this.$el.find('.more-details').removeClass('hidden');
    },
    collapseNotification : function() {
      this.$el.find('.more-details').addClass('hidden');
    }
});

AllNotificationsView = Backbone.View.extend({
    el: $('div.notification-list'),
    
    initialize: function() {
        this.listenTo(notifications, 'add', this.addOne);
    },
    
    addOne: function(notification) {
      var view = new SingleNotificationView({ model: notification });
      this.$el.append(view.render().el);
    }
});

MapView = Backbone.View.extend({
    initialize: function() {
        var that = this,
            bounds;
        
        this.map = L.map('map').setView([51.505, -0.09], 13);
        L.tileLayer('http://{s}.tile.cloudmade.com/d1954fa5c5934eecbd0f07c6f7d2d339/997/256/{z}/{x}/{y}.png', {
                        attribution: 'Map data &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors, <a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, Imagery © <a href="http://cloudmade.com">CloudMade</a>',
                        maxZoom: 18
                    }).addTo(this.map);
        bounds = this.map.getBounds();
        this.west = bounds.getWest();
        this.east = bounds.getEast();
        this.north = bounds.getNorth();
        this.south = bounds.getSouth();
        this.center = this.map.getCenter();
        
        this.map.on('click', function(e) {
            var marker = L.marker(e.latlng);
            marker.addTo(that.map);
            marker.bindPopup("<p>Hello world!</p>");
        });

        this.map.on('viewreset', function() {
            that.refreshBounds();
            refreshFromServer(that, function(notificationArray) {
               notifications.add(notificationArray); 
            });
        });

        this.map.on('moveend', function() {
            that.refreshBounds();
            refreshFromServer(that, function(notificationArray) {
               notifications.add(notificationArray); 
            });
        });
        
        this.listenTo(notifications, 'add', this.addOne);
    },
    
    addOne: function(notification) {
        var lat = notification.get('lat'),
            lon = notification.get('lon'),
            marker;
        
        if (!lat || !lon) {
            return;
        }
        
        marker = L.marker([notification.get('lat'), notification.get('lon')]);
        marker.addTo(this.map);
    },
    
    refreshBounds : function() {
       	var bounds = this.map.getBounds();
        this.west = bounds.getWest();
        this.east = bounds.getEast();
        this.north = bounds.getNorth();
        this.south = bounds.getSouth();
        $("#mapInfo .west").text(this.west.toFixed(4));
    	$("#mapInfo .south").text(this.south.toFixed(4));		        
    }
    
});

waze.map = (function() {

    function _initNotifications(e) {

        var app;

        notifications = new NotificationList();
        app = new AllNotificationsView();
        map = new MapView();
        refreshFromServer(map, function(notificationArray) {
           notifications.add(notificationArray); 
        });
    }
    
    function _initUpdate() {
        
        $("#lat").val(map.center.lat);
        $("#lon").val(map.center.lng);
        $("#mapActions button").click(function() {
            debugger;
            var latlng = new L.LatLng($("#lat").val(), $("#lon").val());
            map.setView(latlng, map.getZoom());
        });
    }

	return {
		init : function() {
			_initNotifications();
            _initUpdate();
		}
	}

})();
    
function refreshFromServer(map, callback) {
    var notifications;
    $.ajax({ 
        url: ["notifications?west=", map.west, "&east=", map.east, "&north=", map.north, "&south=", map.south].join(""),
        cache: false
    }).done(function(data) {
        notifications = _.map(data, function(el) {
            return new Notification({ 
                id : el.id,
                title : el.title,
                description : el.description,
                lon : el.lon,
                lat : el.lat,
            });    
        });
        if (typeof callback === 'function') {
            callback(notifications);
        }
    });
}

$(waze.map.init);

})();