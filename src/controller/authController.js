const jwt = require('jsonwebtoken');
const config = require('../config/config');
const { CustomError } = require('../middleware/errorhandle');

//login
const login = (req, res, next) => {
    const token = jwt.sign({ user: req.user }, config.JWT_SECRET, { expiresIn: '24h' });
    res.status(200).send({
        request_status: 'successful',
        login_token: token,
        user: req.user
    });
};

//login failed
const loginFailed = (req, res, next) => {
    next(new CustomError('Login failed', 401));
};

//logout
const logout = (req, res) => {
    req.logout();
    res.status(200).send({
        message: 'Logout successful',
        request_status: 'successful'
    });
};

const authController = {
    login,
    loginFailed,
    logout
}

module.exports = authController;