var express = require('express');
var util = require('./lib/utility');
var partials = require('express-partials');
var bodyParser = require('body-parser');
var bcrypt = require('bcrypt-nodejs');
var session = require('express-session');
var uuid = require('uuid');

var db = require('./app/config');
var Users = require('./app/collections/users');
var User = require('./app/models/user');
var Links = require('./app/collections/links');
var Link = require('./app/models/link');
var Click = require('./app/models/click');

var app = express();

app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');
app.use(partials());
// Parse JSON (uniform resource locators)
app.use(bodyParser.json());
// Parse forms (signup/login)
app.use(bodyParser.urlencoded({ extended: true }));

app.use(session({
  genid: function (req) {
    return uuid.v1();
  },
  secret: '$MichaelRick$'
}));

app.use(express.static(__dirname + '/public'));

app.get('/', function(req, res) {
  util.loginStatus(req, res, function(status) {
    status ? res.render('index') : res.redirect('/login');
  });
});

app.get('/create', function(req, res) {
  util.loginStatus(req, res, function(status) {
    status ? res.render('create') : res.redirect('/login');
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
      // eventually, if found, return error = user already exists
      // console.log('checkers');
      // res.send(200, found.attributes);
    } else {
      util.generateHash(password, function (hash) {
        var user = new User({
          username: username,
          hash: hash
        });

        user.save().then(function (newUser) {
          Users.add(newUser);
          req.session.loggedIn = true;
          res.set('location', '/');
          res.redirect('/');
        });
      });
    }
  });
});

app.post('/login', function(req, res) {
  util.userLoginValidate(req, res, Users);
});


/*
need login
  - used for login if user is created

  1. check username
  2. get salt from database for supplied username
  3. pass password + salt into hashing function
  4. check output against database hashed password
    a. if yes, log in and return token
    b. if no, return error bad password

need signup
  - used for user creation

  1. user goes to user creation page and makes a post request
  with username and password
  2. create a salt
  3. store username + salt in database
  4. pass password and salt through hashing function and store in database
  5. run login script on user



create a system so that when a user logs in, the session has
a property called login status set to true
and then when a user tries to visit any web page we should
check login status
  if true allow user to go to page
  if false redirect to login page
  simple**as**THAT!

*/


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
