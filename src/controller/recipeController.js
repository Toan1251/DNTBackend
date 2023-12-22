const joi = require('joi');
const { Recipe, RecipeGroceryMap, Grocery, Meal, MealRecipeMap, User } = require('../models/Models');
const { CustomError } = require('../middleware/errorhandle');
const { paginate, validateRequestBody, getUserById } = require('../utils/helper');

const getRecipeById = async(recipeId, options = {}) => {
    try {
        const recipe = await Recipe.findById(recipeId, options);
        if (!recipe) {
            throw new CustomError(`Recipe not found!`, 404);
        }
        return recipe;
    } catch (error) {
        throw new CustomError('Recipe not found!', 404)
    }
};

// GET a single recipe by ID
// GET api/recipe/:id
const getRecipe = async(req, res, next) => {
    try {
        const r = await getRecipeById(req.params.id);
        if (r == null) throw new CustomError('Recipe not found!', 404)

        const recipe = await Recipe.aggregate([{
            $match: { _id: r._id }
        }, {
            $lookup: {
                from: 'recipegrocerymaps',
                localField: 'RecipeGroceryMaps',
                foreignField: '_id',
                as: 'RecipeGroceryMap'
            }
        }, {
            $unwind: '$RecipeGroceryMap'
        }, {
            $lookup: {
                from: 'groceries',
                localField: 'RecipeGroceryMap.grocery',
                foreignField: '_id',
                as: 'grocery'
            }
        }, {
            $unwind: '$grocery'
        }, {
            $lookup: {
                from: 'users',
                localField: 'Creator',
                foreignField: '_id',
                as: 'Creator'
            }
        }, {
            $unwind: '$Creator'
        }, {
            $project: {
                '_id': 1,
                'name': 1,
                'difficulty': 1,
                'timeToCook': 1,
                'timeToPrepare': 1,
                'kcal_per_serving': 1,
                'recipe_in_text': 1,
                'RecipeGroceryMap._id': 1,
                'RecipeGroceryMap.amount': 1,
                'grocery._id': 1,
                'grocery.name': 1,
                'grocery.image_path': 1,
                'grocery.unit': 1,
                'grocery.kcal_per_unit': 1,
                'Creator._id': 1,
                'Creator.username': 1,
            }
        }])

        const groceries = recipe.map(r => {
            return {
                _id: r.grocery._id,
                name: r.grocery.name,
                image_path: r.grocery.image_path,
                unit: r.grocery.unit,
                kcal_per_unit: r.grocery.kcal_per_unit,
                amount: r.RecipeGroceryMap.amount,
                RecipeGroceryMap_id: r.RecipeGroceryMap._id,
            }
        })

        res.status(200).send({
            request_status: 'success',
            recipe: {
                _id: recipe[0]._id,
                name: recipe[0].name,
                difficulty: recipe[0].difficulty,
                timeToCook: recipe[0].timeToCook,
                timeToPrepare: recipe[0].timeToPrepare,
                kcal_per_serving: recipe[0].kcal_per_serving,
                recipe_in_text: recipe[0].recipe_in_text,
                Creator: recipe[0].Creator,
                groceries,
            }
        })
    } catch (error) {
        next(error);
    }
}

// GET recipes by user
// GET api/recipe/user
const getRecipeByUser = async(req, res, next) => {
    try {
        const user = await getUserById(req.user._id);
        next()
    } catch (error) {
        next(error);
    }

}

