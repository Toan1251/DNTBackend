require('dotenv').config();

module.exports = {
    PORT: process.env.PORT, //server running port
    MONGO_URI: process.env.MONGO_URI, //mongodb connection string
}