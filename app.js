/*jslint nomen: true*/
/*jslint node: true */
"use strict";

/**
 * Module dependencies.
 */

var express = require('express');
var routes = require('./routes');
var http = require('http');
var path = require('path');
var request = require('request');
var _ = require('underscore');


var app = express();

// all environments
app.set('port', process.env.PORT || 3000);
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');
app.use(express.favicon('public/images/favicon.ico'));
app.use(express.logger('dev'));
app.use(express.bodyParser());
app.use(express.methodOverride());
app.use(express['static'](path.join(__dirname, 'public')));

// development only
if ('development' === app.get('env')) {
    app.use(express.errorHandler());
}


app.get('/notifications', function (req, res) {
	var west = req.param('west'),
		east = req.param('east'),
		north = req.param('north'),
		south = req.param('south'),
		since = req.param('since');

    request.get('http://test-notifications.staging.waze.com/notifications/updates.json', function (error, response, body) {
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
            
});

app.post('/notifications', function (req, res) {
	var params = {};
    _.each(['lon', 'lat', 'description', 'title'], function (prop) {
        params['notification[' + prop + ']'] = req.param(prop);
    });

    request.post({ url : 'http://test-notifications.staging.waze.com/notifications.json', qs : params}).pipe(res);

});

// we'll use this form: app['delete'] to shush the linter ('delete' is a reserved word)
app['delete']('/notifications/:id', function (req, res) {
    request.del({ url : 'http://test-notifications.staging.waze.com/notifications/' + req.params.id + '.json'}).pipe(res);

});

app.get('/', routes.index);

http.createServer(app).listen(app.get('port'), function () {
    console.log('Express server listening on port ' + app.get('port'));
});
