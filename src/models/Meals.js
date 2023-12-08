const mongoose = require('mongoose');
const MealRecipeMap = require('./MealRecipeMap')
const UserMealMap = require('./UserMealMap')

const mealSchema = new mongoose.Schema({
    total_time_cook: { //minutes
        type: Number,
        required: true
    },
    total_kcal: {
        type: Number,
        required: true
    },
    MealRecipeMaps: [{ type: mongoose.Schema.Types.ObjectId, ref: MealRecipeMap }],
    UserMealMaps: [{ type: mongoose.Schema.Types.ObjectId, ref: UserMealMap }]
});

const Meal = mongoose.model('Meal', mealSchema);

module.exports = Meal;