
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
app.use(express.static(path.join(__dirname, 'public')));

// development only
if ('development' == app.get('env')) {
  app.use(express.errorHandler());
}

app.get('/notifications', function (req, res) {
	var west = req.param('west'),
		east = req.param('east'),
		north = req.param('north'),
		south = req.param('south'),
		since = req.param('since');


	request('http://test-notifications.staging.waze.com/notifications/updates.json', function(error, response, body) {
		var notifications = JSON.parse(body),
			active = _.filter(notifications, function(notification) {
				if (!notification.is_active) {
					return false;
				}

				return true;
			});
			res.set('Content-Type', 'appication/json');
			res.send(JSON.stringify(active));

	});

});
app.get('/', routes.index);

http.createServer(app).listen(app.get('port'), function(){
  console.log('Express server listening on port ' + app.get('port'));
});
