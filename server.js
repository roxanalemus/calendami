// server.js

// set up ======================================================================
// get all the tools we need
require("dotenv").config();
let express = require("express");
let app = express();
let port = process.env.PORT || 8080;
const MongoClient = require("mongodb").MongoClient;
let mongoose = require("mongoose");
let passport = require("passport");
let flash = require("connect-flash");
let multer = require("multer");

let morgan = require("morgan");
let cookieParser = require("cookie-parser");
let bodyParser = require("body-parser");
let session = require("express-session");
let moment = require("moment");

const cfg = require("./config/twilio");
let configDB = require("./config/database.js");

let db;

//compares the current date to the date we've designated to send reminder (sms) and sends the sms if the two match
async function compareAndSend() {
  //get all entries that have not yet been sent
  const entries = await db.collection("entries").find({sent:null}).toArray()
  console.log("notification: found ", entries)
  //d = today's date
  let d = new Date();
  //loop through entries
  for (let i = 0; i < entries.length; i++) {
    console.log(entries[i].time, d, entries[i].time.getUTCFullYear(), d.getUTCFullYear(), entries[i].time.getUTCMonth(), d.getUTCMonth(),  entries[i].time.getUTCDate(), d.getUTCDate())
    if (
      //if date, month, year all equal, then...
      entries[i].time.getUTCFullYear() === d.getUTCFullYear() &&
      entries[i].time.getUTCMonth() === d.getUTCMonth() &&
      entries[i].time.getUTCDate() === d.getUTCDate()
    ) {
      //get user with same id (so that we can grab the user's phone number)
      const user = await db.collection("users").findOne({_id: entries[i].userID})
      //if no user for this entry, no number available and notification cannot be sent; continue to next entry
      if(!user){
        continue
      }

      //get twilio account user info from env
      const accountSid = process.env.TWILIO_ACCOUNT_SID;
      const authToken = process.env.TWILIO_AUTH_TOKEN;
      const client = require("twilio")(accountSid, authToken);

      const production  = 'https://boiling-lake-04762.herokuapp.com';
      const development = 'http://localhost:8080';
      const url = (process.env.NODE_ENV ? production : development);
      //create message and send it to user's number
      const message = await client.messages
        .create({
          body: `Hi, this is your gentle reminder to connect with ${entries[i].name}. Confirm here: ${url}/confirm/${entries[i]._id} `,
          from: "+16178700051",
          to: `${user.phoneNumber}`,
        })
      console.log(message.sid);
      //update status for entries that we've messaged about (today's messages at designated time) 
      db.collection("entries").findOneAndUpdate({_id: entries[i]._id}, {$set:{sent:d}})
    }
  }
}
// configuration ===============================================================

//
mongoose.connect(configDB.url, async (err, database) => {
  if (err) return console.log(err);
  db = database;
  require("./app/routes.js")(app, passport, db, moment, multer);
  const currentTime = moment()

  //message time-- update here to set new time for message sending
  const sendTime = moment().second(0).minute(36).hour(15)
  //comparison if sendTime has passed, send message at send time, tomorrow
  if(currentTime.isAfter(sendTime)){
    sendTime.add(1,"day")
  }
  //wait the amount of time between currentTime and sendTime to send message
  const waitMillisecs = sendTime.diff(currentTime);
  //wait appropritate amount of milliseconds (determined above) to run function
  setTimeout(function (){
    //calls compareAndSend once
    compareAndSend()
    //setInterval runs this once a day given the 86,4000 * 1000 interval
    // setInterval(compareAndSend, 86400 * 1000)
    setInterval(compareAndSend, 120 * 1000)


  }, waitMillisecs) //wait the amount of time between currentTime and sendTime to send message
}); // connect to our database

require("./config/passport")(passport); // pass passport for configuration

// set up our express application
app.use(morgan("dev")); // log every request to the console
app.use(cookieParser()); // read cookies (needed for auth)
app.use(bodyParser.json()); // get information from html forms
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

app.set("view engine", "ejs"); // set up ejs for templating

// required for passport
app.use(
  session({
    secret: "rcbootcamp2021b", // session secret
    resave: true,
    saveUninitialized: true,
  })
);
app.use(passport.initialize());
app.use(passport.session()); // persistent login sessions
app.use(flash()); // use connect-flash for flash messages stored in session

// launch ======================================================================
app.listen(port);
console.log("The magic happens on port " + port);