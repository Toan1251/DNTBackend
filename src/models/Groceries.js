const mongoose = require('mongoose');
const UserGroceryMap = require('./UserGroceryMap')
const RecipeGroceryMap = require('./RecipeGroceryMap')
const User = require('./Users')
const { grocery_unit } = require('../config/constants')

const grocerySchema = new mongoose.Schema({
    name: {
        type: String,
        unique: true,
        required: true
    },
    image_path: {
        type: String,
        required: true,
        default: ''
    },
    unit: {
        type: String,
        enum: grocery_unit, //Liter: Using for liquid grocery(milk, oil, v.v), Grams: Using for uncounted grocery(sugars, meat), Number: Using for counted grocery(eggs, tomatoes)
        required: true,
        default: 'grams'
    },
    kcal_per_unit: {
        type: Number,
        required: true
    },
    UserGroceryMaps: [{ type: mongoose.Schema.Types.ObjectId, ref: UserGroceryMap }],
    RecipeGroceryMaps: [{ type: mongoose.Schema.Types.ObjectId, ref: RecipeGroceryMap }],
    Creator: {
        type: mongoose.Schema.Types.ObjectId,
        ref: User,
        required: true
    }

}, { timestamps: true });

const Grocery = mongoose.model('Grocery', grocerySchema);

module.exports = Grocery;