// GET recipes
// GET api/recipe
const getRecipeByQueries = async(req, res, next) => {
    const querySchema = joi.object({
        name: joi.string(),
        min_kcal: joi.number().min(0),
        max_kcal: joi.number().min(0),
        page: joi.number().positive(),
        limit: joi.number().positive(),
        by_name: joi.allow('asc', 'desc', 'ascending', 'descending', '1', '-1', 1, -1),
        by_kcal: joi.allow('asc', 'desc', 'ascending', 'descending', '1', '-1', 1, -1),
    });

    try {
        // Validate request body
        const { name, min_kcal, max_kcal, page, limit, by_kcal, by_name } = await validateRequestBody(querySchema, req.query);

        // Build query object
        const query = {};

        if (name) {
            query.name = { $regex: new RegExp(`\\w*${name ? name: ''}\\w*`, 'i') };
        }

        if (min_kcal) {
            query.kcal_per_serving = { $gte: min_kcal };
        }

        if (max_kcal) {
            query.kcal_per_serving = {...query.kcal_per_serving, $lte: max_kcal };
        }

        if (req.user !== undefined) {
            query.Creator = req.user._id.toString();
        }

        // Fetch data using paginate
        const options = {
            page: page || 1,
            limit: limit || 5
        };
        if (by_name) options.sort = { name: by_name };
        if (by_kcal) options.sort = {...options.sort, kcal_per_serving: by_kcal };

        const { result, nextPage, prevPage, total } = await paginate(Recipe, query, options);

        res.status(200).send({
            request_status: 'success',
            recipes: result,
            nextPage,
            prevPage,
            total
        });
    } catch (error) {
        next(error);
    }
};

// CREATE a new recipe
// POST api/recipe
const createRecipe = async(req, res, next) => {
    const createSchema = joi.object({
        name: joi.string().required(),
        difficulty: joi.number().min(0).max(10),
        time_to_cook: joi.number().min(0),
        time_to_prepare: joi.number().min(0),
        kcal_per_serving: joi.number().min(0),
        recipe_in_text: joi.string().required(),
        groceries: joi.array().items(joi.object({
            id: joi.string().required(),
            amount: joi.number().min(0).required(),
        })).required(),
        verify_token: joi.string(),
    });

    try {
        // Validate request body using validateRequestBody function
        const { name, difficulty, time_to_cook, time_to_prepare, kcal_per_serving, recipe_in_text, groceries } = await validateRequestBody(createSchema, req.body);

        // Get creator by req.user._id
        const creator = await getUserById(req.user._id);

        // build recipe object
        const recipe = {
            name,
            recipe_in_text,
            Creator: creator._id,
        }
        if (difficulty) recipe.difficulty = difficulty;
        if (time_to_cook) recipe.timeToCook = time_to_cook;
        if (time_to_prepare) recipe.timeToPrepare = time_to_prepare;
        if (kcal_per_serving) recipe.kcal_per_serving = kcal_per_serving;

        // Start transaction to create recipe, recipegrocerymap and update grocery
        let recipe_id
        const client_session = await Recipe.startSession();
        client_session.startTransaction();
        try {
            const grocery_ids = groceries.map(grocery => grocery.id);
            const groceryItems = await Grocery.find({ _id: { $in: grocery_ids } }).session(client_session);
            if (groceryItems.length !== groceries.length) throw new CustomError('Some groceries are not found!', 404);

            const createdRecipe = new Recipe(recipe);
            await createdRecipe.save({ session: client_session });

            const rgm_ids = await Promise.all(groceries.map(async(grocery) => {
                const rgm = new RecipeGroceryMap({
                    recipe: createdRecipe._id,
                    grocery: grocery.id,
                    amount: grocery.amount,
                });
                await rgm.save({ session: client_session });
                await Grocery.updateOne({
                    _id: grocery.id
                }, {
                    $addToSet: { RecipeGroceryMaps: rgm._id }
                }).session(client_session);

                return rgm._id;
            }))

            recipe_id = createdRecipe._id
            await createdRecipe.updateOne({
                $addToSet: {
                    RecipeGroceryMaps: { $each: rgm_ids }
                }
            }).session(client_session);

            if (client_session.inTransaction()) {
                await client_session.commitTransaction();
            }
        } catch (e) {
            await client_session.abortTransaction();
            throw e
        } finally {
            await client_session.endSession();
        }

        // Return response
        const createdRecipe = await getRecipeById(recipe_id);
        res.status(201).send({
            request_status: 'success',
            recipe: createdRecipe,
        });
    } catch (error) {
        next(error);
    }
};

