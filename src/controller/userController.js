const bcrypt = require('bcrypt');
const { User, UserGroceryMap, UserMealMap, Grocery } = require('../models/Models');
const { CustomError } = require('../middleware/errorhandle');
const { user_gender } = require('../config/constants')
const { getUserById, validateRequestBody } = require('../utils/helper')
const joi = require('joi');

const register = async(req, res, next) => {
    // Register logic here
    const bodySchema = joi.object({
        username: joi.string().alphanum().min(4).max(32).required(),
        password: joi.string().min(4).required(),
    })
    try {
        //validate request body
        const { username, password } = await validateRequestBody(bodySchema, req.body)

        //check if username is already taken
        const user = await User.findOne({ username: username });
        if (user) throw new CustomError("Username already exists", 400);

        //hashed password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        //create new user and store in database
        const newUser = new User({
            username: username,
            password: hashedPassword
        });
        await newUser.save();

        //response
        res.status(200).send({
            request_status: "success",
            user_id: newUser._id
        });
    } catch (e) {
        next(e)
    }
};

const getUser = async(req, res, next) => {
    // Get user logic here
    try {
        const { id } = req.params;
        const user = await getUserById(id);
        res.status(200).send({
            request_status: "success",
            user: user
        });
    } catch (e) {
        next(e)
    }
}

const loadUserData = async(req, res, next) => {
    try {
        let user = await User.aggregate([{
            $match: {
                _id: req.user._id
            }
        }, {
            $project: {
                _id: 1,
            }
        }, {
            $lookup: {
                from: "usergrocerymaps",
                localField: "_id",
                foreignField: "user",
                as: "usergrocerymap"
            }
        }, {
            $unwind: '$usergrocerymap'
        }, {
            $lookup: {
                from: "groceries",
                localField: "usergrocerymap.grocery",
                foreignField: "_id",
                as: "grocery"
            }
        }, {
            $unwind: '$grocery'
        }, {
            $project: {
                '_id': 1,
                'grocery._id': 1,
                'grocery.name': 1,
                'grocery.image_path': 1,
                'grocery.unit': 1,
                'grocery.kcal_per_unit': 1,
                'usergrocerymap._id': 1,
                'usergrocerymap.amount': 1,
                'usergrocerymap.expiresDate': 1,
                'usergrocerymap.isInBuyingList': 1,
            }
        }])

        const groceries = user.map(item => {
            return {
                _id: item.grocery._id,
                name: item.grocery.name,
                image_path: item.grocery.image_path,
                unit: item.grocery.unit,
                kcal_per_unit: item.grocery.kcal_per_unit,
                amount: item.usergrocerymap.amount,
                expiresDate: item.usergrocerymap.expiresDate,
                isInBuyingList: item.usergrocerymap.isInBuyingList,
                UserGroceryMap_id: item.usergrocerymap._id
            }
        })

        user = await User.aggregate([{
            $match: {
                _id: req.user._id
            }
        }, {
            $project: {
                username: 1,
                information: 1,
                _id: 1,
            }
        }, {
            $lookup: {
                from: 'usermealmaps',
                localField: '_id',
                foreignField: 'user',
                as: 'usermealmap'
            }
        }, {
            $unwind: '$usermealmap'
        }, {
            $lookup: {
                from: 'meals',
                localField: 'usermealmap.meal',
                foreignField: '_id',
                as: 'meal'
            }
        }, {
            $unwind: '$meal'
        }, {
            $project: {
                '_id': 1,
                'username': 1,
                'information': 1,
                'meal._id': 1,
                'meal.name': 1,
                'meal.total_time_cook': 1,
                'meal.total_kcal': 1,
                'usermealmap._id': 1,
                'usermealmap.schedules': 1
            }
        }])

        const meals = user.map(item => {
            return {
                _id: item.meal._id,
                name: item.meal.name,
                total_time_cook: item.meal.total_time_cook,
                total_kcal: item.meal.total_kcal,
                schedules: item.usermealmap.schedules,
                UserMealMap_id: item.usermealmap._id
            }
        })

        res.status(200).send({
            request_status: "success",
            user: {
                _id: user[0]._id,
                username: user[0].username,
                information: user[0].information,
                groceries: groceries,
                meals: meals
            }
        })

    } catch (e) {
        next(e)
    }
}

const updateUserInfo = async(req, res, next) => {
    const userInfoSchema = joi.object({
        height: joi.number().min(0).max(300),
        weight: joi.number().min(0).max(300),
        gender: joi.string().valid(...user_gender),
        dateOfBirth: joi.date().max('now'),
        goal: joi.number().positive(),
        password: joi.string().min(4),
        verify_token: joi.string()
    })
    try {
        //get user from database
        const { id } = req.params;
        const user = await getUserById(id);

        //validate input
        const { height, weight, gender, dateOfBirth, goal, password } = await validateRequestBody(userInfoSchema, req.body);
        console.log()

        //cheking permission
        if (user._id.toString() !== req.user._id.toString()) throw new CustomError("Permission denied", 403);

        //change user information
        let hashedPassword;
        if (password) {
            const salt = await bcrypt.genSalt(10);
            hashedPassword = await bcrypt.hash(password, salt);
        }

        //save change to database
        try {
            await user.updateOne({
                password: password ? hashedPassword : user.password,
                information: {
                    height: height || user.information.height,
                    weight: weight || user.information.weight,
                    gender: gender || user.information.gender,
                    dateOfBirth: dateOfBirth || user.information.dateOfBirth,
                    goal: goal || user.information.goal,
                }
            })
        } catch (e) {
            throw new CustomError("Bad Request", 400);
        }

        //ignore password field when update user information
        const updatedUser = await getUserById(id, { password: 0 })

        //response
        res.status(200).send({
            request_status: "success",
            user: updatedUser
        });

    } catch (e) {
        next(e)
    }
}

const userController = {
    register,
    getUser,
    loadUserData,
    updateUserInfo
};

module.exports = userController;