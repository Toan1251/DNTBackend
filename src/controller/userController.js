const bcrypt = require('bcrypt');
const User = require('../models/Models').User;


const register = async(req, res) => {
    // Register logic here
    try {
        const { new_username, new_encoded_pw } = req.body;
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(new_encoded_pw, salt);

        const newUser = new User({
            username: new_username,
            password: hashedPassword
        });

        await newUser.save();
        res.status(200).send({
            message: "User created successfully",
            registering_status: "successful",
            user: newUser
        });
    } catch (e) {
        res.status(500).send({
            message: "Internal server error",
            registering_status: "failed",
            error: e
        });
    }
};

const getUserById = async(id) => {
    try {
        const user = await User.findById(id);
        return user
    } catch (e) {
        throw e;
    }
};

const getUser = async(req, res) => {
    // Get user logic here
    try {
        const { id } = req.params;
        const user = await getUserById(id);
        res.status(200).send({
            fetching_status: "successful",
            user: user
        });
    } catch (e) {
        res.status(500).send({
            fetching_status: "failed",
            error: e
        });
    }
}

const updateUserInfo = async(req, res) => {
    try {
        const { id } = req.params;
        const user = await getUserById(id);

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

        await user.save();

        res.status(200).send({
            updating_status: "successful",
            user: user
        });

    } catch (e) {
        res.status(500).send({
            updating_status: "failed",
            error: e
        });
    }
}

const userController = {
    register,
    getUser,
    updateUserInfo
};

module.exports = userController;