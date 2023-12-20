const express = require('express');
const router = express.Router();
const recipeController = require('../controller/recipeController');
const passport = require('passport');

// Define your API routes here
// get recipe by queries
router.get('/',
    recipeController.getRecipeByQueries
)

//get recipe by creator
router.get('/user',
    passport.authenticate('jwt', { session: false }),
    recipeController.getRecipeByUser,
    recipeController.getRecipeByQueries
)

//get recipe by id
router.get('/:id',
    recipeController.getRecipe
)

//create new recipe
router.post('/',
    passport.authenticate('jwt', { session: false }),
    recipeController.createRecipe
)

//update recipe by id
router.put('/:id',
    passport.authenticate('jwt', { session: false }),
    recipeController.updateRecipe
)

// //add groceries to recipe
router.put('/add/:id',
    passport.authenticate('jwt', { session: false }),
    recipeController.addGroceriesToRecipe
)

// //remove grocery from recipe
router.delete('/remove/:id',
    passport.authenticate('jwt', { session: false }),
    recipeController.removeGroceriesFromRecipe
)

//delete recipe by id
router.delete('/:id',
    passport.authenticate('jwt', { session: false }),
    recipeController.deleteRecipe
)

module.exports = router;