const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

const removeFile = async(filePath) => {
    try {
        fs.unlinkSync(path.join(__dirname, filePath));
    } catch (e) {
        console.log(e)
    }
}

const transaction = async(callbacks = []) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        for (let callback of callbacks) {
            await callback(session);
        }
        await session.commitTransaction();
        session.endSession();
    } catch (e) {
        await session.abortTransaction();
        session.endSession();
        throw e;
    }
}

const helper = {
    removeFile,
}

module.exports = helper