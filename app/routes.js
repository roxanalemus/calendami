// const { entries, reduce } = require("lodash");
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const client = require("twilio")(accountSid, authToken);
const fetch = require("fetch");
const express = require("express");
const { request } = require("express");

/* eslint-disable new-cap */
const router = express.Router();

module.exports = function (app, passport, db, moment, multer) {
  const ObjectId = require("mongodb").ObjectID;

  // normal routes ===============================================================

  // show the home page (will also have our login links)
  app.get("/", function (req, res) {
    res.render("index.ejs");
  });

  // PROFILE SECTION =========================
  app.get("/profile", isLoggedIn, function (req, res) {
    const today = new Date(new Date().setHours(0, 0, 0, 0));
    db.collection("entries")
      .find(
        { userID: req.user._id, time: { $gte: today } },
        { sort: { time: 1 } }
      )
      .toArray((err, result) => {
        if (err) return console.log(err);
        res.render("profile.ejs", {
          user: req.user,
          entries: result.slice(0, 3),
        });
      });
  });

  //PROFILE SEARCH FOR INDIVIDUAL ITEM
  app.get("/search", (req, res) => {
    db.collection("entries")
      .find({ name: { $regex: req.query.search, $options: "i" } })
      .toArray((err, result) => {
        if (err) return console.log(err);
        res.render("calendar.ejs", { entries: result, user: req.user });
      });
  });

  //CONFIRM ROUTE======================
  //url: /confirm/{entryId}
  app.get("/confirm/:entryId", async function (req, res) {
    const entry = await db.collection("entries").findOneAndUpdate(
      {
        _id: ObjectId(req.params.entryId),
      },
      {
        $set: { confirmed: new Date() },
      }
    );
    const reinforcements = await db
      .collection("reinforcement")
      .find()
      .toArray();

    res.render("confirm.ejs", {
      user: req.user,
      entry: entry.value,
      reinforcements: reinforcements,
    });
    console.log("this is an entry", entry, "entry id", req.params.entryId);
  });

  ////CALENDAR==============================

  app.get("/calendar", isLoggedIn, function (req, res) {
    console.log("at calendar");
    const today = new Date( new Date().setHours(0, 0, 0, 0) );
    db.collection("entries")
      .find(
        { userID: req.user._id, time: { $gte: today } },
        { sort: { time: 1 } }
      )
      .toArray((err, result) => {
        if (err) return console.log(err);
        console.log("this is the result ", result);
        res.render("calendar.ejs", {
          user: req.user,
          entries: result,
        });
      });
  });

  //DELETE ENTRY
  app.delete("/deleteOne", (req, res) => {
    db.collection("entries").findOneAndDelete(
      { _id: ObjectId(req.body._id) },
      (err, result) => {
        if (err) return res.send(500, err);
        res.send("Message deleted!");
      }
    );
  });

  // LOGOUT ==============================
  app.get("/logout", function (req, res) {
    req.logout();
    res.redirect("/");
  });

  // message board routes ===============================================================

  app.post("/entries", isLoggedIn, (req, res) => {
    const { name, time, frequency } = req.body;
    console.log(frequency);

    let entries = null;

    const buildTimeDate = (interval, timePeriod) => {
      const entryDate = moment(time).add(interval, timePeriod).toDate();
      console.log(entryDate, typeof entryDate);
      return {
        name,
        time: entryDate,
        frequency,
        userID: req.user._id,
      };
    };

    //create an array of entries to save to the database
    if (frequency === "Weekly") {
      const weeklyInterval = [
        1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20,
        21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38,
        39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52];
      entries = weeklyInterval.map((interval) =>
        buildTimeDate(interval, "weeks")
      );
    } else if (frequency === "Biweekly") {
      const biweeklyInterval = [
        0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30, 32, 34, 36,
        38, 40, 42, 44, 46, 48, 50, 52];
      entries = biweeklyInterval.map((interval) =>
        buildTimeDate(interval, "weeks")
      );
    } else if (frequency === "Monthly") {
      const monthlyInterval = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
      entries = monthlyInterval.map((interval) =>
        buildTimeDate(interval, "months")
      );
    } else if (frequency === "Single Event") {
      console.log("this single event code has run");
      const entryDate = moment(time).toDate();
      entries = [
        {
          name,
          time: entryDate,
          frequency,
          userID: req.user._id,
        },
      ];
      console.log(entryDate, typeof entryDate);
    } else {
      throw new Error("Unknown frequency: " + frequency);
    }

    console.log(entries);

    db.collection("entries").insertMany(entries, (err, result) => {
      if (err) return console.log(err);
      console.log("saved to database");
      res.redirect("/profile");
    });
  });

  app.delete("/entries", isLoggedIn, (req, res) => {
    db.collection("entries").findOneAndDelete(
      { name: req.body.name, msg: req.body.msg, userID: req.user._id },
      (err, result) => {
        if (err) return res.send(500, err);
        res.send("Message deleted!");
      }
    );
  });

  // =============================================================================
  // AUTHENTICATE (FIRST LOGIN) ==================================================
  // =============================================================================

  // locally --------------------------------
  // LOGIN ===============================
  // show the login form
  app.get("/login", function (req, res) {
    res.render("login.ejs", { message: req.flash("loginMessage") });
  });

  // process the login form
  app.post(
    "/login",
    passport.authenticate("local-login", {
      successRedirect: "/profile", // redirect to the secure profile section
      failureRedirect: "/login", // redirect back to the signup page if there is an error
      failureFlash: true, // allow flash messages
    })
  );

  // SIGNUP =================================
  // show the signup form
  app.get("/signup", function (req, res) {
    res.render("signup.ejs", { message: req.flash("signupMessage") });
  });

  // process the signup form
  app.post(
    "/signup",
    passport.authenticate("local-signup", {
      // successRedirect : '/profile', // redirect to the secure profile section

      failureRedirect: "/signup", // redirect back to the signup page if there is an error
      failureFlash: true, // allow flash messages
    }),
    function (req, res) {
      db.collection("users").findOneAndUpdate(
        { _id: req.user._id },
        {
          $set: {
            phoneNumber: req.body.phoneNumber,
            username: req.body.username,
          },
        },
        {
          sort: { _id: -1 },
          upsert: true,
        },
        (err, result) => {
          if (err) return res.send(err);
          res.redirect("/profile");
        }
      );
    }
  );

  // =============================================================================
  // UNLINK ACCOUNTS =============================================================
  // =============================================================================
  // used to unlink accounts. for social accounts, just remove the token
  // for local account, remove email and password
  // user account will stay active in case they want to reconnect in the future

  // local -----------------------------------
  app.get("/unlink/local", isLoggedIn, function (req, res) {
    var user = req.user;
    user.local.email = undefined;
    user.local.password = undefined;
    user.local.phoneNumber = undefined;
    user.save(function (err) {
      res.redirect("/profile");
    });
  });
};

// route middleware to ensure user is logged in
function isLoggedIn(req, res, next) {
  if (req.isAuthenticated()) return next();

  res.redirect("/");
}
