var crypto       = require('crypto');
var MongoDB      = require('mongodb').Db;
var Server       = require('mongodb').Server;
var ObjectID     = require('mongodb').ObjectID;
//var moment       = require('moment');

var config       = require('./config');

console.log ("[DB-MANAGER]::Start");

var db = new MongoDB(config.cfg().dbName, new Server(config.cfg().dbHost, config.cfg().dbPort, {auto_reconnect: true}), {w: 1});
    db.open(function(e, d){
    if (e) {
        console.log(e);
    }   else{
        console.log('connected to database :: ' + config.cfg().dbName);

        if(config.cfg().dbUser.length > 0) {
            db.authenticate(config.cfg().dbUser, config.cfg().dbPass, function(e, d){
                if(e) {
                    console.log('Error using :: ' + config.cfg().dbUser);
                    console.log(e);
                }
                else {
                    console.log('logged with :: ' + config.cfg().dbUser);
                }
            });
        }
    }
});

/*
var accounts = db.collection('accounts'),
    topics = db.collection('topics'),
    notes = db.collection('notes'),
    subscriptions = db.collection('subscriptions');
*/
/* ---------------------------------------------------------- Account part ------------------------------------------*/


