var request = require('request');
var bcrypt = require('bcrypt-nodejs');
var session = require('express-session');
var uuid = require('uuid');
var cookieParser = require('cookie-parser');

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

// exports.userLoginValidate = function(req, res, users) {
//   var username = req.body.username;
//   var password = req.body.password;
//   users.query('where', 'username', '=', username).fetch().then(function(result) {
//     if (!result.models.length) {
//       res.redirect('/login');
//       return;
//     }
//     var user = result.models[0];
//     var result = user.compare(password).then(function(err, result) {return result;});
//     console.log(result);
//     console.log(JSON.parse(JSON.stringify(result)));
//     if (result) {
//       res.cookie('loggedIn', 'true', {signed: true});
//       res.set('location', '/');
//       res.redirect('/');
//     } else {
//       res.redirect('/login');
//     }
//   });
// };
exports.userLoginValidate = function(req, res, users) {
  var username = req.body.username;
  var password = req.body.password;
  users.query('where', 'username', '=', username).fetch().then(function(result) {
    if (!result.models.length) {
      res.redirect('/login');
      return;
    }
    bcrypt.compare(password, result.models[0].get('hash'), function (err, result) {
      if (err) {
        throw new Error('error from bcrypt: ' + err);
      } else if (result) {
        res.cookie('loggedIn', 'true', {signed: true});
        res.set('location', '/');
        res.redirect('/');
      } else {
        res.redirect('/login');
      }
    });
  });
};

exports.loginStatus = function (req, res, cb) {
  cb(!!req.signedCookies.loggedIn);
};

exports.logout = function (req, res) {
  res.clearCookie('loggedIn');
  res.redirect('/');
};
