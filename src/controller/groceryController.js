const Grocery = require('../models/Models').Grocery;
const User = require('../models/Models').User;
const UserGroceryMap = require('../models/Models').UserGroceryMap;
const { CustomError } = require('../middleware/errorhandle');
const { removeFile } = require('../utils/helper');
const { getUserById } = require('./userController')

//create new grocery
const createGrocery = async(req, res, next) => {
    try {
        const { name, unit, kcal_per_unit } = req.body;

        //create new grocery
        const newGrocery = new Grocery({
            name,
            unit,
            kcal_per_unit,
            image_path: req.file.filename
        })

        //store new grocery to database
        try {
            await newGrocery.save();
        } catch (e) {
            removeFile('../../public/' + req.file.filename);
            throw new CustomError("Grocery already exists", 400);
        }

        //response
        res.status(200).send({
            message: "Grocery created successfully",
            request_status: "successful",
            grocery: newGrocery
        });
    } catch (e) {
        next(e)
    }
};

//get all groceries for dropdown grocery menu
const getAllGroceries = async(req, res, next) => {
    try {
        const groceries = await Grocery.find({});
        res.status(200).send({
            message: "Get all groceries successfully",
            request_status: "successful",
            groceries: groceries
        });
    } catch (e) {
        next(e)
    }
}

//get grocery by id
const getGroceryById = async(id) => {
    try {
        const grocery = await Grocery.findById(id);
        if (!grocery) {
            throw new CustomError("Grocery not found", 404)
        }
        return grocery;
    } catch (e) {
        throw e;
    }
}

const getGrocery = async(req, res, next) => {
    try {
        const grocery = await getGroceryById(req.params.id)
        res.status(200).send({
            message: "Get grocery successfully",
            request_status: "successful",
            grocery: grocery
        });
    } catch (e) {
        next(e)
    }
}

const addGrocery = async(req, res, next) => {
    try {
        //get user and grocery need to add
        const user = await getUserById(req.user._id);
        const { grocery_id, amount, expiresDate } = req.body;
        const grocery = await getGroceryById(grocery_id);

        //add grocery to user grocery map list
        const userGroceryMap = new UserGroceryMap({
            user: user._id,
            grocery: grocery._id,
            amount: amount,
            expiresDate: expiresDate
        })

        //save user grocery map to database
        try {
            await userGroceryMap.save();

        } catch (e) {
            throw new CustomError("This Grocery already exist in your wallet", 400);
        }


        //response
        res.status(200).send({
            message: "Grocery added successfully",
            request_status: "successful"

        })

    } catch (e) {
        next(e)
    }
}

const removeGrocery = async(req, res, next) => {

}

const groceryController = {
    createGrocery,
    getAllGroceries,
    getGrocery,
    addGrocery,
    removeGrocery,
}

module.exports = groceryController;