const Grocery = require('../models/Models').Grocery;
const User = require('../models/Models').User;
const UserGroceryMap = require('../models/Models').UserGroceryMap;
const { CustomError } = require('../middleware/errorhandle');

//create new grocery
const createGrocery = async(req, res, next) => {
    try {
        const { name, unit, kcal_per_unit } = req.body;
        const newGrocery = new Grocery({
            name,
            unit,
            kcal_per_unit,
            image_path: req.file.path
        })
        try {
            await newGrocery.save();
        } catch (e) {
            throw new CustomError("Grocery already exists", 400);
        }

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

const addGroceries = async(req, res, next) => {
    const user = await User.findById(req.user._id);
}

const removeGroceries = async(req, res, next) => {

}

const groceryController = {
    createGrocery,
    getAllGroceries,
    addGroceries,
    removeGroceries,

}

module.exports = groceryController;