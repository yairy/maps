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
    
    // I'll use this to keep track of notifications that were expanded.
    // this is necessary because the notification list in re-rendered upon map refresh , so
    // if a notification was expanded it would collapse it.
    var expandedNotifications = {};
    
    /*** MODELS ***/
    
    Notification = Backbone.Model.extend();
    
    // Overiding Backbone's reset method, because by default it doesnt fire remove events for the removed models
    NotificationList = Backbone.Collection.extend({
        reset: function (models, options) {
            var i, l;
            
            models = models || [];
            options = options || {};
        
            for (i = 0, l = this.models.length; i < l; i = i + 1) {
                this._removeReference(this.models[i]);
                this.models[i].trigger('remove', this.models[i], this); // This is the line I needed to add
            }
        
            this._reset();
            this.add(models, _.extend({silent: true}, options));
            if (!options.silent) {
                this.trigger('reset', this, options);
            }
            return this;
        }
    });
    
    MapModel = Backbone.Model.extend();
    
    /*** Views ***/
    
    NotificationView = Backbone.View.extend({
        tagName:  'li',
        template: _.template($('#notificationTemplate').html()), // using underscore micro templating engine
        events: {
            'click .title button'   : 'toggleNotification',
            'click button.edit'   : 'launchPopup'
        },
                
		/* Sets the form fields on the popup accrding to the notification */
        modelToForm: function ($form, notification) {
            $form.find('.lon').data('lon', notification.get('lon'));
            $form.find('.lon').text(parseFloat(notification.escape('lon')).toFixed(4));
            $form.find('.lat').data('lat', notification.get('lat'));
            $form.find('.lat').text(parseFloat(notification.escape('lat')).toFixed(4));
            $form.find('.description').val(notification.escape('description'));
            $form.find('.title').val(notification.escape('title'));
            $form.find('.vote-up').text(notification.get('votes_up'));
        },
        
		/* ... and the other way around */
        formToModel: function ($form, notification) {
            notification.set('lon', $form.find('.lon').data('lon'));
            notification.set('lat', $form.find('.lat').data('lat'));
            notification.set('description', $form.find('.description').val());
            notification.set('title', $form.find('.title').val());
        },
        
		initialize: function () {
            this.listenTo(this.model, 'destroy', this.destroyNotification);
            this.listenTo(this.model, 'change', this.render);
            this.listenTo(this.model, 'remove', this.remove);
        },
        
		render: function () {
            var params = this.model.toJSON();
            
            params.lat = params.lat.toFixed(4);
            params.lon = params.lon.toFixed(4);
            this.$el.html(this.template(params));
            
            // this notificatio was expanded before the maps refresh, so we'll re-display it.
            if (expandedNotifications[this.model.id] === true) {
                this.$el.find('.more-details').removeClass('hidden');
            }
            return this;
        },
        
		remove: function () {
            // This fixes a problem where the notification is removed for unsaved notification, if the popup causes the map to refresh
            // when it chnages the bounds
            if (!this.model.isNew()) {
                this.$el.remove();
                M.removeLayer(this.marker);
            }
        },
        
		toggleNotification : function () {
            this.$('.more-details').toggleClass('hidden');
            this.$('.title button').toggleClass('expanded');
            
            if (!this.$('.more-details').hasClass('hidden')) {
                expandedNotifications[this.model.id] = true; // notification was expanded
            } else {
                delete expandedNotifications[this.model.id]; // notification was collapsed, we'll delete it
            }
        },
        
        // This will handle placing the marker on the map
        renderMarker : function () {
            var that = this,
                notification = this.model,
                options = { riseOnHover : true };
            
            // Create a new marker and add it to the map. Bind a popup to be opened when a user clicks on the marker.
            this.marker = L.marker([notification.get('lat'), notification.get('lon')], options);
            this.marker.addTo(M);
            
            // Here we'll use a template from the html that's under 
            this.marker.bindPopup($('#notificationPopupTemplate').html(), { keepInView : true });
            
            // This will handle the behavior when the popup opens on the map
            this.marker.on('popupopen', function (event) {
                M.popupOpen = true;
                var $form = $('form.notification-popup');
                
                that.modelToForm($form, notification);
                $form.submit(function (event) {
                    event.preventDefault();
                    that.formToModel($form, notification);
                    notification.save({}, {
                        url : '/notifications' + (notification.isNew() ? '' : '/' + notification.get('id')),
                        success : function () {
                            $form.addClass('success');
                            setTimeout(function () { // we'll display a success message and close the popup
                                that.marker.closePopup();
                                M.popupOpen = false;
                            }, 1000);
                        },
                        error : function () {
                            $form.addClass('error');
                        }
                    });
                    
                });
				that.registerUpVote($form); //here we'll registert the bevior when cliking the 'vote up' button
                // we can't use notification.save - see the doc
				
                $form.find('button.delete').click(function (event) {
                    event.preventDefault();
                    notification.destroy({
                        url : '/notifications/' + notification.get('id'),
                        success : function () { M.popupOpen = false; }
                    });
                });
            });
            if (this.model.isNew()) { // if this is a new notification, we'll open the popup right away
                this.marker.openPopup();
            }

        },
        
        // This will execute when the user clicks the edit button in the notification list
        launchPopup: function () {
            var notification = this.model,
                that = this;
          
            // We'll use bpopup to show a simple modal 
            $('div.popup').bPopup({
                onOpen : function () {
                    var $form = $('form.notification-edit-popup');
                    that.modelToForm($form, notification); //We unserialize the model to the form
                    
                    // user clicks save
                    $form.submit(function (event) {
                        event.preventDefault();
                        that.formToModel($form, notification); // when user submits, serialize the form input to the model and save it
                        notification.save({}, {
                            url : '/notifications' + (notification.isNew() ? '' : '/' + notification.get('id')),
                            success : function () {
                                $form.addClass('success');
                                setTimeout(function () { $('div.popup').bPopup().close(); }, 1000);
                            },
                            error : function () {
                                $form.addClass('error');
                            }
                        });
                        
                    });
					
					that.registerUpVote($form); //here we'll registert the bevior when cliking the 'vote up' button
                    // we can't use notification.save - see the doc
					
                    // we need to stop the event - otherwise the form will submit
                    $form.find('.closebutton').click(function (event) {
                        event.preventDefault();
                        event.stopPropagation();
                    });
                
                    // user clicks delete
                    $form.find('button.delete').click(function (event) {
                        event.preventDefault();
                        notification.destroy({
							url : '/notifications/' + notification.get('id'),
							success : function () { $('div.popup').bPopup().close(); }
						});
                    });
                    
                    $form.find("input[type=text]").first().focus();
                },
                
                //parameter to bpopup. Clicking on elements with this class name will close it.
                closeClass : 'close'
            });
        },

		registerUpVote : function ($form) {
			var notification = this.model;

			$form.find('.vote-up').click(function (event) {
				event.preventDefault();
				event.stopPropagation();
				$.ajax({
					url : '/notifications/' + notification.get('id') + '/upvote.json',
					type: 'PUT',
					cache: false,
					success : function () {
						var votes_up = notification.get('votes_up');
						votes_up = votes_up + 1;
						$('button.vote-up').text(votes_up);
						
						// while it's true that we can't use notification.save to save the notification to the server,
                        // we can at least set the votes_property to trigger change event for element that are listening
                        notification.set('votes_up', votes_up);
					}
				});
					
			});
		
		},
        destroyNotification : function () {
            this.$el.remove();
            M.removeLayer(this.marker); // this removes the marker from the map
            delete expandedNotifications[this.model.id];
        }
    });
    
    NotificationListView = Backbone.View.extend({
        el: $('ul.notification-list'),
    
        initialize: function () {
            this.listenTo(this.collection, 'add', this.addOne);
            this.listenTo(this.collection, 'reset', this.addAll);
        },
    
        addOne: function (notification) {
            var index = this.collection.indexOf(notification),
                view = new NotificationView({ model: notification});
            view.renderMarker();
            
            //index is the index of the element that was added. We need to add it in the correct place in the list.
            if (index === 0) { // it's going to be the first one...
                this.$el.append(view.render().el);
            } else { // if note, we'll get the element at index index - 1 and add it after.
                index = index - 1;
                this.$el.find(">li:eq(" + index + ")").after(view.render().el);
            }
        },
        
        addAll: function () {
            this.collection.each(this.addOne, this);
        }
    });

    NotificationListCounterView = Backbone.View.extend({
        el: $('div.notification-list-counter span.notifications-displayed'),
    
        initialize: function () {
            this.listenTo(this.collection, 'all', this.updateCounter);
        },
    
        updateCounter : function () {
            var size = this.collection.size();
            
            this.$el.text(size);
            updateAllNotificationsCount(size);
        }
        
    });
    
    MapView = Backbone.View.extend({
        initialize: function () {
            var that = this,
                bounds;
    
            // This is where the notification is actually created. Note that in this point it isn't save yet.
            M.on('click', function (e) {
                var notification = new Notification({lon : e.latlng.lng, lat : e.latlng.lat, title : 'untitled', description : '', votes_up : 0});
                that.collection.add(notification);
            });
    
            M.on('viewreset moveend', function () {
                // when the map moves , the markers will redrow. So we'll block this from happening when a dialog is open
                // there is minor issue here, as some notification might not be seen immediatley.
                if (!M.popupOpen) {
                    that.refreshBounds();
                }
            });
    
            // this will fire when the user enters the center manually in the debug form
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
    
    // This s where everything starts...
    function _init() {
    
        var notifications,
            counterView,
            debugView,
            mapModel,
            mapView,
            app;
        
        // fetch notification list from server
        // parameter reset is a boolean
        function fetch(reset) {
            notifications.fetch({reset: reset, url: ["notifications?west=", mapModel.get('west'), "&east=", mapModel.get('east'), "&north=",             mapModel.get('north'), "&south=", mapModel.get('south')].join("")});
        }
    
        notifications = new NotificationList();
        notifications.comparator = function (first, second) { // This suppose to find which of the 2 points is closer to the center
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
            
            // p is just a function that takes a number return its power of 2
            // just to make code more readable
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
        
        mapModel = new MapModel(getBounds()); //setting the initial state of the map model
        mapModel.on("change", function () { // if the map moves, we'll re-fetch the notification list
            fetch(true);
        });
    
        mapView = new MapView({ collection : notifications, model : mapModel});
        app = new NotificationListView({ collection : notifications});
        counterView = new NotificationListCounterView({ collection : notifications});
        debugView = new DebugView({ model : mapModel });
        fetch(true); // Get the initial list
        
        // Polling logic
        setInterval(function () {
            if (!M.popupOpen) { // we don't want to redraw the map when there is an open popup on the map - it will close it
                fetch(true);
                updateAllNotificationsCount(notifications.size()); /// ... and getting the counter of all notifications
                
            }
        }, 20000);
        
        // Setting the inital state of the debug line 
        _.each(['west', 'east', 'north', 'south'], function (el) {
            $("#debugInfo ." + el).text(mapModel.get(el).toFixed(4));
        });
    
    }
    
    /**** Some private methods **********/
    
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
    
    function updateAllNotificationsCount(size) {
        $.ajax({
            url: '/count',
            cache: false,
            success: function (data) {
                $('span.all-notifications').text(data.count);
                
                if (size >= data.count) {
                    $('div.notification-list-counter').addClass('hidden');
                    $('div.showing-all').removeClass('hidden');
                } else {
                    $('div.notification-list-counter').removeClass('hidden');
                    $('div.showing-all').addClass('hidden');
                }
            },
            dataType: 'json'
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