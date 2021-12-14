
let LocalStrategy   = require('passport-local').Strategy;
let User       		= require('../app/models/user');

module.exports = function(passport) {

	// =========================================================================
    // passport session setup ==================================================
    // =========================================================================

    passport.serializeUser(function(user, done) {
        done(null, user.id);
    });

    passport.deserializeUser(function(id, done) {
        User.findById(id, function(err, user) {
            done(err, user);
        });
    });

 	// =========================================================================
    // LOCAL SIGNUP ============================================================
    // =========================================================================

    passport.use('local-signup', new LocalStrategy({
        usernameField : 'email',
        passwordField : 'password',
        phoneNumberField    : 'phoneNumber',
        passReqToCallback : true
    },
    function(req, email, password, done) {
        console.log(req)
        User.findOne({ 'local.email' :  email }, function(err, user) {
            if (err)
                return done(err);
            if (user) {
                return done(null, false, req.flash('signupMessage', 'That email is already taken.'));
            } else {

                let newUser            = new User();


                newUser.local.email    = email;
                newUser.local.password = newUser.generateHash(password); 
                newUser.local.phoneNumber = newUser.phoneNumber;

                newUser.save(function(err) {
                    if (err)
                        throw err;
                    return done(null, newUser);
                });
            }

        });

    }));

    // =========================================================================
    // LOCAL LOGIN =============================================================
    // =========================================================================

    passport.use('local-login', new LocalStrategy({
        usernameField       : 'email',
        passwordField       : 'password',
        phoneNumberField    : 'phoneNumber',
        passReqToCallback   : true 
    },
    function(req, email, password, done) {
        User.findOne({ 'local.email' :  email }, function(err, user) {
            if (err)
                return done(err);

            if (!user)
                return done(null, false, req.flash('loginMessage', 'No user found.')); 

            if (!user.validPassword(password))
                return done(null, false, req.flash('loginMessage', 'Oops! Wrong password.')); 

            return done(null, user);
        });

    }));

};
