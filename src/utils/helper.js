const fs = require('fs');
const path = require('path');
const { User } = require('../models/Models');
const { CustomError } = require('../middleware/errorhandle');
const { populate } = require('../models/UserGroceryMap');

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

//query is a query object
const paginate = async(Model, selector = {}, {
    page = 1, //page
    limit = 5, //limit for a page
    field = {}, //field to select
    sort = {}, //sort method,
    populate = null
}) => {
    let p = parseInt(page),
        l = parseInt(limit);
    if (isNaN(p) || isNaN(l)) {
        throw new CustomError(`Invalid page or limit!`);
    }
    try {
        if (p < 1) throw new CustomError(`Invalid page number!`);
        if (l < 1) throw new CustomError(`Invalid limit number!`);
        let nextPage, prevPage
        if (p > 1) prevPage = p - 1;
        if (p * l < await Model.countDocuments(selector)) nextPage = p + 1;

        const result = await Model.find(selector).populate(populate).select(field).skip((page - 1) * limit).limit(limit).sort(sort).exec();
        return {
            result: result,
            nextPage: nextPage,
            prevPage: prevPage,
        }
    } catch (error) {
        throw error
    }
}

const helper = {
    removeFile,
    getUserById,
    checkUserPermission,
    validateRequestBody,
    paginate
}

module.exports = helper