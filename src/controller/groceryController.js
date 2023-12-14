const { Grocery, UserGroceryMap } = require('../models/Models');
const { CustomError } = require('../middleware/errorhandle');
const { removeFile, getUserById, validateRequestBody } = require('../utils/helper');
const { grocery_unit } = require('../config/constants')
const joi = require('joi');
const { $where } = require('../models/UserGroceryMap');

//create new grocery
const createGrocery = async(req, res, next) => {
    const createSchema = joi.object({
        name: joi.string().required(),
        unit: joi.string().valid(...grocery_unit).required(),
        kcal_per_unit: joi.number().positive().required(),
        verify_token: joi.string()
    })
    try {
        //check if user have permission to create grocery
        const user = await getUserById(req.user._id);
        if (user.permission_level >= 2) throw new CustomError("Permission denied", 403);

        //validate request body
        const { name, unit, kcal_per_unit } = await validateRequestBody(createSchema, req.body)

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
            request_status: "success",
            grocery: newGrocery
        });
    } catch (e) {
        next(e)
    }
};

//get all groceries for dropdown grocery menu by queries. 
const getGroceriesByQueries = async(req, res, next) => {
    const { name, user_id } = req.query
    try {
        let queries = Grocery.find({})

        //find groceries equiped by user have user_id
        if (user_id) {
            const ugms = await UserGroceryMap.find({ user: user_id }, { grocery: 1, _id: 0 });
            const grocery_ids = ugms.map((item) => item.grocery)
            queries = queries.where('_id').in(grocery_ids)
        }
        //find groceries have name
        if (name) queries.where('name', new RegExp(`\\w*${name}\\w*`, 'i'))
        const groceries = await queries.exec();
        res.status(200).send({
            request_status: "success",
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
        throw new CustomError("Grocery not found", 404)
    }
}

const getGrocery = async(req, res, next) => {
    try {
        const grocery = await getGroceryById(req.params.id)
        res.status(200).send({
            request_status: "success",
            grocery: grocery
        });
    } catch (e) {
        next(e)
    }
}

//add grocery to user groceries list(wallet)
const addGrocery = async(req, res, next) => {
    const addSchema = joi.object({
        grocery_id: joi.string().required(),
        amount: joi.number().positive().required(),
        expiresDate: joi.date().min('now').required(),
        verify_token: joi.string()
    })
    try {
        const user = await getUserById(req.user._id);
        //validate request body
        const { grocery_id, amount, expiresDate } = await validateRequestBody(addSchema, req.body)
        const grocery = await getGroceryById(grocery_id);

        //check if grocery already exists in user grocery list
        let userGroceryMap = await UserGroceryMap.findOne({ user: user._id, grocery: grocery._id });
        if (userGroceryMap == null) {
            userGroceryMap = new UserGroceryMap({
                user: user._id,
                grocery: grocery._id,
                amount: amount,
                expiresDate: expiresDate
            })
        } else throw new CustomError("Grocery already exists in user grocery list", 400)

        //using transaction to add grocery to user grocery map list
        const client_session = await UserGroceryMap.startSession();
        try {
            await userGroceryMap.save({ session: client_session });

            if (!user.UserGroceryMaps.includes(userGroceryMap._id)) {
                await user.updateOne({ $push: { UserGroceryMaps: userGroceryMap._id } }).session(client_session);
            }

            if (!grocery.UserGroceryMaps.includes(userGroceryMap._id)) {
                await grocery.updateOne({ $push: { UserGroceryMaps: userGroceryMap._id } }).session(client_session);
            }
        } catch (e) {
            await client_session.abortTransaction();
            throw e
        } finally {
            await client_session.endSession();
        }

        //response
        res.status(200).send({
            request_status: "successful",
        })
    } catch (e) {
        next(e)
    }
}

//remove groceries from user groceries list(wallet)
const removeGrocery = async(req, res, next) => {
    const removeSchema = joi.object({
        grocery_id: joi.string().required(),
        verify_token: joi.string()
    })
    try {
        //get user and grocery need to remove
        const user = await getUserById(req.user._id);
        const { grocery_id } = await validateRequestBody(removeSchema, req.body)
        const grocery = await getGroceryById(grocery_id);

        const filter = { user: user._id, grocery: grocery._id };
        const userGroceryMap = await UserGroceryMap.findOne(filter);
        if (userGroceryMap == null) {
            throw new CustomError("Grocery not found in user grocery list", 404)
        }

        //using transaction to remove grocery from user grocery map list
        const client_session = await UserGroceryMap.startSession();
        try {
            if (user.UserGroceryMaps.includes(userGroceryMap._id)) {
                await user.updateOne({ $pull: { UserGroceryMaps: userGroceryMap._id } }).session(client_session);
            }
            if (grocery.UserGroceryMaps.includes(userGroceryMap._id)) {
                await grocery.updateOne({ $pull: { UserGroceryMaps: userGroceryMap._id } }).session(client_session);
            }
            await UserGroceryMap.deleteOne(filter).session(client_session);
        } catch (e) {
            await client_session.abortTransaction();
            throw e
        } finally {
            await client_session.endSession();
        }

        //response
        res.status(200).send({
            request_status: "successful",
        })
    } catch (e) {
        next(e)
    }
}

//update grocery information
const updateGrocery = async(req, res, next) => {
    const updateSchema = joi.object({
        name: joi.string(),
        unit: joi.string().valid(...grocery_unit),
        kcal_per_unit: joi.number().positive(),
        verify_token: joi.string()
    })
    try {
        //check if user have permission to update grocery
        const user = await getUserById(req.user._id);
        if (user.permission_level >= 2) throw new CustomError("Permission denied", 403);

        //validate request body
        const { name, unit, kcal_per_unit } = await validateRequestBody(updateSchema, req.body)

        //update grocery information
        const grocery = await getGroceryById(req.params.id);
        await grocery.updateOne({
            name: name || grocery.name,
            unit: unit || grocery.unit,
            kcal_per_unit: kcal_per_unit || grocery.kcal_per_unit,
            image_path: req.file ? req.file.filename : grocery.image_path
        })

        //response
        res.status(200).send({
            request_status: "successful",
            groceryId: grocery._id
        })
    } catch (e) {
        next(e)
    }
}

const deleteGrocery = async(req, res, next) => {
    const deleteSchema = joi.object({
        verify_token: joi.string(),
        grocery_id: joi.string().required()
    })
    try {
        //check if user have permission to delete grocery
        const user = await getUserById(req.user._id);
        if (user.permission_level >= 2) throw new CustomError("Permission denied", 403);

        //delete grocery by transaction
        const client_session = await Grocery.startSession();


        //response
        res.status(200).send({
            request_status: "successful",
            groceryId: grocery._id
        })
    } catch (e) {
        next(e)
    }

}

const groceryController = {
    createGrocery,
    getGroceriesByQueries,
    getGrocery,
    addGrocery,
    removeGrocery,
    updateGrocery,
    deleteGrocery
}

module.exports = groceryController;