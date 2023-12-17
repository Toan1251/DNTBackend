const jwt = require('jsonwebtoken');
const config = require('../config/config');
const { CustomError } = require('../middleware/errorhandle');
const joi = require('joi');

//login
const login = (req, res, next) => {
    const token = jwt.sign({ user: req.user }, config.JWT_SECRET, { expiresIn: '1y' });
    res.status(200).send({
        request_status: 'successful',
        userid: req.user._id,
        verify_token: token,
    });
};

//login failed
const loginFailed = (req, res, next) => {
    next(new CustomError('Login failed', 401));
};

//logout
const logout = (req, res, next) => {
    req.logout((err) => {
        if (err) next(err);
        res.status(200).send({
            message: 'Logout successful',
            request_status: 'successful'
        });
    })
};

const authController = {
    login,
    loginFailed,
    logout
}

module.exports = authController;