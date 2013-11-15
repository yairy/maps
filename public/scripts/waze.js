/*jslint nomen: true*/
/*global Backbone,_,$,L,waze */
/*jslint browser: true*/

if (typeof waze === "undefined") {
    var waze = {};
}

waze.map = (function () {
    'use strict';

    var Notification, NotificationList, MapModel, NotificationView,
        NotificationListView, MapView, DebugView, M;
    
    Notification = Backbone.Model.extend();
    
    NotificationList = Backbone.Collection.extend();
    
    MapModel = Backbone.Model.extend();
    
    NotificationView = Backbone.View.extend({
        tagName:  'div',
        template: _.template($('#notificationTemplate').html()),
        events: {
            'click .title span'   : 'toggleNotification',
            'click button'   : 'collapseNotification'
        },
        initialize: function () {
            this.listenTo(this.model, 'destroy', this.destroyNotification);
            this.listenTo(this.model, 'change', this.render);
        },
        render: function () {
            this.$el.html(this.template(this.model.toJSON()));
            return this;
        },
        toggleNotification : function () {
            this.$('.more-details').toggleClass('hidden');
        },
        renderMarker : function () {
            var that = this,
                notification = this.model;
            
            this.marker = L.marker([notification.get('lat'), notification.get('lon')]);
            this.marker.addTo(M);
            this.marker.bindPopup($('#notificationPopupTemplate').html(), { keepInView : true });
            this.marker.on('popupopen', function (event) {
                var $form = $('form.notification-popup');
                
                $form.find('.lon').text(notification.get('lon').toFixed(4));
                $form.find('.lat').text(notification.get('lat').toFixed(4));
                $form.find('.description').val(notification.get('description'));
                $form.find('.title').val(notification.get('title'));
                $form.submit(function (event) {
                    event.preventDefault();
                    notification.set('lon', $form.find('.lon').text());
                    notification.set('lat', $form.find('.lat').text());
                    notification.set('description', $form.find('.description').val());
                    notification.set('title', $form.find('.title').val());
                    notification.save({}, {
                        url : '/notifications' + (notification.isNew() ? '' : '/' + notification.get('id')),
                        success : function () {
                            $form.addClass('success');
                            setTimeout(function () {that.marker.closePopup(); }, 1000);
                        },
                        error : function () {
                            $form.addClass('error');
                        }
                    });
                    
                });
                
                $form.find('button.delete').click(function (event) {
                    event.preventDefault();
                    notification.destroy({ url : '/notifications/' + notification.get('id')});
                });
            });
        },
        destroyNotification : function () {
            this.$el.remove();
            M.removeLayer(this.marker);
        }
    });
    
    NotificationListView = Backbone.View.extend({
        el: $('div.notification-list'),
    
        initialize: function () {
            this.listenTo(this.collection, 'add', this.addOne);
            this.listenTo(this.collection, 'reset', this.addAll);
        },
    
        addOne: function (notification) {
            var view = new NotificationView({ model: notification});
            this.$el.append(view.render().el);
            view.renderMarker();
        },
        
        addAll: function () {
            this.$el.empty();
            this.collection.each(this.addOne, this);
        }
    });
    
    MapView = Backbone.View.extend({
        initialize: function () {
            var that = this,
                bounds;
    
            this.refreshBounds();
    
            M.on('click', function (e) {
                var notification = new Notification({lon : e.latlng.lng, lat : e.latlng.lat, title : 'untitled', description : ''});
                notification.on('destroy', function () {console.log("boooo"); });
                that.collection.add(notification);
            });
    
            M.on('viewreset moveend', function () {
                that.refreshBounds();
            });
    
            this.listenTo(this.model, 'change:center', this.panMap);
        },
    
        panMap: function () {
            M.panTo(this.model.get('center'));
        },
    
        refreshBounds : function () {
            var bounds = M.getBounds();
            this.model.set({'west' : bounds.getWest(),
                'east' : bounds.getEast(),
                'north': bounds.getNorth(),
                'south': bounds.getSouth()
                });
        }
    
    });
    
    DebugView = Backbone.View.extend({
        el: $('#debugInfo'),
    
        initialize: function () {
            this.listenTo(this.model, 'change', this.update);
        },
    
        update : function (model) {
            var that = this;
            _.each(['west', 'east', 'north', 'south'], function (el) {
                that.$("." + el).text(model.get(el).toFixed(4));
            });
        },
    
        events: {
            'click button'   : 'centerButtonClicked'
        },
    
        centerButtonClicked: function () {
            this.model.set('center', [this.$("#lat").val(), this.$("#lon").val()]);
        }
    
    });
    
    function _init() {
    
        var notifications,
            debugView,
            mapModel,
            mapView,
            app;
        
        function fetch(notifications, model, reset) {
            notifications.fetch({reset: reset, url: ["notifications?west=", mapModel.get('west'), "&east=", mapModel.get('east'), "&north=",             mapModel.get('north'), "&south=", mapModel.get('south')].join("")});
        }
    
        notifications = new NotificationList();
        mapModel = new MapModel();
        mapModel.on("change", function () {
            fetch(notifications, mapModel, true);
        });
    
        mapView = new MapView({ collection : notifications, model : mapModel});
        app = new NotificationListView({ collection : notifications});
        debugView = new DebugView({ model : mapModel });
        
        setInterval(function () {
            fetch(notifications, mapModel, false);
            notifications.each(function (notification) {
                if (notification.get('is_active')) {
                    console.log(notification.get('title'));
                }
                    
            });
            
        }, 10000);
        
        _.each(['west', 'east', 'north', 'south'], function (el) {
            $("#debugInfo ." + el).text(mapModel.get(el).toFixed(4));
        });
    
    }
    
    function initMap() {
        M = L.map('map').setView([51.505, -0.09], 13); //London!
        L.tileLayer('http://{s}.tile.cloudmade.com/d1954fa5c5934eecbd0f07c6f7d2d339/997/256/{z}/{x}/{y}.png', {
            attribution: 'Map data &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors, <a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, Imagery © <a href="http://cloudmade.com">CloudMade</a>',
            maxZoom: 18
        }).addTo(M);
    }
    
    return {
        init : function () {
            initMap();
            _init();
        }
    };
    
}());

$(waze.map.init);