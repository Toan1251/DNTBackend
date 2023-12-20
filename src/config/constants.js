const port = require('./config').PORT

const user_gender = ['male', 'female']

const grocery_unit = ['kg', 'grams', 'liter', 'ml', 'number', 'unit']


const static_path = `http://localhost:${port}/static/images/`

const constants = {
    user_gender,
    grocery_unit,
    static_path
}

module.exports = constants