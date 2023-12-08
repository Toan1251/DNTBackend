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
});

const RecipeGroceryMap = mongoose.model('RecipeGroceryMap', RecipeGroceryMapSchema);

module.exports = RecipeGroceryMap;