const fs = require('fs');
const path = require('path');
const { User } = require('../models/Models');
const { CustomError } = require('../middleware/errorhandle');

const removeFile = async(filePath) => {
    try {
        fs.unlinkSync(path.join(__dirname, filePath));
    } catch (e) {
        console.log(e)
    }
}

const getUserById = async(id, options = {}) => {
    try {
        const user = await User.findById(id).select(options);
        if (!user) {
            throw new CustomError("User not found", 404)
        }
        return user;
    } catch (e) {
        throw new CustomError("User not found", 404)
    }
}

const checkUserPermission = async(id, permission_level_required) => {
    try {
        const user = await getUserById(id);
        if (user.Permission_level < permission_level_required) {
            throw new CustomError("Permission denied", 403);
        }
    } catch (e) {
        throw e;
    }
}

const validateRequestBody = async(joiSchema, body = {}) => {
    try {
        const validate = await joiSchema.validateAsync(body);
        return validate;
    } catch (err) {
        throw new CustomError(err.details[0].message, 400);
    }
}

const helper = {
    removeFile,
    getUserById,
    checkUserPermission,
    validateRequestBody
}

module.exports = helper