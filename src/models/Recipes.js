const mongoose = require('mongoose');
const MealRecipeMap = require('./MealRecipeMap')
const User = require('./Users')
const RecipeGroceryMap = require('./RecipeGroceryMap');

const recipeSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
    },
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
        default: 0,
        required: true
    },
    recipe_in_text: {
        type: String,
        default: 'You didn\'t upload this recipe detail',
        required: true
    },
    MealRecipeMaps: [{ type: mongoose.Schema.Types.ObjectId, ref: MealRecipeMap }],
    RecipeGroceryMaps: [{ type: mongoose.Schema.Types.ObjectId, ref: RecipeGroceryMap }],
    Creator: {
        type: mongoose.Schema.Types.ObjectId,
        ref: User,
        required: true
    }
}, { timestamps: true });

const Recipe = mongoose.model('Recipe', recipeSchema);

module.exports = Recipe;