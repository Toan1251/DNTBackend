const bcrypt = require('bcrypt');
const User = require('../models/Models').User;
const jwt = require('jsonwebtoken');
const config = require('../config/config');

//register
register = async(req, res) => {
    // Register logic here
    try {
        const { new_username, new_encoded_pw } = req.body;
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(new_encoded_pw, salt);

        const newUser = new User({
            username: new_username,
            password: hashedPassword
        });

        await newUser.save();
        res.status(200).send({
            message: "User created successfully",
            registering_status: "successful",
            user: newUser
        });
    } catch (e) {
        res.status(500).send({
            message: "Internal server error",
            registering_status: "failed",
            error: e
        });
    }
};

//login
login = (req, res) => {
    // Login logic here
    const login_token = jwt.sign({ user: req.user }, config.JWT_SECRET, { expiresIn: '24h' });
    res.status(200).send({
        login_status: 'successful',
        login_token: login_token,
        user: req.user
    });
};

//login failed
loginFailed = (req, res) => {
    // Login failed logic here
    res.status(401).send({
        message: 'login failed',
        login_status: 'failed'
    });
};

verify = (req, res, next) => {
    // Verify logic here
    const token = req.body.login_token;
    try {
        const user_jwt = jwt.verify(token, config.JWT_SECRET);
        next();
    } catch (e) {
        res.status(401).send({
            message: 'Unauthorized',
            verify_status: 'failed'
        });
    }
}

//logout
logout = (req, res) => {
    // Logout logic here
    req.logout();
    res.status(200).send({
        message: 'Logout successful',
        logout_status: 'successful'
    });
};

const authController = {
    register,
    login,
    loginFailed,
    verify,
    logout
}

module.exports = authController;