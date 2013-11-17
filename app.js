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
var wazeUrl = 'http://test-notifications.staging.waze.com';


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

app.get('/notifications', routes.getNotifications);

// I don't have API function just for notification count, so i'll get them all
app.get('/count', routes.countNotifications);

app.post('/notifications', routes.postNotification);

app.put('/notifications/:id', routes.updateNotification);

app.put('/notifications/:id/upvote.json', routes.upVote);

// we'll use this form: app['delete'] to shush the linter ('delete' is a reserved word)
app['delete']('/notifications/:id', routes.destroyNotification);

app.get('/', routes.index);

http.createServer(app).listen(app.get('port'), function () {
    console.log('Express server listening on port ' + app.get('port'));
});
