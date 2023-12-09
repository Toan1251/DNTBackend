const express = require('express')
const router = express.Router()
const authController = require('../controller/authController')
const passport = require('passport')

//register
router.post('/register', authController.register)

//login
router.post('/login/local', passport.authenticate('local', {
    failureRedirect: '/api/auth/login/failed'
}), authController.login)

//login failed
router.get('/login/failed', authController.loginFailed)

//logout
router.get('/logout', authController.logout)

module.exports = router