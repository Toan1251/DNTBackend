const express = require('express');
const router = express.Router();
const groceryController = require('../controller/groceryController');
const passport = require('passport');
const upload = require('../middleware/upload');

//create new grocery
router.post('/create', upload.single('image'), groceryController.createGrocery);

//get all groceries
router.get('/', groceryController.getAllGroceries);

//get grocery by id
router.get('/:id', groceryController.getGrocery);

// //add grogeries to user groceries list
// router.put('/add', groceryController.addGrocery);

// //remove groceries from user groceries list
// router.put('/remove', groceryController.removeGrocery);

// //update grocery
// router.put('/update', groceryController.updateGrocery);

// //delete grocery
// router.delete('/delete', groceryController.deleteGrocery);

// //update buying list
// router.put('/buy', groceryController.updateBuyingList);

module.exports = router;