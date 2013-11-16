/*jslint nomen: true*/
/*global Backbone,_,$,L,waze */
/*jslint browser: true*/

if (typeof waze === "undefined") {
    var waze = {};
}

waze.map = (function () {
    'use strict';

    var Notification, NotificationList, MapModel, NotificationView,
        NotificationListView, NotificationListCounterView, MapView, DebugView, M;
    
    Notification = Backbone.Model.extend();
    
    NotificationList = Backbone.Collection.extend();
    
    MapModel = Backbone.Model.extend();
    
    NotificationView = Backbone.View.extend({
        tagName:  'div',
        template: _.template($('#notificationTemplate').html()),
        events: {
            'click .title button'   : 'toggleNotification',
            'click button'   : 'collapseNotification'
        },
        initialize: function () {
            this.listenTo(this.model, 'destroy', this.destroyNotification);
            this.listenTo(this.model, 'change', this.render);
            this.listenTo(this.model, 'remove', this.remove);
        },
        render: function () {
            this.$el.html(this.template(this.model.toJSON()));
            return this;
        },
        remove: function () {
            this.$el.remove();
        },
        toggleNotification : function () {
            this.$('.more-details').toggleClass('hidden');
        },
        renderMarker : function () {
            var that = this,
                notification = this.model,
                options = { title : notification.get('title'), riseOnHover : true };
            
            this.marker = L.marker([notification.get('lat'), notification.get('lon')], options);
            this.marker.addTo(M);
            this.marker.bindPopup($('#notificationPopupTemplate').html(), { keepInView : true });
            this.marker.on('popupopen', function (event) {
                var $form = $('form.notification-popup');
                
                $form.find('.lon').text(notification.get('lon'));
                $form.find('.lat').text(notification.get('lat'));
                $form.find('.description').val(notification.escape('description'));
                $form.find('.title').val(notification.escape('title'));
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
            var index = this.collection.indexOf(notification),
                view = new NotificationView({ model: notification});
            view.renderMarker();
            if (index === 0) {
                this.$el.append(view.render().el);
            } else {
                index = index - 1;
                this.$el.find(">div:eq(" + index + ")").after(view.render().el);
            }
        },
        
        addAll: function () {
            this.collection.each(this.addOne, this);
        }
    });

    NotificationListCounterView = Backbone.View.extend({
        el: $('div.notification-list-counter span'),
    
        initialize: function () {
            this.listenTo(this.collection, 'all', this.updateConter);
        },
    
        updateConter : function () {
            this.$el.text(this.collection.size());
        }
        
    });
    
    MapView = Backbone.View.extend({
        initialize: function () {
            var that = this,
                bounds;
    
            M.on('click', function (e) {
                var notification = new Notification({lon : e.latlng.lng, lat : e.latlng.lat, title : 'untitled', description : ''});
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
            this.model.set(getBounds());
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
            counterView,
            debugView,
            mapModel,
            mapView,
            app;
        
        function fetch(reset) {
            notifications.fetch({reset: reset, url: ["notifications?west=", mapModel.get('west'), "&east=", mapModel.get('east'), "&north=",             mapModel.get('north'), "&south=", mapModel.get('south')].join("")});
        }
    
        notifications = new NotificationList();
        notifications.comparator = function (first, second) {
            var s = Math.sqrt,
                center = getBounds().center,
                centerLat = center.lat,
                centerLon = center.lng,
                firstLat = first.get('lat'),
                firstLon = first.get('lon'),
                secondLat = second.get('lat'),
                secondLon = second.get('lon'),
                firstDisance,
                secondDistance,
                p;
            
            // p is just a function that takes a numer return its power of 2
            p = (function () { return function (x) { return Math.pow(x, 2); }; }());
            
            firstDisance = s(p(firstLat - centerLat) + p(firstLon - centerLon));
            secondDistance = s(p(secondLat - centerLat) + p(secondLon - centerLon));
            
            if (firstDisance < secondDistance) {
                return -1;
            }
            if (firstDisance > secondDistance) {
                return 1;
            }
            return 0;
        };
        
        mapModel = new MapModel(getBounds()); //setting the initial state of the model
        mapModel.on("change", function () {
            fetch(false);
        });
    
        mapView = new MapView({ collection : notifications, model : mapModel});
        app = new NotificationListView({ collection : notifications});
        counterView = new NotificationListCounterView({ collection : notifications});
        debugView = new DebugView({ model : mapModel });
        fetch(false);
        
//        setInterval(function () {
//            fetch(false);
//            notifications.each(function (notification) {
//                if (notification.get('is_active')) {
//                    console.log(notification.get('title'));
//                }
//                    
//            });
//            
//        }, 3000);
        
        _.each(['west', 'east', 'north', 'south'], function (el) {
            $("#debugInfo ." + el).text(mapModel.get(el).toFixed(4));
        });
    
    }
    
    function getBounds() {
        var bounds = M.getBounds(),
            coordinates = {
                west : bounds.getWest(),
                east : bounds.getEast(),
                north : bounds.getNorth(),
                south : bounds.getSouth(),
                center : bounds.getCenter()
            };
        return coordinates;
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