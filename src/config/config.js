require('dotenv').config();

module.exports = {
    PORT: process.env.PORT, //server running port
    MONGO_URI: process.env.MONGO_URI, //mongodb connection string
    SESSION_SECRET: process.env.SESSION_SECRET, //session secret
    CLIENT_URL: process.env.CLIENT_URL, //client url
    JWT_SECRET: process.env.JWT_SECRET //jwt secret
}