const { Grocery, UserGroceryMap, User, RecipeGroceryMap, Recipe } = require('../models/Models');
const { CustomError } = require('../middleware/errorhandle');
const { removeFile, getUserById, validateRequestBody } = require('../utils/helper');
const { grocery_unit } = require('../config/constants')
const joi = require('joi');

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
        if (user.permission_level >= 2) throw new CustomError("Permission denied", 403)

        //validate request body
        const { name, unit, kcal_per_unit } = await validateRequestBody(createSchema, req.body)

        //create new grocery
        const newGrocery = new Grocery({
            name,
            unit,
            kcal_per_unit,
            Creator: user._id,
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
    const querySchema = joi.object({
        name: joi.string().min(3),
        user_id: joi.string(),
        is_in_buying_list: joi.boolean()
    }).with('is_in_buying_list', 'user_id')
    try {
        //validate request query
        const { name, user_id, is_in_buying_list } = await validateRequestBody(querySchema, req.query)

        let queries = Grocery.find({}).select({
            _id: 1,
            name: 1,
            image_path: 1,
            unit: 1,
            kcal_per_unit: 1
        })

        //find groceries equiped by user have user_id
        if (user_id) {
            let ugms_queries = UserGroceryMap.find({ user: user_id }, { grocery: 1, _id: 0 });
            if (is_in_buying_list) ugms_queries = ugms_queries.where({ isInBuyingList: is_in_buying_list })
            ugms = await ugms_queries.exec();
            const grocery_ids = ugms.map((item) => item.grocery)
            queries = queries.where('_id').in(grocery_ids)

        }
        //find groceries have name
        if (name) queries = queries.where('name', new RegExp(`\\w*${name}\\w*`, 'i'))

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
const getGroceryById = async(id, options = {}) => {
    try {
        const grocery = await Grocery.findById(id).select(options);
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
            request_status: "success",
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
            request_status: "success",
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
        if (user.permission_level == 1 && user._id != grocery.Creator) throw new CustomError("You not creator of this grocery", 403)

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
            request_status: "success",
            groceryId: grocery._id
        })
    } catch (e) {
        next(e)
    }
}

//update grocery in wallet
const updateUserGrocery = async(req, res, next) => {
    const updateSchema = joi.object({
        grocery_id: joi.string().required(),
        amount: joi.number().positive(),
        expiresDate: joi.date().min('now'),
        verify_token: joi.string()
    })
    try {
        //check if user have permission to update grocery
        const user = await getUserById(req.user._id);

        //validate request body
        const { grocery_id, amount, expiresDate } = await validateRequestBody(updateSchema, req.body)

        //update grocery information
        const update = await UserGroceryMap.updateOne({
            user: user._id,
            grocery: grocery_id
        }, {
            amount: amount,
            expiresDate: expiresDate
        })

        res.status(200).send({
            request_status: "success",
        })
    } catch (e) {
        next(e)
    }
}

//delete grocery and related records
const deleteGrocery = async(req, res, next) => {
    try {
        const grocery_id = req.params.id;
        // Check if grocery exists
        const grocery = await getGroceryById(grocery_id);

        // Check if user have permission to delete grocery
        const user = await getUserById(req.user._id);
        if (user.permission_level >= 2 || user.permission_level < 0) throw new CustomError("Permission denied", 403);
        if (user.permission_level == 1 && user._id != grocery.Creator) throw new CustomError("You not creaator of this grocery", 403)

        // Delete grocery and related records
        const client_session = await Grocery.startSession();
        try {
            //find all user have grocery in their grocery list
            const ugms = await UserGroceryMap.find({ grocery: grocery._id }).select({ user: 1, _id: 1 }).session(client_session);
            const user_ids = ugms.map((item) => item.user);
            const ugm_ids = ugms.map((item) => item._id);

            //delete grocery from user grocery list
            await UserGroceryMap.deleteMany({ grocery: grocery_id }).session(client_session);
            await User.updateMany({
                _id: { $in: user_ids }
            }, {
                $pull: { UserGroceryMaps: { $in: ugm_ids } }
            }).session(client_session)

            //delete grocery from recipe ingredient list
            const rgms = await RecipeGroceryMap.find({ grocery: grocery_id }).select({ recipe: 1, _id: 1 }).session(client_session);
            const recipe_ids = rgms.map((item) => item.recipe);
            const rgm_ids = rgms.map((item) => item._id);
            await RecipeGroceryMap.deleteMany({ grocery: grocery_id }).session(client_session);
            await Recipe.updateMany({
                _id: { $in: recipe_ids }
            }, {
                $pull: { RecipeGroceryMaps: { $in: rgm_ids } }
            }).session(client_session)

            //delete grocery
            await grocery.deleteOne().session(client_session);

        } catch (e) {
            await client_session.abortTransaction();
            throw e;
        } finally {
            await client_session.endSession();
        }

        // Response
        res.status(200).send({
            request_status: "success",
            groceryId: grocery_id
        });
    } catch (e) {
        next(e);
    }
}

const groceryController = {
    createGrocery,
    getGroceriesByQueries,
    getGrocery,
    addGrocery,
    removeGrocery,
    updateGrocery,
    updateUserGrocery,
    deleteGrocery
}

module.exports = groceryController;