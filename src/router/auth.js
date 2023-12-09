const express = require('express')
const router = express.Router()
const authController = require('../controller/authController')
const passport = require('passport')

//login
router.post('/login/local', passport.authenticate('local', {
    failureRedirect: '/api/auth/login/failed'
}), authController.login)

//login failed
router.get('/login/failed', authController.loginFailed)

//verify testing
router.post('/verify', authController.verify, (req, res) => {
    res.status(200).send({
        message: 'Authorized',
        verify_status: 'successful'
    });
})

//logout
router.get('/logout', authController.logout)

module.exports = router