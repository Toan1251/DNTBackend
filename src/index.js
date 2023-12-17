const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
const mongoose = require('mongoose')
const dotenv = require('dotenv')
const cookieParser = require('cookie-parser')
const passport = require('passport')
const session = require('express-session')
const bodyParser = require('body-parser')

// configuration
if (process.env.NODE_ENV) {
    require('dotenv').config({ path: path.join(__dirname, `../.env.${process.env.NODE_ENV}.local`) });
} else {
    require('dotenv').config({ path: path.join(__dirname, '../.env') });
}


const config = require('./config/config')
const app = express();
app.use(cors({
    origin: config.CLIENT_URL,
    methods: ['GET', 'HEAD', 'PUT', 'POST', 'DELETE', 'PATCH'],
    credentials: true
}))

app.use(express.urlencoded({ extended: true }))
app.use(express.json())
app.use(cookieParser())
app.use(morgan("dev"))
app.use('/static', express.static(path.join(__dirname, '../public')))



//passport
app.use(session({
    secret: config.SESSION_SECRET,
    cookie: {
        maxAge: 1000 * 60 * 60 // 1 hours
    },
    resave: false,
    saveUninitialized: false
}))
app.use(passport.initialize())
app.use(passport.session())
const initializePassport = require('./middleware/passport')
initializePassport(passport)

//api
const router = require('./router');
app.use('/api', router)

//error handler
app.use(require('./middleware/errorhandle').errorHandler)

//start server
const port = config.PORT || 5000
const server = app.listen(port, () => {
    console.log(`server is listening on port ${port}`)
    try {
        mongoose.connect(config.MONGO_URI).then(() => {
            console.log("mongodb is connected")
        })

    } catch (e) {
        console.log(e)
    }
})

server.setTimeout(3600 * 1000);