var trueskill = require('com.izaakschroeder.trueskill').create();
var async = require('async');
var unirest = require('unirest');
var format = require('string-format');
var _ = require("lodash");
var mongo = require('./mongo_config');

format.extend(String.prototype);

function find(name, callback) {
    mongo.Player.find({'name': name.toLowerCase()}, function (err, res) {
        callback(null, (!err && res.length > 0) ? res[0] : new mongo.Player({
            'name': name.toLowerCase(),
            'displayName': name,
            'rating': trueskill.createRating()
        }));
    });
}

function match(winner_name, loser_name) {
    async.parallel({
            winner: function (callback) { find(winner_name, callback); },
            loser: function (callback) { find(loser_name, callback); }
        },
        function (err, results) {
            var values = trueskill.update([[results.winner.rating], [results.loser.rating]], [1, 2]);
            results.winner.rating = values[0][0];
            results.loser.rating = values[1][0];
            results.winner.save(function (err, res) { if (err) { console.log(err); }});
            results.loser.save(function (err, res) { if (err) { console.log(err); }});
        }
    );
}

function record_matches(tournament_string) {
    mongo.get_config(['API_VER', 'API_KEY'], function (api) {
            async.parallel({
                    participants: function (callback) {
                        unirest.get("https://api.challonge.com/{0}/tournaments/{1}/participants.json".format(api.API_VER, tournament_string))
                            .field("api_key", api.API_KEY)
                            .end(function (response) {
                                callback(null, _.reduce(JSON.parse(response.raw_body), function (ret, a) {
                                    ret[a['participant']['id']] = a['participant']['name'];
                                    return ret;
                                }, {}));
                            });
                    },
                    matches: function (callback) {
                        unirest.get("https://api.challonge.com/{0}/tournaments/{1}/matches.json".format(api.API_VER, tournament_string))
                            .field("api_key", api.API_KEY)
                            .end(function (response) {
                                callback(null, JSON.parse(response.raw_body));
                            });
                    }
                },
                function (err, results) {
                    _.forEach(results['matches'], function (m) {
                        match(results['participants'][m['match']['winner_id']], results['participants'][m['match']['loser_id']]);
                    });
                }
            );
        }
    );
}

module.exports = {
    find: find,
    match: match,
    record_matches: record_matches
};
