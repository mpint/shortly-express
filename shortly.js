var express = require('express');
var util = require('./lib/utility');
var partials = require('express-partials');
var bodyParser = require('body-parser');
var bcrypt = require('bcrypt-nodejs');
var session = require('express-session');
var cookieParser = require('cookie-parser');

var db = require('./app/config');
var Users = require('./app/collections/users');
var User = require('./app/models/user');
var Links = require('./app/collections/links');
var Link = require('./app/models/link');
var Click = require('./app/models/click');

var app = express();
var whatsMyName = 'richard'
app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');
app.use(partials());
// Parse JSON (uniform resource locators)
app.use(bodyParser.json());
// Parse forms (signup/login)
app.use(bodyParser.urlencoded({ extended: true }));

app.use(cookieParser('$MichaelRick$'));

app.use(express.static(__dirname + '/public'));

app.get('/', function(req, res) {
  util.loginStatus(req, res, function(status) {
    status ? res.render('index') : res.redirect('/login');
  });
});

app.get('/create', function(req, res) {
  util.loginStatus(req, res, function(status) {
    status ? res.render('index') : res.redirect('/login');
  });
});

app.get('/signup', function(req, res) {
  util.loginStatus(req, res, function(status) {
    status ? res.redirect('/') : res.render('signup');
  });
});

app.get('/login', function(req, res) {
  util.loginStatus(req, res, function(status) {
    status ? res.redirect('/') : res.render('login');
  });
});

app.get('/links', function(req, res) {
  util.loginStatus(req, res, function(status) {
    if (status) {
      Links.reset().fetch().then(function(links) {
        res.send(200, links.models);
      });
    } else {
      res.redirect('/login');
    }
  });
});

app.post('/links', function(req, res) {
  var uri = req.body.url;

  if (!util.isValidUrl(uri)) {
    console.log('Not a valid url: ', uri);
    return res.send(404);
  }

  new Link({ url: uri }).fetch().then(function(found) {
    if (found) {
      res.send(200, found.attributes);
    } else {
      util.getUrlTitle(uri, function(err, title) {
        if (err) {
          console.log('Error reading URL heading: ', err);
          return res.send(404);
        }

        var link = new Link({
          url: uri,
          title: title,
          base_url: req.headers.origin
        });

        link.save().then(function(newLink) {
          Links.add(newLink);
          res.send(200, newLink);
        });
      });
    }
  });
});

/************************************************************/
// Write your authentication routes here
/************************************************************/

app.post('/signup', function(req, res) {
  var username = req.body.username;
  var password = req.body.password;
  new User({username: username}).fetch().then(function (found) {
    if (found) {
      res.set('location', '/');
      res.redirect('/');
      return;
    }
    var user = new User({
      username: username,
      hash: password
    }).save().then(function (newUser) {
      newUser.save();
      Users.add(newUser);
      res.cookie('loggedIn', 'true', {signed: true});
      res.set('location', '/');
      res.redirect('/');
    });
  });
});

app.post('/login', function(req, res) {
  util.userLoginValidate(req, res, Users);
});

app.post('/logout', function(req, res) {
  util.logout(req, res);
});

/************************************************************/
// Handle the wildcard route last - if all other routes fail
// assume the route is a short code and try and handle it here.
// If the short-code doesn't exist, send the user to '/'
/************************************************************/

app.get('/*', function(req, res) {
  new Link({ code: req.params[0] }).fetch().then(function(link) {
    if (!link) {
      res.redirect('/');
    } else {
      var click = new Click({
        link_id: link.get('id')
      });

      click.save().then(function() {
        db.knex('urls')
          .where('code', '=', link.get('code'))
          .update({
            visits: link.get('visits') + 1,
          }).then(function() {
            return res.redirect(link.get('url'));
          });
      });
    }
  });
});

console.log('Shortly is listening on 4568');
app.listen(4568);
