const express = require("express");
const multer = require("multer");
const fs = require("fs");
const crypto = require("crypto");
const mime = require("mime-types");
const path = require("node:path");

const app = express();
const PORT = 3000;

const STORAGE_ROOT = "/var/www/storage";
const TMP_DIR = "/root/tmp";

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

// const ALLOWED_MIME = new Set([
//     "image/png",
//     "image/jpeg",
//     "image/webp",
//     "video/mp4",
//     "application/pdf",
//     "text/plain",
//     "application/zip"
// ]); // uncomment this to enable mime checking

const ALLOWED_MIME = null; // uncomment this to disable mime checking

// ===== multer =====

const upload = multer({
    storage: multer.diskStorage({
        destination: (_, __, cb) => cb(null, TMP_DIR),
        filename: (_, __, cb) => cb(null, crypto.randomUUID())
    }),
    limits: { fileSize: MAX_FILE_SIZE }
});

// ===== upload endpoint =====

app.post("/upload", upload.single("file"), (req, res) => {
    try {
        if (!req.file)
            return res.status(400).json({ error: "No file uploaded" });

        if (ALLOWED_MIME && !ALLOWED_MIME.has(req.file.mimetype)) {
            fs.unlinkSync(req.file.path);
            return res.status(400).json({ error: "Unsupported MIME type" });
        }

        const ext = mime.extension(req.file.mimetype);
        const filename = crypto.randomUUID() + "." + ext;

        fs.mkdirSync(STORAGE_ROOT, { recursive: true });

        const finalPath = path.join(STORAGE_ROOT, filename);

        fs.renameSync(req.file.path, finalPath);

        return res.json({
            url: `/storage/${filename}`,
            name: req.file.originalname,
            size: req.file.size,
            mime: req.file.mimetype
        });

    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: "Upload failed" });
    }
});

// ===== health =====

app.get("/health", (_, res) => {
    res.json({ status: "ok" });
});

app.listen(PORT, () => {
    console.log("File backend running on port", PORT);
});