const mongoose = require('mongoose');
const MealRecipeMap = require('./MealRecipeMap')
const UserMealMap = require('./UserMealMap')

const recipeSchema = new mongoose.Schema({
    difficulty: {
        type: Number,
        max: 10,
        min: 0,
        required: true,
        default: 5
    },
    timeToCook: { //minutes
        type: Number,
        min: 0,
        default: 60,
        required: true
    },
    timeToPrepare: { //minutes
        type: Number,
        min: 0,
        default: 60,
        required: true
    },
    kcal_per_serving: {
        type: Number,
        min: 0,
        default: 300,
        required: true
    },
    recipe_in_text: {
        type: String,
        default: 'You didn\'t upload this recipe detail',
        required: true
    },
    MealRecipeMaps: [{ type: mongoose.Schema.Types.ObjectId, ref: MealRecipeMap }],
    UserMealMaps: [{ type: mongoose.Schema.Types.ObjectId, ref: UserMealMap }]
});

const Recipe = mongoose.model('Recipe', recipeSchema);

module.exports = Recipe;