const { Grocery, UserGroceryMap, User, RecipeGroceryMap, Recipe } = require('../models/Models');
const { CustomError } = require('../middleware/errorhandle');
const { removeFile, getUserById, validateRequestBody, paginate } = require('../utils/helper');
const { grocery_unit } = require('../config/constants')
const joi = require('joi');

//GET api/grocery?name=...
//get all groceries for dropdown grocery menu
const getGroceriesByName = async(req, res, next) => {
    const querySchema = joi.object({
        name: joi.string(),
        page: joi.number().positive(),
        limit: joi.number().positive(),
        by_expires_date: joi.allow('asc', 'desc', 'ascending', 'descending', 1, -1, '1', '-1'),
        by_name: joi.allow('asc', 'desc', 'ascending', 'descending', 1, -1, '1', '-1'),
    }).oxor('by_expires_date', 'by_name')
    try {
        //validate request query
        const { name, page, limit, by_expires_date, by_name } = await validateRequestBody(querySchema, req.query)

        const sortOption = {}
        if (by_expires_date) {
            sortOption.expiresDate = by_expires_date
        }
        if (by_name) {
            sortOption.name = by_name
        }

        const { result, nextPage, prevPage, total } = await paginate(Grocery, {
            name: {
                $regex: new RegExp(`\\w*${name ? name: ''}\\w*`, 'i'),
            }
        }, {
            page: page || 1,
            limit: limit || 5,
            field: {
                _id: 1,
                image_path: 1,
                unit: 1,
                kcal_per_unit: 1,
                name: 1
            },
            sort: sortOption
        })

        res.status(200).send({
            request_status: "success",
            groceries: result,
            nextPage,
            prevPage,
            total
        });
    } catch (e) {
        next(e)
    }
}

//GET api/grocery/user?is_in_buying_list=...&name=...
//get all user groceries list(wallet)
const getUserGroceryList = async(req, res, next) => {
    const querySchema = joi.object({
        is_in_buying_list: joi.boolean(),
        name: joi.string(),
        page: joi.number().positive(),
        limit: joi.number().positive(),
        by_expires_date: joi.allow('asc', 'desc', 'ascending', 'descending', 1, -1, '1', '-1'),
        by_name: joi.allow('asc', 'desc', 'ascending', 'descending', 1, -1, '1', '-1'),
    }).oxor('by_expires_date', 'by_name')
    try {
        const { is_in_buying_list, name, page, limit, by_expires_date, by_name } = await validateRequestBody(querySchema, req.query)

        const user_groceries = await UserGroceryMap.find({ user: req.user._id })
            .populate({
                path: 'grocery',
                model: Grocery,
                match: {
                    name: {
                        $regex: new RegExp(`\\w*${name ? name: ''}\\w*`, 'i')
                    }
                }
            }).where('isInBuyingList', is_in_buying_list || false)

        const grocery_ids = user_groceries.filter((item) => item.grocery != null).map((item) => item.grocery._id)

        const sortOption = {}
        if (by_expires_date) {
            sortOption.expiresDate = by_expires_date
        }
        if (by_name) {
            sortOption.name = by_name
        }

        const { result, nextPage, prevPage, total } = await paginate(Grocery, {
            _id: { $in: grocery_ids }
        }, {
            page: page || 1,
            limit: limit || 5,
            field: {
                _id: 1,
                image_path: 1,
                unit: 1,
                kcal_per_unit: 1,
                name: 1,
            },
            sort: sortOption,
            populate: {
                path: 'UserGroceryMaps',
                model: UserGroceryMap,
                match: {
                    user: req.user._id
                },
                select: { _id: 1, amount: 1, expiresDate: 1 }
            }
        })

        res.status(200).send({
            request_status: "success",
            user_groceries: result,
            nextPage,
            prevPage,
            total
        });
    } catch (e) {
        next(e)
    }
}

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

