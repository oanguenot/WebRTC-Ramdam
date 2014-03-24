//var dbHost= 'mongo.onmodulus.net';
//var dbName= 'patuP8at';
//var dbUser= 'crock';
//var dbPass= 'crock';

var dbConfig = {
    dbUser      : 'crock',
    dbPass      : 'crock',
    dbPort      : 27017,
    dbHost      : 'mongo.onmodulus.net',
    dbName      : 'patuP8at'
};
/*
var dbConfig = {
    dbUser      : "",
    dbPass      : "",
    dbPort      : 27017,
    dbHost      : 'localhost',
    dbName      : 'connivence'
};
*/

exports.cfg = function() {
    return dbConfig;
};

