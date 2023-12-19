const mongoose = require('mongoose');
const MealRecipeMap = require('./MealRecipeMap')
const UserMealMap = require('./UserMealMap')
const User = require('./Users')

const mealSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    total_time_cook: { //minutes
        type: Number,
        required: true
    },
    total_kcal: {
        type: Number,
        required: true
    },
    MealRecipeMaps: [{ type: mongoose.Schema.Types.ObjectId, ref: MealRecipeMap }],
    UserMealMaps: [{ type: mongoose.Schema.Types.ObjectId, ref: UserMealMap }],
    Creator: {
        type: mongoose.Schema.Types.ObjectId,
        ref: User,
        required: true
    }
}, { timestamps: true });

const Meal = mongoose.model('Meal', mealSchema);

module.exports = Meal;