//GET api/grocery/:id
//get grocery by id
const getGrocery = async(req, res, next) => {
    try {
        const temp = await getGroceryById(req.params.id);
        if (temp == 0) throw new CustomError("Grocery not found", 404)
        const grocery = await Grocery.aggregate([{
            $match: {
                _id: temp._id
            }
        }, {
            $project: {
                _id: 1,
                name: 1,
                unit: 1,
                kcal_per_unit: 1,
                image_path: 1,
            }
        }, {
            $lookup: {
                from: 'recipegrocerymaps',
                localField: '_id',
                foreignField: 'grocery',
                as: 'recipegrocerymap'
            }
        }, {
            $unwind: '$recipegrocerymap'
        }, {
            $lookup: {
                from: 'recipes',
                localField: 'recipegrocerymap.recipe',
                foreignField: '_id',
                as: 'recipe'
            }
        }, {
            $unwind: '$recipe'
        }, {
            $project: {
                '_id': 1,
                'name': 1,
                'image_path': 1,
                'unit': 1,
                'kcal_per_unit': 1,
                'recipegrocerymap._id': 1,
                'recipegrocerymap.amount': 1,
                'recipe._id': 1,
                'recipe.name': 1,
                'recipe.difficulty': 1,
                'recipe.timeToCook': 1,
                'recipe.timeToPrepare': 1,
                'recipe.kcal_per_serving': 1,
                'recipe.recipe_in_text': 1,
            }
        }])

        const recipes = grocery.map(item => {
            return {
                _id: item.recipe._id,
                name: item.recipe.name,
                difficulty: item.recipe.difficulty,
                timeToCook: item.recipe.timeToCook,
                timeToPrepare: item.recipe.timeToPrepare,
                kcal_per_serving: item.recipe.kcal_per_serving,
                recipe_in_text: item.recipe.recipe_in_text,
                amount: item.recipegrocerymap.amount,
                RecipeGroceryMap_id: item.recipegrocerymap._id
            }
        })

        res.status(200).send({
            request_status: "success",
            grocery: {
                _id: grocery[0]._id,
                name: grocery[0].name,
                image_path: grocery[0].image_path,
                unit: grocery[0].unit,
                kcal_per_unit: grocery[0].kcal_per_unit,
                recipes: recipes
            }
        });
    } catch (e) {
        next(e)
    }
}

//POST api/grocery/create
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
        if (user.permission_level != 0) {
            if (user.permission_level >= 2) throw new CustomError("Permission denied", 403)
        }

        //validate request body
        const { name, unit, kcal_per_unit } = await validateRequestBody(createSchema, req.body)

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

//PUT api/grocery/add
//add grocery to user groceries list(wallet) or buy list
const addGrocery = async(req, res, next) => {
    const addSchema = joi.object({
        grocery_id: joi.string().required(),
        amount: joi.number().positive().required(),
        expires_date: joi.date().min('now').required(),
        is_in_buying_list: joi.boolean(),
        verify_token: joi.string()
    })
    try {
        const user = await getUserById(req.user._id);
        //validate request body
        const { grocery_id, amount, expires_date, is_in_buying_list } = await validateRequestBody(addSchema, req.body)
        const grocery = await getGroceryById(grocery_id);

        //check if grocery already in user grocery buy list
        let userGroceryMap = await UserGroceryMap.findOne({
            grocery: grocery._id,
            user: user._id,
            isInBuyingList: true
        })
        if (userGroceryMap != null) throw new CustomError("Grocery already in user grocery buy list", 400)

        userGroceryMap = new UserGroceryMap({
            user: user._id,
            grocery: grocery._id,
            amount: amount,
            expiresDate: expires_date,
            isInBuyingList: is_in_buying_list || false
        })

        //using transaction to add grocery to user grocery map list
        const client_session = await UserGroceryMap.startSession();
        client_session.startTransaction();
        try {
            await userGroceryMap.save({ session: client_session });

            if (!user.UserGroceryMaps.includes(userGroceryMap._id)) {
                await user.updateOne({
                    $addToSet: {
                        UserGroceryMaps: userGroceryMap._id
                    }
                }).session(client_session);
            }

            if (!grocery.UserGroceryMaps.includes(userGroceryMap._id)) {
                await grocery.updateOne({
                    $addToSet: {
                        UserGroceryMaps: userGroceryMap._id
                    }
                }).session(client_session);
            }
            if (client_session.inTransaction()) {
                await client_session.commitTransaction();
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
            user_grocery: userGroceryMap
        })
    } catch (e) {
        next(e)
    }
}

//PUT api/grocery/update
//update grocery information
const updateGrocery = async(req, res, next) => {
    const updateSchema = joi.object({
        grocery_id: joi.string().required(),
        name: joi.string(),
        unit: joi.string().valid(...grocery_unit),
        kcal_per_unit: joi.number().positive(),
        verify_token: joi.string()
    })
    try {
        //validate request body
        const { grocery_id, name, unit, kcal_per_unit } = await validateRequestBody(updateSchema, req.body)
        const grocery = await getGroceryById(grocery_id, { Creator: 1, _id: 1 });

        //check if user have permission to update grocery
        const user = await getUserById(req.user._id);
        if (user.permission_level != 0) {
            if (user.permission_level >= 2) throw new CustomError("Permission denied", 403);
            if (user.permission_level == 1) {
                if (user._id.toString() != grocery.Creator.toString()) throw new CustomError("Permission denied", 403)
            }
        }

        //update grocery information
        await grocery.updateOne({
            name: name || grocery.name,
            unit: unit || grocery.unit,
            kcal_per_unit: kcal_per_unit || grocery.kcal_per_unit,
            image_path: req.file ? req.file.filename : grocery.image_path
        })

        //response
        res.status(200).send({
            request_status: "success",
        })
    } catch (e) {
        next(e)
    }
}

