var db = require('../config');
var bcrypt = require('bcrypt-nodejs');
var Promise = require('bluebird');

var User = db.Model.extend({
  tableName: 'users',

  makeHash: function(password) {
    return new Promise (function (resolve) {
      bcrypt.genSalt(10, function(err, salt) {
        if (err) {
          throw new Error("Error from bcrypt.genSalt: " + err.message);
        }
        bcrypt.hash(password, salt, null, function(err, hash) {
          if (err) {
            throw new Error("Error from bcrypt.hash: " + err.message);
          }
          resolve(hash);
        });
      });
    });
  },
  compare: function(password) {
    return new Promise(function (resolve) {
      bcrypt.compare(password, this.get('hash'), resolve);
    }.bind(this));

  },
  initialize: function() {
    this.on('creating', function(model, attrs, options) {
      var password = model.get('hash');
      this.makeHash(password).then(function (result) {
        model.set('hash', result);
      });
    });
  }
});

module.exports = User;