// UPDATE a recipe by ID
// PUT api/recipe/:id  
const updateRecipe = async(req, res, next) => {
    const createSchema = joi.object({
        name: joi.string(),
        difficulty: joi.number().min(0).max(10),
        time_to_cook: joi.number().min(0),
        time_to_prepare: joi.number().min(0),
        kcal_per_serving: joi.number().min(0),
        recipe_in_text: joi.string(),
        verify_token: joi.string(),
    });
    try {
        // Find recipe and user
        const recipe = await getRecipeById(req.params.id);
        const user = await getUserById(req.user._id);

        // Check permission
        if (user.permission_level != 0) {
            if (recipe.Creator.toString() != user._id.toString()) throw new CustomError('permission denied', 403);
        }

        // Validate request body
        const { name, difficulty, time_to_cook, time_to_prepare, kcal_per_serving, recipe_in_text } = await validateRequestBody(createSchema, req.body);

        // Update recipe
        recipe.name = name || recipe.name;
        recipe.difficulty = difficulty || recipe.difficulty;
        recipe.timeToCook = time_to_cook || recipe.timeToCook;
        recipe.timeToPrepare = time_to_prepare || recipe.timeToPrepare;
        recipe.kcal_per_serving = kcal_per_serving || recipe.kcal_per_serving;
        recipe.recipe_in_text = recipe_in_text || recipe.recipe_in_text;

        await recipe.save();

        res.status(200).send({
            request_status: 'success'
        })
    } catch (error) {
        next(error);
    }
};

// add groceries to recipe
// PUT api/recipe/add/:id
const addGroceriesToRecipe = async(req, res, next) => {
    const addSchema = joi.object({
        groceries: joi.array().items(joi.object({
            id: joi.string().required(),
            amount: joi.number().min(0).required(),
        })).required(),
        verify_token: joi.string(),
    });

    try {
        //validate request body
        const { groceries } = await validateRequestBody(addSchema, req.body);

        // get recipe by id
        const recipe = await getRecipeById(req.params.id);
        const user = await getUserById(req.user._id);

        //check permission
        if (user.permission_level != 0) {
            if (recipe.Creator.toString() != user._id.toString()) throw new CustomError('permission denied', 403);
        }

        const client_session = await Recipe.startSession();
        client_session.startTransaction();
        try {
            //check if all groceries are found
            const grocery_ids = groceries.map(grocery => grocery.id);
            const count = await Grocery.countDocuments({ _id: { $in: grocery_ids } }).session(client_session);
            if (count != groceries.length) throw new CustomError('Some groceries are not found!', 404);

            //create new recipegrocerymap and update grocery
            const rgm_ids = await Promise.all(groceries.map(async(grocery) => {
                let rgm = await RecipeGroceryMap.findOne({
                    grocery: grocery.id,
                    recipe: recipe._id,
                })
                if (rgm == null) {
                    rgm = new RecipeGroceryMap({
                        grocery: grocery.grocery,
                        recipe: recipe._id,
                        amount: grocery.amount,
                    });
                } else rgm.set('amount', grocery.amount)
                await rgm.save({ session: client_session });
                return rgm._id
            }))

            //update recipe
            await recipe.updateOne({
                $addToSet: {
                    RecipeGroceryMaps: { $each: rgm_ids }
                }
            }).session(client_session);

            if (client_session.inTransaction()) {
                await client_session.commitTransaction();
            }

        } catch (e) {
            await client_session.abortTransaction();
            throw e;
        } finally {
            await client_session.endSession();
        }

        //get updated recipe and return response
        const updateRecipe = await getRecipeById(req.params.id);

        res.status(200).send({
            request_status: 'success',
            recipe: updateRecipe,
        })
    } catch (e) {
        next(e);
    }
};

