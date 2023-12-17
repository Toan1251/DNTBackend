const mongoose = require('mongoose');

const UserGroceryMapSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    grocery: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Grocery',
        required: true,
    },
    amount: { //amount of Grocery
        type: Number,
        default: 0,
        required: true
    },
    expiresDate: {
        type: Date,
        default: Date.now(),
        required: true
    },
    isInBuyingList: {
        type: Boolean,
        default: false,
    }
});

const UserGroceryMap = mongoose.model('UserGroceryMap', UserGroceryMapSchema);

module.exports = UserGroceryMap;