const mongoose = require('mongoose')
const UserGroceryMap = require('./UserGroceryMap')
const UserMealMap = require('./UserMealMap')
const { user_gender } = require('../config/constants')

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
            enum: user_gender, //add more gender if you like
            default: 'female',
            require: true
        },
        dateOfBirth: {
            type: Date,
            default: Date.now(),
            require: true
        },
        goal: {
            type: Number,
            min: 0,
            default: 2000,
        }
    },
    permission_level: {
        type: Number,
        enum: [0, 1, 2], //0: admin(can grant permission to other user), 1:trusted user(can modified almost infomation except other user infomation), 2: user
        default: 2,
        require: true
    },
    UserGroceryMaps: [{ type: mongoose.Schema.Types.ObjectId, ref: UserGroceryMap }],
    UserMealMaps: [{ type: mongoose.Schema.Types.ObjectId, ref: UserMealMap }]

}, { timestamps: true });

const User = mongoose.model('User', UserSchema);

module.exports = User