// remove grocery from recipe
// DELETE api/recipe/remove/:id
const removeGroceriesFromRecipe = async(req, res, next) => {
    const removeSchema = joi.object({
        groceries: joi.array().items(joi.string()).required(),
        verify_token: joi.string(),
    });

    try {
        // Validate request body
        const { groceries } = await validateRequestBody(removeSchema, req.body);

        //find recipe and user
        const recipe = await getRecipeById(req.params.id);
        const user = await getUserById(req.user._id);

        //check permission
        if (user.permission_level != 0) {
            if (recipe.Creator.toString() != user._id.toString()) throw new CustomError('permission denied', 403);
        }

        // Start transaction
        const client_session = await Recipe.startSession();
        client_session.startTransaction();
        try {
            const rgms = await RecipeGroceryMap.find({
                $and: [
                    { recipe: recipe._id },
                    { grocery: { $in: groceries } }
                ]
            }).session(client_session);
            if (rgms.length != groceries.length) throw new CustomError('Some groceries are not found!', 404);
            const rgm_ids = rgms.map(rgm => rgm._id);
            //update grocery
            await Promise.all(rgms.map(async(rgm) => {
                    await Grocery.updateOne({
                        _id: rgm.grocery
                    }, {
                        $pull: { RecipeGroceryMaps: rgm._id }
                    }).session(client_session);
                }))
                //update recipe
            await recipe.updateOne({
                $pull: {
                    RecipeGroceryMaps: { $in: rgm_ids }
                }
            }).session(client_session);

            //delete recipegrocerymap
            await RecipeGroceryMap.deleteMany({
                _id: { $in: rgm_ids }
            }).session(client_session);

            //commit transaction
            if (client_session.inTransaction()) {
                await client_session.commitTransaction();
            }
        } catch (error) {
            await client_session.abortTransaction();
            throw error;
        } finally {
            await client_session.endSession();
        }

        const updated = await getRecipeById(req.params.id);
        res.status(200).send({
            message: 'success',
            recipe: updated,
        })
    } catch (error) {
        next(error);
    }
};

// DELETE a recipe by ID
// DELETE api/recipe/:id => TODO
const deleteRecipe = async(req, res, next) => {
    try {
        // Get recipe and user
        const recipe = await getRecipeById(req.params.id);
        const user = await getUserById(req.user._id);

        // Check permission
        if (user.permission_level != 0) {
            if (recipe.Creator.toString() != user._id.toString()) throw new CustomError('Permission denied', 403);
        }

        // Start transaction
        const client_session = await Recipe.startSession();
        client_session.startTransaction();
        try {
            const rgm_ids = recipe.get('RecipeGroceryMaps');
            const rgms = await RecipeGroceryMap.find({
                _id: { $in: rgm_ids }
            }).populate({
                path: 'grocery',
                model: Grocery
            }).session(client_session);

            //update grocery
            await Promise.all(rgms.map(async(rgm) => {
                const grocery = rgm.grocery;
                await grocery.updateOne({
                    $pull: { RecipeGroceryMaps: rgm._id }
                }).session(client_session);
            }))

            //delete recipegrocerymap
            await RecipeGroceryMap.deleteMany({
                _id: { $in: rgm_ids }
            }).session(client_session);

            const mrm_ids = recipe.get('MealRecipeMaps');
            const mrms = await MealRecipeMap.find({
                _id: { $in: mrm_ids }
            }).populate({
                path: 'meal',
                model: Meal
            }).session(client_session);

            //update meal
            await Promise.all(mrms.map(async(mrm) => {
                const meal = mrm.meal;
                await meal.updateOne({
                    $pull: { MealRecipeMaps: mrm._id }
                }).session(client_session);
            }))

            //delete mealrecipeMap
            await MealRecipeMap.deleteMany({
                _id: { $in: mrm_ids }
            }).session(client_session);

            //delete recipe
            await recipe.deleteOne().session(client_session);
            if (client_session.inTransaction()) {
                await client_session.commitTransaction();
            }

        } catch (error) {
            // Rollback transaction
            await client_session.abortTransaction();
            throw error;
        } finally {
            await client_session.endSession();
        }

        res.status(200).send({
            request_status: 'success',
        })
    } catch (error) {
        next(error);
    }
};

const recipeController = {
    getRecipeByQueries,
    getRecipe,
    getRecipeByUser,
    createRecipe,
    updateRecipe,
    addGroceriesToRecipe,
    removeGroceriesFromRecipe,
    deleteRecipe
};

module.exports = recipeController;