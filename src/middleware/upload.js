const multer = require('multer');
const path = require('path');
const { CustomError } = require('./errorhandle')

// get random number to avoid same filename
const time = () => {
    return Math.floor(new Date().getTime() / 1000)
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.join(__dirname, '/../../public/images'))
    },
    filename: (req, file, cb) => {
        let filename = time() + "_" + file.originalname
        cb(null, filename)
    }
})

const imageFilter = (req, file, cb) => {
    if (!file.originalname.match(/\.(jpg|jpeg|png|gif|jfif)$/)) {
        req.fileValidationError = 'Only image files are allowed';
        return cb(new CustomError('Only image files are allowed', 415), false)
    }
    cb(null, true)
}

const multerUpload = multer({
    storage: storage,
    fileFilter: imageFilter,
})

module.exports = multerUpload;