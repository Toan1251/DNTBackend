const express = require('express');
const router = express.Router();
const groceryController = require('../controller/groceryController');
const passport = require('passport');
const upload = require('../middleware/upload');

//get groceries by queries
router.get('/', groceryController.getGroceriesByQueries);

//get grocery by id
router.get('/:id', groceryController.getGrocery);

//create new grocery
router.post('/create', passport.authenticate('jwt', { session: false }), upload.single('image'), groceryController.createGrocery);

//add grogeries to user groceries list
router.put('/add', passport.authenticate('jwt', { session: false }), groceryController.addGrocery);

//remove groceries from user groceries list
router.put('/remove', passport.authenticate('jwt', { session: false }), groceryController.removeGrocery);

//update grocery information
router.put('/:id/update', passport.authenticate('jwt', { session: false }), upload.single('image'), groceryController.updateGrocery);

// //delete grocery
// router.delete('/delete', groceryController.deleteGrocery);

// //update buying list
// router.put('/buy', groceryController.updateBuyingList);

module.exports = router;