const bcrypt = require('bcrypt');
const User = require('../models/Models').User;
const { CustomError } = require('../middleware/errorhandle');

const register = async(req, res, next) => {
    // Register logic here
    try {
        const { new_username, new_encoded_pw } = req.body;

        //check if username is already taken
        const user = await User.findOne({ username: new_username });
        if (user) throw new CustomError("Username already exists", 400);

        //hashed password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(new_encoded_pw, salt);

        //create new user and store in database
        const newUser = new User({
            username: new_username,
            password: hashedPassword
        });
        await newUser.save();

        //response
        res.status(200).send({
            message: "User created successfully",
            request_status: "successful",
            user: newUser
        });
    } catch (e) {
        next(e)
    }
};

const getUserById = async(id) => {
    try {
        const user = await User.findById(id);
        if (!user) {
            throw new CustomError("User not found", 404)
        }
        return user
    } catch (e) {
        throw e;
    }
};

const getUser = async(req, res, next) => {
    // Get user logic here
    try {
        const { id } = req.params;
        const user = await getUserById(id);
        res.status(200).send({
            request_status: "successful",
            user: user
        });
    } catch (e) {
        next(e)
    }
}

const updateUserInfo = async(req, res, next) => {
    try {
        //get user from database
        const { id } = req.params;
        const user = await getUserById(id);

        //update user information
        const { height, weight, gender, dateOfBirth, login_cred } = req.body;
        user.information.height = height || user.information.height;
        user.information.weight = weight || user.information.weight;
        user.information.gender = gender || user.information.gender;
        user.information.dateOfBirth = dateOfBirth || user.information.dateOfBirth;
        user.username = user.username || login_cred.username;

        if (login_cred !== undefined && login_cred.password !== undefined) {
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(login_cred.password, salt);
            user.password = hashedPassword;
        }

        //save change to database
        try {
            await user.save();
        } catch (e) {
            throw new CustomError("Bad Request", 400);
        }

        res.status(200).send({
            request_status: "successful",
            user: user
        });

    } catch (e) {
        next(e)
    }
}

const userController = {
    register,
    getUser,
    getUserById,
    updateUserInfo
};

module.exports = userController;