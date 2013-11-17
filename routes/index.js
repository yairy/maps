/*jslint nomen: true*/
/*jslint node: true */

/*
 * GET home page.
 */


var request = require('request');
var _ = require('underscore');
var wazeUrl = 'http://test-notifications.staging.waze.com';

exports.index = function (req, res) {
    'use strict';
    res.render('index', {
        title: 'Express'
    });
};

/*
 * GET notification list
 */

exports.getNotifications = function (req, res) {
	var west = req.param('west'),
		east = req.param('east'),
		north = req.param('north'),
		south = req.param('south'),
		since = req.param('since');

    request.get(wazeUrl + '/notifications/updates.json', function (error, response, body) {
        var notifications,
            active,
            locatedInArea = function (notification, west, east, north, south) {
                return notification.lon > west && notification.lon < east && notification.lat < north && notification.lat > south;
            };
        
        if (error) {
            res.send('500', "Server Error");
        } else {
            notifications = JSON.parse(body);
            active = _.filter(notifications, function (notification) {
                if (notification.is_active && locatedInArea(notification, west, east, north, south) && !isNaN(notification.lon) && !isNaN(notification.lat)) {
                    return true;
                }

                return false;
            });
            res.json(active);
        }
	});
            
};

exports.countNotifications = function (req, res) {
    request.get(wazeUrl + '/notifications/updates.json', function (error, response, body) {
        var notifications;
        
        if (error) {
            res.send('500', "Server Error");
        } else {
            notifications = JSON.parse(body);
            res.json({ count : notifications.length });
        }
	});
            
};

exports.postNotification = function (req, res) {
	var params = {};
    _.each(['lon', 'lat', 'description', 'title'], function (prop) {
        params['notification[' + prop + ']'] = req.param(prop);
    });

    request.post({ url : wazeUrl + '/notifications.json', qs : params}).pipe(res);

};

exports.updateNotification = function (req, res) {
    var params = {};
    _.each(['lon', 'lat', 'description', 'title'], function (prop) {
        params['notification[' + prop + ']'] = req.param(prop);
    });
    request.put({ url : wazeUrl + '/notifications/' + req.params.id + '.json', qs : params}).pipe(res);
};

exports.upVote = function (req, res) {
    request.put({ url : wazeUrl + '/notifications/' + req.params.id + '/upvote.json'}).pipe(res);
};

exports.destroyNotification = function (req, res) {
    request.del({ url : wazeUrl + '/notifications/' + req.params.id + '.json'}).pipe(res);
};

