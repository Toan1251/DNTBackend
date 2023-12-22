const express = require('express');
const router = express.Router();
const userController = require('../controller/userController');
const passport = require('passport');

// GET /api/user/:id - Get a user by ID
router.get('/:id',
    userController.getUser
);

// GET /api/user - load user info
router.get('/',
    passport.authenticate('jwt', { session: false }),
    userController.loadUserData
);

// POST /api/user/register- Create a new user
router.post('/register',
    userController.register
);

// PUT /api/user/:id - Update a user by ID
router.put('/:id',
    passport.authenticate('jwt', { session: false }),
    userController.updateUserInfo
);

module.exports = router;