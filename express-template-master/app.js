const express = require("express");
const session = require("express-session");
const MongoStore = require("connect-mongo")(session);
const path = require("path");
const logger = require("morgan");
const cookieParser = require("cookie-parser");
const bodyParser = require("body-parser");
const passport = require("passport");
const LocalStrategy = require("passport-local");
const mongoose = require("mongoose");
const crypto = require("crypto");
const { check, validationResult } = require("express-validator");
const connect = process.env.MONGODB_URI;

// const REQUIRED_ENV = "SECRET MONGODB_URI".split(" ");

// REQUIRED_ENV.forEach(function(el) {
//   if (!process.env[el]) {
//     console.error("Missing required env var " + el);
//     process.exit(1);
//   }
// });

if (!process.env.SECRET) {
  console.log("Error: no secret");
  process.exit(1);
}

mongoose.connect(connect);

const models = require("./models/models");

const routes = require("./routes/routes");
const auth = require("./routes/auth");
const app = express();

// view engine setup
const hbs = require("express-handlebars")({
  defaultLayout: "main",
  extname: ".hbs"
});
app.engine("hbs", hbs);
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "hbs");

app.use(logger("dev"));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));

// Passport
app.use(
  session({
    secret: process.env.SECRET,
    //change next two lines if necessary
    resave: true,
    saveUninitialized: true,
    store: new MongoStore({ mongooseConnection: mongoose.connection })
  })
);

passport.serializeUser(function(user, done) {
  done(null, user._id);
});

passport.deserializeUser(function(id, done) {
  models.User.findById(id, done);
});

// passport strategy
passport.use(
  new LocalStrategy(function(username, password, done) {
    // Find the user with the given username
    models.User.findOne({ username: username }, function(err, user) {
      // if there's an error, finish trying to authenticate (auth failed)
      if (err) {
        console.error("Error fetching user in LocalStrategy", err);
        return done(err);
      }
      // if no user present, auth failed
      if (!user) {
        return done(null, false, { message: "Incorrect username." });
      }
      // if passwords do not match, auth failed
      if (user.password !== password) {
        return done(null, false, { message: "Incorrect password." });
      }
      // auth has has succeeded
      return done(null, user);
    });
  })
);

app.use(passport.initialize());
app.use(passport.session());

app.use("/", auth(passport));
app.use("/", routes);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error("Not Found");
  err.status = 404;
  next(err);
});

// error handlers

// development error handler
// will print stacktrace
if (app.get("env") === "development") {
  app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.render("error", {
      message: err.message,
      error: err
    });
  });
}

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
  res.status(err.status || 500);
  res.render("error", {
    message: err.message,
    error: {}
  });
});

var port = process.env.PORT || 8080;
app.listen(port);
console.log("Express started. Listening on port %s", port);

module.exports = app;
