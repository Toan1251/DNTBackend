const express = require('express');
const router = express.Router();
const passport = require('passport');

router.use('/auth', require('./auth'));
router.use('/user', require('./user'));
router.use('/grocery', require('./grocery'));
// router.use('/buylist', passport.authenticate('jwt', { session: false }), require('./buylist'));

module.exports = router