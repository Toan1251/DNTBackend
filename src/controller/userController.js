const bcrypt = require('bcrypt');
const User = require('../models/Models').User;
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
            request_status: "successful",
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
        const user = await getUserById(id, { password: 0 });
        res.status(200).send({
            request_status: "successful",
            user: user
        });
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
        password: joi.string().min(4),
        verify_token: joi.string()
    })
    try {
        //get user from database
        const { id } = req.params;
        const user = await getUserById(id);

        //validate input
        const { height, weight, gender, dateOfBirth, password } = await validateRequestBody(userInfoSchema, req.body);
        console.log()

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
                }
            })
        } catch (e) {
            throw new CustomError("Bad Request", 400);
        }

        //ignore password field when update user information
        const updatedUser = await getUserById(id, { password: 0 })

        //response
        res.status(200).send({
            request_status: "successful",
            user: updatedUser
        });

    } catch (e) {
        next(e)
    }
}

const userController = {
    register,
    getUser,
    updateUserInfo
};

module.exports = userController;