//PUT api/grocery/update/:id
//update grocery in wallet
const updateUserGrocery = async(req, res, next) => {
    const updateSchema = joi.object({
        amount: joi.number().positive(),
        expires_date: joi.date().min('now'),
        is_in_buying_list: joi.boolean(),
        verify_token: joi.string()
    })
    try {
        const userGroceryMap = await UserGroceryMap.findById(req.params.id);
        if (userGroceryMap == null) throw new CustomError("Grocery not found in user grocery list", 404)
            //validate request body
        const { amount, expires_date, is_in_buying_list } = await validateRequestBody(updateSchema, req.body)

        //update grocery information
        await userGroceryMap.updateOne({
            amount: amount,
            expiresDate: expires_date,
            isInBuyingList: is_in_buying_list
        })

        res.status(200).send({
            request_status: "success",
        })
    } catch (e) {
        next(e)
    }
}

//DELETE api/grocery/remove/:id
//remove groceries from user groceries list(wallet)
const removeGrocery = async(req, res, next) => {
    try {
        //get user and grocery need to remove
        const user = await getUserById(req.user._id);
        const userGroceryMap = await UserGroceryMap.findById(req.params.id);
        if (userGroceryMap == null || userGroceryMap.user.toString() != user._id.toString()) {
            throw new CustomError("Grocery not found", 404)
        }
        const grocery = await getGroceryById(userGroceryMap.grocery);

        //using transaction to remove grocery from user grocery map list
        const client_session = await UserGroceryMap.startSession();
        client_session.startTransaction();
        try {
            if (user.UserGroceryMaps.includes(userGroceryMap._id)) {
                await user.updateOne({
                    $pullAll: {
                        UserGroceryMaps: userGroceryMap._id
                    }
                }).session(client_session);
            }
            if (grocery.UserGroceryMaps.includes(userGroceryMap._id)) {
                await grocery.updateOne({
                    $pullAll: {
                        UserGroceryMaps: userGroceryMap._id
                    }
                }).session(client_session);
            }
            await userGroceryMap.deleteOne().session(client_session);
            if (client_session.inTransaction()) {
                await client_session.commitTransaction();
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

//DELETE api/grocery/:id
//delete grocery and related records
const deleteGrocery = async(req, res, next) => {
    try {
        const grocery_id = req.params.id;
        // Check if grocery exists
        const grocery = await getGroceryById(grocery_id);

        // Check if user have permission to delete grocery
        const user = await getUserById(req.user._id);
        if (user.permission_level != 0) {
            if (user.permission_level >= 2 || user.permission_level < 0) throw new CustomError("Permission denied", 403);
            if (user.permission_level == 1) {
                if (user._id.toString() != grocery.Creator.toString()) throw new CustomError("Permission denied", 403)
            }
        }

        // Delete grocery and related records
        const client_session = await Grocery.startSession();
        client_session.startTransaction();
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
                $pullAll: { UserGroceryMaps: ugm_ids }
            }).session(client_session)

            //delete grocery from recipe ingredient list
            const rgms = await RecipeGroceryMap.find({ grocery: grocery_id }).select({ recipe: 1, _id: 1 }).session(client_session);
            const recipe_ids = rgms.map((item) => item.recipe);
            const rgm_ids = rgms.map((item) => item._id);
            await RecipeGroceryMap.deleteMany({ grocery: grocery_id }).session(client_session);
            await Recipe.updateMany({
                _id: { $in: recipe_ids }
            }, {
                $pullAll: {
                    RecipeGroceryMaps: rgm_ids
                }
            }).session(client_session)

            //delete grocery
            await grocery.deleteOne().session(client_session);
            if (client_session.inTransaction()) {
                await client_session.commitTransaction();
            }
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
    getGroceriesByName,
    getUserGroceryList,
    getGrocery,
    addGrocery,
    removeGrocery,
    updateGrocery,
    updateUserGrocery,
    deleteGrocery
}

module.exports = groceryController;