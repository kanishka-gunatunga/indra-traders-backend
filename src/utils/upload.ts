// import multer from "multer";
// import path from "path";
// import fs from "fs";
//
// // Ensure upload directory exists
// const uploadDir = path.join(process.cwd(), "public/uploads");
// if (!fs.existsSync(uploadDir)) {
//     fs.mkdirSync(uploadDir, { recursive: true });
// }
//
// const storage = multer.diskStorage({
//     destination: function (req, file, cb) {
//         cb(null, "public/uploads/");
//     },
//     filename: function (req, file, cb) {
//         const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
//         cb(null, uniqueSuffix + path.extname(file.originalname));
//     },
// });
//
// export const uploadMiddleware = multer({
//     storage: storage,
//     limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
// });

import multer from "multer";

// We use memoryStorage so we don't try to write to the locked file system
const storage = multer.memoryStorage();

export const uploadMiddleware = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});