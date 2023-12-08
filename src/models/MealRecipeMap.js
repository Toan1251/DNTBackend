const mongoose = require('mongoose');

const MealRecipeMapSchema = new mongoose.Schema({
    meal: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Meal',
    },
    recipe: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Recipe',
    },
});

const MealRecipeMap = mongoose.model('MealRecipeMap', MealRecipeMapSchema);

module.exports = MealRecipeMap;