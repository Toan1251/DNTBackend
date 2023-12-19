const mongoose = require('mongoose');

const RecipeGroceryMapSchema = new mongoose.Schema({
    recipe: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Recipe',
    },
    grocery: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Grocery',
    },
    amount: {
        type: Number,
        required: true,
        default: 0,
        min: 0
    },
});

const RecipeGroceryMap = mongoose.model('RecipeGroceryMap', RecipeGroceryMapSchema);

module.exports = RecipeGroceryMap;