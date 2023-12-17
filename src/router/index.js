const express = require('express');
const router = express.Router();
const passport = require('passport');

router.use('/auth', require('./auth'));
router.use('/user', require('./user'));
router.use('/grocery', require('./grocery'));
router.use('/recipe', require('./recipe'));

module.exports = router