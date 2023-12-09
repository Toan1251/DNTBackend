const jwt = require('jsonwebtoken');
const config = require('../config/config');

//login
const login = (req, res) => {
    // Login logic here
    const login_token = jwt.sign({ user: req.user }, config.JWT_SECRET, { expiresIn: '24h' });
    res.status(200).send({
        login_status: 'successful',
        login_token: login_token,
        user: req.user
    });
};

//login failed
const loginFailed = (req, res) => {
    // Login failed logic here
    res.status(401).send({
        message: 'login failed',
        login_status: 'failed'
    });
};

const verify = (req, res, next) => {
    // Verify logic here
    const token = req.body.verify_token;
    try {
        const user_jwt = jwt.verify(token, config.JWT_SECRET, (err, user) => {
            if (err) return res.status(403).send({
                message: 'Forbidden',
                verify_status: 'failed'
            });
            req.user = user
            next();
        });

    } catch (e) {
        res.status(401).send({
            message: 'Unauthorized',
            verify_status: 'failed'
        });
    }
}

//logout
const logout = (req, res) => {
    // Logout logic here
    req.logout();
    res.status(200).send({
        message: 'Logout successful',
        logout_status: 'successful'
    });
};

const authController = {
    login,
    loginFailed,
    verify,
    logout
}

module.exports = authController;