/*jslint nomen: true*/
/*global Backbone,_,$,L,waze */
/*jslint browser: true*/

if (typeof waze === "undefined") {
    var waze = {};
}

waze.map = (function () {
    'use strict';

    var Notification, NotificationList, MapModel, NotificationView,
        NotificationListView, MapView, DebugView;
    
    Notification = Backbone.Model.extend({
        url : '/notifications'
    });
    
    NotificationList = Backbone.Collection.extend();
    
    MapModel = Backbone.Model.extend();
    
    NotificationView = Backbone.View.extend({
        tagName:  'div',
        template: _.template($('#notificationTemplate').html()),
        events: {
            'click .title span'   : 'toggleNotification',
            'click button'   : 'collapseNotification'
        },
        render: function () {
            this.$el.html(this.template(this.model.toJSON()));
            return this;
        },
        toggleNotification : function () {
            this.$('.more-details').toggleClass('hidden');
        }
    });
    
    NotificationListView = Backbone.View.extend({
        el: $('div.notification-list'),
    
        initialize: function () {
            this.listenTo(this.collection, 'add', this.addOne);
            this.listenTo(this.collection, 'reset', this.addAll);
        },
    
        addOne: function (notification) {
            var view = new NotificationView({ model: notification });
            this.$el.append(view.render().el);
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
    
            this.map = L.map('map').setView([51.505, -0.09], 13);
            L.tileLayer('http://{s}.tile.cloudmade.com/d1954fa5c5934eecbd0f07c6f7d2d339/997/256/{z}/{x}/{y}.png', {
                attribution: 'Map data &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors, <a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, Imagery © <a href="http://cloudmade.com">CloudMade</a>',
                maxZoom: 18
            }).addTo(this.map);
            this.refreshBounds();
    
            this.map.on('click', function (e) {
                var marker = L.marker(e.latlng);
                marker.addTo(that.map);
                marker.bindPopup($('#notificationPopupTemplate').html());
                marker.on('popupopen', function (event) {
                    var $form = $('form.notification-popup'),
                        notification;
                    
                    $form.find('.lon').text(e.latlng.lng);
                    $form.find('.lat').text(e.latlng.lat);
                    $form.addClass('unsaved-notification');
                    $form.submit(function (event) {
                        event.preventDefault();
                        notification = new Notification({
                            lon : e.latlng.lng,
                            lat : e.latlng.lat,
                            description : $form.find('input.description').val(),
                            title : $form.find('input.title').val()
                        });
                        that.collection.add(notification);
                        notification.save({}, {
                            success : function () {
                                $form.removeClass('unsaved-notification');
                                $form.addClass('success');
                                setTimeout(function () {marker.closePopup(); }, 1000);
                            },
                            error : function () {
                                $form.addClass('error');
                            }
                        });
                        
                    });
                    
                    $form.find('button.delete').click(function (event) {
                        event.preventDefault();
                        if (!$form.hasClass('unsaved-notification')) {
                            notification.destroy();
                        }
                        that.map.removeLayer(marker);
                    });
                });
            });
    
            this.map.on('viewreset moveend', function () {
                that.refreshBounds();
            });
    
            this.listenTo(this.collection, 'add', this.addOne);
            this.listenTo(this.collection, 'reset', this.addAll);
            this.listenTo(this.model, 'change:center', this.panMap);
        },
    
        addOne: function (notification) {
            var lat = notification.get('lat'),
                lon = notification.get('lon'),
                that = this,
                marker;
    
            if (!lat || !lon) {
                return;
            }
    
            marker = L.marker([lat, lon]);
            marker.addTo(this.map);
            marker.bindPopup($('#notificationPopupTemplate').html());
            marker.on('popupopen', function (event) {
                var $form = $('form.notification-popup');
                
                $form.find('.lon').text(lon);
                $form.find('.lat').text(lat);
                $form.find('input.title').val(notification.get('title'));
                $form.find('input.description').val(notification.get('description'));
                
                $form.submit(function (event) {
                    event.preventDefault();
                    //notification.save();
                });
                    
                $form.find('button.delete').click(function (event) {
                    event.preventDefault();
                    notification.destroy({
                        url : '/notifications/' + notification.get('id')
                    });
                });

            });
        },
        
        addAll: function () {
            this.collection.each(this.addOne, this);
        },
    
        panMap: function () {
            this.map.panTo(this.model.get('center'));
        },
    
        refreshBounds : function () {
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
    
        var app,
            mapModel,
            mapView,
            debugView,
            notifications;
        
        function fetch(notifications, model) {
            notifications.fetch({reset: true, url: ["notifications?west=", mapModel.get('west'), "&east=", mapModel.get('east'), "&north=",             mapModel.get('north'), "&south=", mapModel.get('south')].join("")});
        }
    
        notifications = new NotificationList();
        mapModel = new MapModel();
        mapModel.on("change", function () {
            fetch(notifications, mapModel);
        });
    
        app = new NotificationListView({ collection : notifications });
        mapView = new MapView({ collection : notifications, model : mapModel });
        debugView = new DebugView({ model : mapModel });
        
        setInterval(function () {
            fetch(notifications, mapModel);
        }, 10000);
        
        _.each(['west', 'east', 'north', 'south'], function (el) {
            $("#mapInfo ." + el).text(mapModel.get(el).toFixed(4));
        });
    
    }
    
    return {
        init : function () {
            _init();
        }
    };
    
}());

$(waze.map.init);