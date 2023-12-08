const mongoose = require('mongoose');

const UserMealMapSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    meal: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Meal',
        required: true
    }
});

const UserMealMap = mongoose.model('UserMealMap', UserMealMapSchema);

module.exports = UserMealMap;