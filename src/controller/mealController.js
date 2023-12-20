const { Meal, User, UserMealMap, Recipe, MealRecipeMap } = require('../models/Models');
const { CustomError } = require('../middleware/errorhandle');
const { getUserById, validateRequestBody, paginate } = require('../utils/helper');
const joi = require('joi');

const getMealById = async(id, options = {}) => {
    try {
        const meal = await Meal.findById(id, options);
        if (meal == null) {
            throw new CustomError('Meal not found', 404);
        }
        return meal;
    } catch (err) {
        throw new CustomError('Meal not found', 404);
    }
};

// GET /api/meal
const getMealByQueries = async(req, res, next) => {
    const querySchema = joi.object({
        name: joi.string(),
        min_time_cook: joi.number(),
        max_time_cook: joi.number(),
        min_kcal: joi.number(),
        max_kcal: joi.number(),
        page: joi.number().min(1),
        limit: joi.number().min(1),
        by_name: joi.allow('asc', 'desc', 'ascending', 'descending', 1, -1, '1', '-1'),
        by_kcal: joi.allow('asc', 'desc', 'ascending', 'descending', 1, -1, '1', '-1'),
        by_time_cook: joi.allow('asc', 'desc', 'ascending', 'descending', 1, -1, '1', '-1'),
    }).oxor('by_kcal', 'by_time_cook')
    try {
        // Logic to get meal by queries
        const { name, min_time_cook, max_time_cook, min_kcal, max_kcal, page, limit, by_name, by_kcal, by_time_cook } = await validateRequestBody(querySchema, req.query);

        //build query object
        const query = {}
        if (name) {
            query.name = { $regex: new RegExp(`\\w*${name ? name: ''}\\w*`, 'i') };
        }
        if (min_kcal) {
            query.total_kcal = { $gte: min_kcal };
        }
        if (max_kcal) {
            query.total_kcal = {...query.total_kcal, $lte: max_kcal };
        }
        if (min_time_cook) {
            query.total_time_cook = { $gte: min_time_cook };
        }
        if (max_time_cook) {
            query.total_time_cook = {...query.total_time_cook, $lte: max_time_cook };
        }

        if (req.userMealMapIds !== undefined) {
            const umm_ids = req.userMealMapIds.map(id => id.toString())
            query.UserMealMaps = {
                $elemMatch: { $in: umm_ids }
            }
            console.log(req.userMealMapIds)
        }

        //build paginate options
        const options = {
            page: page || 1,
            limit: limit || 5,
        }
        if (by_name) {
            options.sort = { name: by_name }
        }
        if (by_kcal) {
            options.sort = {...options.sort, total_kcal: by_kcal }
        }
        if (by_time_cook) {
            options.sort = {...options.sort, total_time_cook: by_time_cook }
        }

        //get result
        const { result, nextPage, prevPage, total } = await paginate(Meal, query, options);

        //send response
        res.status(200).send({
            request_status: 'success',
            result,
            nextPage,
            prevPage,
            total
        })
    } catch (err) {
        next(err);
    }
};

// GET /api/meal/user
const getUserMeals = async(req, res, next) => {
    try {
        // Logic to get user meals
        const user = await getUserById(req.user._id);
        const userMealMapIds = user.UserMealMaps;
        req.userMealMapIds = userMealMapIds;
        next()
    } catch (err) {
        next(err);
    }
};

// GET /api/meal/:id
const getMeal = async(req, res, next) => {
    try {
        // Logic to get a meal by ID
        const meal = await getMealById(req.params.id);

        res.status(200).send({
            request_status: 'success',
            meal
        })
    } catch (err) {
        next(err);
    }
};

