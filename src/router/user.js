const express = require('express');
const router = express.Router();
const userController = require('../controller/userController');
const passport = require('passport');

// GET /:id - Get a user by ID
router.get('/:id',
    userController.getUser
);

// POST /- Create a new user
router.post('/register',
    userController.register
);

// PUT /:id - Update a user by ID
router.put('/:id',
    passport.authenticate('jwt', { session: false }),
    userController.updateUserInfo
);

module.exports = router;