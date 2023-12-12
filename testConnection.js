const mongoose = require('mongoose');

const uri = require('./src/config/config').MONGO_URI

mongoose.connect(uri)
    .then(() => {
        console.log('Connected to MongoDB');
        console.log(uri)
    })
    .catch((error) => {
        console.log('Error connecting to MongoDB:');
    });