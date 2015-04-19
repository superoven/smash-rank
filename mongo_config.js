var mongoose = require('mongoose');
var async = require('async');
var _ = require('lodash');

mongoose.connect('mongodb://localhost/test');
var db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));

var playerSchema = mongoose.Schema({
    name: String,
    displayName: String,
    rating: {
        mu: Number,
        sigma: Number
    }
});
var Player = mongoose.model('Player', playerSchema);

var configSchema = mongoose.Schema({
    key: String,
    value: String
});
var Config = mongoose.model('Config', configSchema);

function get_config(list_of_keys, final_callback) {
    async.parallel(
        _.reduce(list_of_keys, function (ret, a) {
            ret[a] = function (callback) { Config.findOne({key: a}, function (err, res) { callback(null, res.value)}); };
            return ret;
        }, {}),
        function (err, results) {
            final_callback(results);
        }
    );
}

module.exports = {
    Player: Player,
    get_config: get_config
};
