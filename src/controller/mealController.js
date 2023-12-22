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
            meals: result,
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
        const m = await getMealById(req.params.id);
        if (m == null) throw new CustomError('Meal not found', 404);

        const meal = await Meal.aggregate([{
            $match: { _id: m._id }
        }, {
            $lookup: {
                from: 'mealrecipemaps',
                localField: 'MealRecipeMaps',
                foreignField: '_id',
                as: 'MealRecipeMap'
            }
        }, {
            $unwind: '$MealRecipeMap'
        }, {
            $lookup: {
                from: 'recipes',
                localField: 'MealRecipeMap.recipe',
                foreignField: '_id',
                as: 'recipe'
            }
        }, {
            $unwind: '$recipe'
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
                'total_time_cook': 1,
                'total_kcal': 1,
                'Creator._id': 1,
                'Creator.username': 1,
                'MealRecipeMap._id': 1,
                'recipe._id': 1,
                'recipe.name': 1,
                'recipe.difficulty': 1,
                'recipe.timeToCook': 1,
                'recipe.timeToPrepare': 1,
                'recipe.kcal_per_serving': 1,
                'recipe.recipe_in_text': 1,
            }
        }])

        const recipes = meal.map(m => {
            return {
                _id: m.recipe._id,
                name: m.recipe.name,
                difficulty: m.recipe.difficulty,
                timeToCook: m.recipe.timeToCook,
                timeToPrepare: m.recipe.timeToPrepare,
                kcal_per_serving: m.recipe.kcal_per_serving,
                recipe_in_text: m.recipe.recipe_in_text,
                MealRecipeMap_id: m.MealRecipeMap._id,
            }
        })

        res.status(200).send({
            request_status: 'success',
            meal: {
                _id: meal[0]._id,
                name: meal[0].name,
                total_time_cook: meal[0].total_time_cook,
                total_kcal: meal[0].total_kcal,
                Creator: meal[0].Creator,
                recipes: recipes
            }
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
            await client_session.abortTransaction();
            throw err;
        } finally {
            await client_session.endSession();
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

// PUT /api/meal/:id
const updateMeal = async(req, res, next) => {
    const updateSchema = joi.object({
        name: joi.string(),
        total_time_cook: joi.number(),
        total_kcal: joi.number(),
        verify_token: joi.string()
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

//PUT /api/meal/recipe/add:id
const addRecipeToMeal = async(req, res, next) => {
    const addSchema = joi.object({
        recipes: joi.array().items(joi.string()).required(),
        verify_token: joi.string()
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
            await client_session.abortTransaction();
            throw err;
        } finally {
            await client_session.endSession();
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

//DELETE /api/meal/recipe/remove/:id
const removeRecipeFromMeal = async(req, res, next) => {
    const removeSchema = joi.object({
        recipes: joi.array().items(joi.string()).required(),
        verify_token: joi.string()
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
            await client_session.abortTransaction();
            throw err;
        } finally {
            await client_session.endSession();
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

//PUT /api/meal/user/add/:id
const addMealToUser = async(req, res, next) => {
    try {
        const user = await getUserById(req.user._id);
        const meal = await getMealById(req.params.id);

        const client_session = await User.startSession();
        client_session.startTransaction();
        try {
            const umm = await UserMealMap.findOne({
                $and: [
                    { user: user._id },
                    { meal: meal._id }
                ]
            }).session(client_session);

            if (umm != null) throw new CustomError('Meal already added', 400);

            const new_umm = new UserMealMap({
                user: user._id,
                meal: meal._id,
            });
            await new_umm.save({ session: client_session });

            await user.updateOne({
                $addToSet: {
                    UserMealMaps: new_umm._id
                }
            }).session(client_session);

            await meal.updateOne({
                $addToSet: {
                    UserMealMaps: new_umm._id
                }
            }).session(client_session);

            if (client_session.inTransaction()) {
                await client_session.commitTransaction();
            }
        } catch (err) {
            await client_session.abortTransaction();
            throw err;
        } finally {
            await client_session.endSession();
        }

        const umm = await UserMealMap.findOne({
            $and: [
                { user: user._id },
                { meal: meal._id }
            ]
        })

        res.status(200).send({
            request_status: 'success',
            user_meal_map: umm
        })


    } catch (err) {
        next(err);
    }
}

//DELETE /api/meal/user/remove/:id
const removeMealFromUser = async(req, res, next) => {
    try {
        const user = await getUserById(req.user._id);
        const meal = await getMealById(req.params.id);

        const umm = await UserMealMap.findOne({
            $and: [
                { user: user._id },
                { meal: meal._id }
            ]
        })

        if (umm == null) throw new CustomError("You don't add this meal", 404);

        const client_session = await User.startSession();
        client_session.startTransaction();
        try {
            await user.updateOne({
                $pull: {
                    UserMealMaps: umm._id
                }
            }).session(client_session);

            await meal.updateOne({
                $pull: {
                    UserMealMaps: umm._id
                }
            }).session(client_session);

            await umm.deleteOne({ session: client_session });

            if (client_session.inTransaction()) {
                await client_session.commitTransaction();
            }
        } catch (err) {
            await client_session.abortTransaction();
            throw err;
        } finally {
            await client_session.endSession();
        }

        res.status(200).send({
            request_status: 'success',
        })
    } catch (err) {
        next(err);
    }
}

// PUT /api/meal/schedule/:id
const scheduleMeal = async(req, res, next) => {
    const scheduleSchema = joi.object({
        schedules: joi.array().items(joi.object({
            start: joi.date().required(),
            end: joi.date().greater(joi.ref('start')).required()
        })).required(),
        verify_token: joi.string()
    })
    try {
        //validate request body
        const { schedules } = await validateRequestBody(scheduleSchema, req.body)

        // get user and meal map
        const user_meal_map = await UserMealMap.findOne({
            $and: [
                { user: req.user._id },
                { meal: req.params.id }
            ]
        })

        if (user_meal_map == null) throw new CustomError("You didn't add this meal", 404);

        //set new Schedule
        user_meal_map.set('schedules', schedules);
        await user_meal_map.save();

        res.status(200).send({
            request_status: 'success'
        })

    } catch (err) {
        next(err);
    }

};

// -->TODO
// DELETE /api/meal/:id
const deleteMeal = async(req, res, next) => {
    try {
        const meal = await getMealById(req.params.id);
        const user = await getUserById(req.user._id);

        //check permission
        if (user.permission_level != 0) {
            if (meal.Creator.toString() != req.user._id.toString()) {
                throw new CustomError('Permission denied', 403);
            }
        }

        //delete meal by transaction
        const client_session = await Meal.startSession();
        client_session.startTransaction();
        try {
            //get meal recipe map ids
            const mrm_ids = meal.get('MealRecipeMaps').map(mrm => mrm.toString())
            const mrm = await MealRecipeMap.find({
                _id: { $in: mrm_ids }
            }).session(client_session);

            await Promise.all(mrm.map(async(mrm) => {
                const recipe = await Recipe.findById(mrm.recipe).session(client_session);
                await recipe.updateOne({
                    $pull: { MealRecipeMaps: mrm._id }
                }).session(client_session);
            }))
            await MealRecipeMap.deleteMany({
                _id: { $in: mrm_ids }
            }).session(client_session);

            const umm_ids = meal.get('UserMealMaps').map(umm => umm.toString())
            const umm = await UserMealMap.find({
                _id: { $in: umm_ids }
            }).session(client_session);

            await Promise.all(umm.map(async(umm) => {
                const user = await User.findById(umm.user).session(client_session);
                await user.updateOne({
                    $pull: { UserMealMaps: umm._id }
                }).session(client_session);
            }))
            await UserMealMap.deleteMany({
                _id: { $in: umm_ids }
            }).session(client_session);

            await meal.deleteOne({ session: client_session });
            if (client_session.inTransaction()) {
                await client_session.commitTransaction();
            }
        } catch (err) {
            await client_session.abortTransaction();
            throw err;
        } finally {
            await client_session.endSession();
        }

        res.status(200).send({
            request_status: 'success'
        })
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