// POST /api/meal
const createMeal = async(req, res, next) => {
    const mealSchema = joi.object({
        name: joi.string().required(),
        total_time_cook: joi.number().required(),
        total_kcal: joi.number().required(),
        recipes: joi.array().items(joi.string()),
        verify_token: joi.string()
    })

    try {
        // validate request body
        const { name, total_time_cook, total_kcal, recipes } = await validateRequestBody(mealSchema, req.body);
        //get creator
        const user = await getUserById(req.user._id);
        //build meal object
        const mealObject = {
            name,
            total_time_cook,
            total_kcal,
            Creator: user._id.toString()
        }
        if (recipes.length != await Recipe.countDocuments({ _id: { $in: recipes } })) {
            throw new CustomError('Some Recipes not found', 404);
        }

        //create meal
        const meal = new Meal(mealObject);

        // create meal by transaction
        const client_session = await Meal.startSession();
        client_session.startTransaction();
        try {

            await meal.save({ session: client_session });

            //create meal recipe map
            const recipeList = await Recipe.find({ _id: { $in: recipes } }).session(client_session);
            const mrm_ids = await Promise.all(recipeList.map(async recipe => {
                const mealRecipeMap = new MealRecipeMap({
                    meal: meal._id,
                    recipe: recipe._id,
                    Creator: req.user._id.toString()
                });
                await mealRecipeMap.save({ session: client_session });
                await recipe.updateOne({
                    $addToSet: { MealRecipeMaps: mealRecipeMap._id }
                }).session(client_session);
                return mealRecipeMap._id
            }))

            await meal.updateOne({
                $addToSet: {
                    MealRecipeMaps: { $each: mrm_ids }
                }
            }).session(client_session);
            if (client_session.inTransaction()) {
                await client_session.commitTransaction();
            }
        } catch (err) {
            client_session.abortTransaction();
            throw err;
        } finally {
            client_session.endSession();
        }

        const result = await getMealById(meal._id);
        res.status(201).send({
            request_status: 'success',
            meal: result
        })
    } catch (err) {
        next(err);
    }
};

// 

// PUT /api/meal/:id
const updateMeal = async(req, res, next) => {
    const updateSchema = joi.object({
        name: joi.string(),
        total_time_cook: joi.number(),
        total_kcal: joi.number(),
    })
    try {
        const { name, total_time_cook, total_kcal } = await validateRequestBody(updateSchema, req.body)
        const user = await getUserById(req.user._id);
        const meal = await getMealById(req.params.id);
        if (user.permission_level != 0) {
            if (meal.Creator.toString() != req.user._id.toString()) {
                throw new CustomError('Permission denied', 403);
            }
        }
        if (name) meal.set('name', name)
        if (total_time_cook) meal.set('total_time_cook', total_time_cook)
        if (total_kcal) meal.set('total_kcal', total_kcal)
        await meal.save();

        res.status(200).send({
            request_status: 'success',
        })
    } catch (err) {
        next(err);
    }
};

//PUT /api/meal/add/:id
const addRecipeToMeal = async(req, res, next) => {
    const addSchema = joi.object({
        recipes: joi.array().items(joi.string()).required()
    })
    try {
        //validate request body
        const { recipes } = await validateRequestBody(addSchema, req.body)

        const meal = await getMealById(req.params.id);
        const user = await getUserById(req.user._id);

        //check permission
        if (user.permission_level != 0) {
            if (meal.Creator.toString() != req.user._id.toString()) {
                throw new CustomError('Permission denied', 403);
            }
        }

        //check recipe exist
        if (recipes.length != await Recipe.countDocuments({ _id: { $in: recipes } })) {
            throw new CustomError('Some Recipes not found', 404);
        }

        //create meal by transaction
        const client_session = await Meal.startSession();
        client_session.startTransaction();
        try {
            const recipeList = await Recipe.find({ _id: { $in: recipes } }).session(client_session);
            const mrm_ids = await Promise.all(recipeList.map(async recipe => {
                let mrm = await MealRecipeMap.findOne({
                    $and: [
                        { meal: meal._id },
                        { recipe: recipe._id }
                    ]
                }).session(client_session);

                if (mrm == null) {
                    mrm = new MealRecipeMap({
                        meal: meal._id,
                        recipe: recipe._id,
                    });
                    await mrm.save({ session: client_session });
                }

                await recipe.updateOne({
                    $addToSet: { MealRecipeMaps: mrm._id }
                }).session(client_session);

                return mrm._id
            }))

            await meal.updateOne({
                $addToSet: {
                    MealRecipeMaps: { $each: mrm_ids }
                }
            }).session(client_session);

            if (client_session.inTransaction()) {
                await client_session.commitTransaction();
            }
        } catch (err) {
            client_session.abortTransaction();
            throw err;
        } finally {
            client_session.endSession();
        }

        const updated = await getMealById(req.params.id);
        res.status(200).send({
            request_status: 'success',
            meal: updated
        })

    } catch (err) {
        next(err);
    }
};

