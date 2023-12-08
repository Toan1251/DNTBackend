const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
const mongoose = require('mongoose')

//configuration
const app = express();

app.use(morgan("dev"))

app.use(cors({
    origin: '*',
    methods: ['GET', 'HEAD', 'PUT', 'POST', 'DELETE', 'PATCH'],
    credentials: true
}))

app.use(express.urlencoded({ extended: true }))

app.use(express.json())

app.use('/static', express.static(path.join(__dirname, 'public')))

const router = require('./router')
app.use('/', router)

//start server
const config = require('./config/config')

const port = config.PORT || 5000
const server = app.listen(port, () => {
    console.log(`server is listening on port ${port}`)
    try {
        mongoose.connect(config.MONGO_URI)
        console.log('connected to mongodb')
    } catch (e) {
        console.log(e)
    }
})

server.setTimeout(3600 * 1000);