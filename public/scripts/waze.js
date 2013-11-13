(function () {
    var map;

    if (typeof waze === 'undefined') {
        window.waze = {};
    }

    Notification = Backbone.Model.extend();

    NotificationList = Backbone.Collection.extend();

    MapModel = Backbone.Model.extend();

    SingleNotificationView = Backbone.View.extend({
        tagName:  'div',
        template: _.template($('#notificationTemplate').html()),
        events: {
            'click .title span'   : 'expandNotification',
            'click button'   : 'collapseNotification',
        },
        render: function() {
            this.$el.html(this.template(this.model.toJSON()));
            return this;
        },
        expandNotification : function() {
            this.$('.more-details').removeClass('hidden');
        },
        collapseNotification : function() {
            this.$('.more-details').addClass('hidden');
        }
    });

    AllNotificationsView = Backbone.View.extend({
        el: $('div.notification-list'),

        initialize: function() {
            this.listenTo(this.collection, 'add', this.addOne);
            this.listenTo(this.collection, 'reset', this.addAll);
        },

        addOne: function(notification) {
            var view = new SingleNotificationView({ model: notification });
            this.$el.append(view.render().el);
        },
        
        addAll: function() {
            this.$el.empty();
            this.collection.each(this.addOne, this);
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
            this.refreshBounds();

            this.map.on('click', function(e) {
                var marker = L.marker(e.latlng);
                marker.addTo(that.map);
                marker.bindPopup($('#newNotificationTemplate').html());
            }); 

            this.map.on('viewreset moveend', function() {
                that.refreshBounds();
            });

            this.listenTo(this.collection, 'add', this.addOne);
            this.listenTo(this.collection, 'reset', this.addAll);
            this.listenTo(this.model, 'change:center', this.panMap)
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
            marker.bindPopup($('#newNotificationTemplate').html());
        },
        
        addAll: function() {
          this.collection.each(this.addOne, this);  
        },

        panMap: function() {
            this.map.panTo(this.model.get('center'));
        },

        refreshBounds : function() {
            var bounds = this.map.getBounds();
            this.model.set({'west' : bounds.getWest(),
                'east' : bounds.getEast(),
                'north': bounds.getNorth(),
                'south': bounds.getSouth()
            });
        }

    });

    DebugView = Backbone.View.extend({
        el: $('#mapInfo'),

        initialize: function() {
            this.listenTo(this.model, 'change', this.update);
        },

        update : function(model) {
            _.each(['west', 'east', 'north', 'south'], function(el) {
                this.$("." + el).text(model.get(el).toFixed(2));
            });
        },

        events: {
            'click button'   : 'centerButtonClicked'
        },

        centerButtonClicked: function() {
            this.model.set('center', [this.$("#lat").val(), this.$("#lon").val()]);
        }

    });

    waze.map = (function() {

        function _init() {

            var app,
                mapModel,
                mapView,
                debugView,
                notifications;

            notifications = new NotificationList();
            mapModel = new MapModel();
            mapModel.on("change", function() {
                notifications.fetch({reset: true, url: ["notifications?west=", mapModel.get('west'), "&east=", mapModel.get('east'), "&north=", mapModel.get('north'), "&south=", mapModel.get('south')].join("")});
            });

            app = new AllNotificationsView({ collection : notifications });
            mapView = new MapView({ collection : notifications, model : mapModel });
            debugView = new DebugView({ model : mapModel });
            
            _.each(['west', 'east', 'north', 'south'], function(el) {
                $("#mapInfo ." + el).text(mapModel.get(el).toFixed(2));
            });

        }

        function _initUpdate() {
            $("#lat").val(map.center.lat);
            $("#lon").val(map.center.lng);
        }

        return {
            init : function() {
                _init();
            }
        }

    })();

    $(waze.map.init);

})();