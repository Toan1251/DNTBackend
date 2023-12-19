const express = require('express');
const router = express.Router();
const groceryController = require('../controller/groceryController');
const passport = require('passport');
const upload = require('../middleware/upload');

//get groceries by name
router.get('/',
    groceryController.getGroceriesByName
);

//get user groceries list
router.get('/user',
    passport.authenticate('jwt', { session: false }),
    groceryController.getUserGroceryList
);

//get grocery by id
router.get('/:id',
    groceryController.getGrocery
);

//create new grocery
router.post('/create',
    passport.authenticate('jwt', { session: false }),
    upload.single('image'),
    groceryController.createGrocery
);

//add grogeries to user groceries list
router.put('/add',
    passport.authenticate('jwt', { session: false }),
    groceryController.addGrocery
);

//update grocery information
router.put('/update',
    passport.authenticate('jwt', { session: false }),
    upload.single('image'),
    groceryController.updateGrocery
);

//update grocery on user groceries list
router.put('/update/:id',
    passport.authenticate('jwt', { session: false }),
    groceryController.updateUserGrocery
);

//remove groceries from user groceries list
router.delete('/remove/:id',
    passport.authenticate('jwt', { session: false }),
    groceryController.removeGrocery
);

//delete grocery
router.delete('/:id',
    passport.authenticate('jwt', { session: false }),
    groceryController.deleteGrocery
);

module.exports = router;