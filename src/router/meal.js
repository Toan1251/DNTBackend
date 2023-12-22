const express = require('express');
const router = express.Router();
const mealController = require('../controller/mealController');
const passport = require('passport');

//get meal by queries
router.get('/',
    mealController.getMealByQueries
)

//get user meal
router.get('/user',
    passport.authenticate('jwt', { session: false }),
    mealController.getUserMeals,
    mealController.getMealByQueries
)

//get meal by id
router.get('/:id',
    mealController.getMeal
)

//create new meal
router.post('/',
    passport.authenticate('jwt', { session: false }),
    mealController.createMeal
)

//update meal
router.put('/:id',
    passport.authenticate('jwt', { session: false }),
    mealController.updateMeal
)

//add recipe to meal
router.put('/recipe/add/:id',
    passport.authenticate('jwt', { session: false }),
    mealController.addRecipeToMeal
)

//remove recipe from meal
router.delete('/recipe/remove/:id',
    passport.authenticate('jwt', { session: false }),
    mealController.removeRecipeFromMeal
)

//add meal to user
router.put('/user/add/:id',
    passport.authenticate('jwt', { session: false }),
    mealController.addMealToUser
)

//remove meal from user
router.put('/user/remove/:id',
    passport.authenticate('jwt', { session: false }),
    mealController.removeMealFromUser
)

//schedule meal
router.put('/schedule/:id',
    passport.authenticate('jwt', { session: false }),
    mealController.scheduleMeal
)

//delete meal
router.delete('/:id',
    passport.authenticate('jwt', { session: false }),
    mealController.deleteMeal
)

module.exports = router;