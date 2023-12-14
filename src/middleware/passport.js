const LocalStrategy = require('passport-local').Strategy;
const User = require('../models/Models').User;
const bcrypt = require('bcrypt');
const JWTStrategy = require('passport-jwt').Strategy;
const ExtractJWT = require('passport-jwt').ExtractJwt;

const initializePassport = (passport) => {
    //Local Strategy
    passport.use(new LocalStrategy({
        usernameField: 'username', // Replace 'email' with the actual field name for the username
        passwordField: 'password', // Replace 'password' with the actual field name for the password
    }, async(username, password, done) => {
        try {
            // Find the user by username
            const user = await User.findOne({ username });

            // If user not found or password doesn't match, return error
            if (!user) {
                return done(null, false, { message: 'cannot found user' });
            }
            const isMatch = await bcrypt.compare(password, user.password);
            if (!isMatch) {
                return done(null, false, { message: 'Invalid email or password' });
            }

            // If user found and password matches, return user
            return done(null, user);
        } catch (error) {
            return done(error);
        }
    }));

    //JWT Strategy
    passport.use(new JWTStrategy({
        jwtFromRequest: ExtractJWT.fromExtractors([
            ExtractJWT.fromBodyField('verify_token'),
            ExtractJWT.fromHeader('verify_token'),
            ExtractJWT.fromAuthHeaderAsBearerToken(),
            ExtractJWT.fromUrlQueryParameter('verify_token')
        ]),
        secretOrKey: process.env.JWT_SECRET,
    }, async(token, done) => {
        try {
            // Pass the user details to the next middleware
            const user = await User.findById(token.user._id);
            if (user) return done(null, user);
            return done(null, false);
        } catch (error) {
            done(error, false);
        }
    }))

    passport.serializeUser((user, done) => {
        done(null, user._id);
    });
    passport.deserializeUser(async(id, done) => {
        try {
            const user = await User.findById(id);
            done(null, user);
        } catch (error) {
            done(error);
        }
    });
};

module.exports = initializePassport;