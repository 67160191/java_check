const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');
const grader = require('../services/grader');

const router = express.Router();

// Configure multer for temporary file storage
const upload = multer({ dest: 'uploads/' });

// Grading logic endpoint
router.post('/upload', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const filePath = req.file.path;
        const ext = path.extname(req.file.originalname).toLowerCase();
        let extractedText = '';

        if (ext === '.pdf') {
            const dataBuffer = fs.readFileSync(filePath);
            const data = await pdfParse(dataBuffer);
            extractedText = data.text;
        } else if (ext === '.docx') {
            const result = await mammoth.extractRawText({ path: filePath });
            extractedText = result.value;
        } else {
            fs.unlinkSync(filePath);
            return res.status(400).json({ error: 'Unsupported file format. Please upload PDF or DOCX.' });
        }

        // Clean up the uploaded file
        fs.unlinkSync(filePath);

        // Grade the extracted text using 100% AI
        const gradingResult = await grader.gradeSubmissionAI(extractedText);

        res.json(gradingResult);

    } catch (error) {
        console.error('Error processing upload:', error);
        res.status(500).json({ error: 'Failed to process document', details: error.message });
    }
});

module.exports = router;
