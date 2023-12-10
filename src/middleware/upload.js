const multer = require('multer');

// get random number to avoid same filename
const time = () => {
    return Math.floor(new Date().getTime() / 1000)
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, './public')
    },
    filename: (req, file, cb) => {
        console.log(file)
        let filename = time() + "_" + file.originalname
        cb(null, filename)
    }
})

const imageFilter = (req, file, cb) => {
    if (!file.originalname.match(/\.(jpg|jpeg|png|gif|jfif)$/)) {
        req.fileValidationError = 'Only image files are allowed';
        return cb(new Error('Only image files are allowed'), false)
    }
    cb(null, true)
}

const multerUpload = multer({
    storage: storage,
    fileFilter: imageFilter,
})

module.exports = multerUpload;