// -->TODO
//PUT /api/meal/user/add/:id
const addMealToUser = async(req, res, next) => {
    const addSchema = joi.object({
        schedules: joi.array().items(joi.date()).required()
    })
    try {
        const { schedules } = await validateRequestBody(addSchema, req.body);
    } catch (err) {
        next(err);
    }
}

//DELETE /api/meal/remove/:id
const removeRecipeFromMeal = async(req, res, next) => {
    const removeSchema = joi.object({
        recipes: joi.array().items(joi.string()).required()
    })
    try {
        //validate request body
        const { recipes } = await validateRequestBody(removeSchema, req.body)
        const meal = await getMealById(req.params.id);
        const user = await getUserById(req.user._id);
        if (user.permission_level != 0) {
            if (meal.Creator.toString() != req.user._id.toString()) {
                throw new CustomError('Permission denied', 403);
            }
        }
        //check recipe exist in meal
        const count = await MealRecipeMap.countDocuments({
            $and: [
                { meal: meal._id },
                { recipe: { $in: recipes } }
            ]
        })

        if (count != recipes.length) {
            throw new CustomError('Some Recipes not found', 404);
        }

        //remove recipe from meal by transaction
        const client_session = await Meal.startSession();
        client_session.startTransaction();
        try {
            //find meal recipe map
            const mrms = await MealRecipeMap.find({
                $and: [
                    { meal: meal._id },
                    { recipe: { $in: recipes } }
                ]
            }).session(client_session);
            const mrm_ids = mrms.map(mrm => mrm._id.toString());

            //remove them from recipe
            await Promise.all(mrms.map(async(mrm) => {
                const recipe = await Recipe.findById(mrm.recipe).session(client_session);
                await recipe.updateOne({
                    $pull: { MealRecipeMaps: mrm._id }
                }).session(client_session);
            }))

            //remove them from meal
            await meal.updateOne({
                $pull: {
                    MealRecipeMaps: { $in: mrm_ids }
                }
            }).session(client_session);

            //then delete them
            await MealRecipeMap.deleteMany({
                _id: { $in: mrm_ids }
            }).session(client_session);

            if (client_session.inTransaction()) {
                await client_session.commitTransaction();
            }
        } catch (err) {
            client_session.abortTransaction();
            throw err;
        } finally {
            client_session.endSession();
        }

        const updated = await getMealById(req.params.id);
        res.status(200).send({
            request_status: 'success',
            meal: updated
        })
    } catch (err) {
        next(err);
    }
};

// -->TODO
//DELETE /api/meal/user/remove/:id
const removeMealFromUser = async(req, res, next) => {

}

// -->TODO
const scheduleMeal = (req, res, next) => {
    try {
        // Logic to schedule a meal
    } catch (err) {
        next(err);
    }
};

// -->TODO
// DELETE /api/meal/:id
const deleteMeal = (req, res, next) => {
    try {
        // Logic to delete a meal by ID
    } catch (err) {
        next(err);
    }
};

const mealController = {
    getMealByQueries,
    getUserMeals,
    getMeal,
    createMeal,
    updateMeal,
    addRecipeToMeal,
    addMealToUser,
    removeRecipeFromMeal,
    removeMealFromUser,
    scheduleMeal,
    deleteMeal,
};

module.exports = mealController;