const express = require('express');
const router = express.Router();
const User = require('../models/Models').User;

// Register route
router.post('/register', async(req, res, next) => {
    // Get user data from request body
    const { username, password } = req.body;

    try {
        const newUser = await new User({
            username,
            password
        })

        await newUser.save();

        res.status(200).send({
            message: 'User registered successfully'
        });
    } catch (e) {

        res.status(200).send({
            message: 'An error has occurred',
            error: e
        })
    }

});

module.exports = router;