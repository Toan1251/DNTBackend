const mongoose = require('mongoose')
const UserGroceryMap = require('./UserGroceryMap')
const UserMealMap = require('./UserMealMap')

const UserSchema = new mongoose.Schema({
    username: {
        type: String,
        unique: true,
        require: true
    },
    password: {
        type: String,
        require: true
    },
    information: {
        height: {
            type: Number, //Using cm
            min: 0,
            default: 160,
            require: true
        },
        weight: {
            type: Number, //Using kg
            min: 0,
            default: 60,
            require: true
        },
        gender: {
            type: String,
            enum: ['male', 'female'], //add more gender if you like
            default: 'female',
            require: true
        },
        dateOfBirth: {
            type: Date,
            default: Date.now(),
            require: true
        },
    },
    UserGroceryMaps: [{ type: mongoose.Schema.Types.ObjectId, ref: UserGroceryMap }],
    UserMealMaps: [{ type: mongoose.Schema.Types.ObjectId, ref: UserMealMap }]

}, { timestamps: true });

const User = mongoose.model('User', UserSchema);

module.exports = User