var request = require('request');
var bcrypt = require('bcrypt-nodejs');

exports.getUrlTitle = function(url, cb) {
  request(url, function(err, res, html) {
    if (err) {
      console.log('Error reading url heading: ', err);
      return cb(err);
    } else {
      var tag = /<title>(.*)<\/title>/;
      var match = html.match(tag);
      var title = match ? match[1] : url;
      return cb(err, title);
    }
  });
};

var rValidUrl = /^(?!mailto:)(?:(?:https?|ftp):\/\/)?(?:\S+(?::\S*)?@)?(?:(?:(?:[1-9]\d?|1\d\d|2[01]\d|22[0-3])(?:\.(?:1?\d{1,2}|2[0-4]\d|25[0-5])){2}(?:\.(?:[0-9]\d?|1\d\d|2[0-4]\d|25[0-4]))|(?:(?:[a-z\u00a1-\uffff0-9]+-?)*[a-z\u00a1-\uffff0-9]+)(?:\.(?:[a-z\u00a1-\uffff0-9]+-?)*[a-z\u00a1-\uffff0-9]+)*(?:\.(?:[a-z\u00a1-\uffff]{2,})))|localhost)(?::\d{2,5})?(?:\/[^\s]*)?$/i;

exports.isValidUrl = function(url) {
  return url.match(rValidUrl);
};

/************************************************************/
// Add additional utility functions below
/************************************************************/


exports.generateHash = function(password, callback) {
  bcrypt.genSalt(10, function(err, salt) {
    if (err) {
      throw new Error("Error from bcrypt.genSalt: " + err.message);
    }
    bcrypt.hash(password, salt, null, function(err, hash) {
      if (err) {
        throw new Error("Error from bcrypt.hash: " + err.message);
      }
      callback(hash);
     });
  });
};


exports.userLoginValidate = function(req, res, users) {
  var username = req.body.username;
  var password = req.body.password;
  users.query('where', 'username', '=', username).fetch().then(function(result) {
    var user = result.toJSON();
    if (!user.length) {
      res.set('location', '/login');
      res.render('login');
      return;
    }
    bcrypt.compare(password, user[0].hash, function (err, result) {
      if (err) {
        throw new Error('error from bcrypt: ' + err);
      } else if (result) {
        res.set('location', '/');
        res.render('index');
      } else {
        res.set('location', '/login');
        res.render('login');
      }
    });
  });
};
