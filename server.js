require('dotenv').config();
const express = require('express');
const multer = require('multer');
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');
const axios = require('axios');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Configure Multer for file upload
const upload = multer({ dest: 'uploads/' });

// API Constants
const BASE_URL = 'http://10.80.39.41:11941';
const QWEN_API_URL = `${BASE_URL}/api/chat`;
const MODEL_NAME = 'qwen3.6:35b';

// Helper function to extract text from file
async function extractTextFromFile(filePath, mimeType) {
    try {
        if (mimeType === 'application/pdf') {
            const dataBuffer = fs.readFileSync(filePath);
            const data = await pdfParse(dataBuffer);
            return data.text;
        } else if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || mimeType === 'application/msword') {
            const result = await mammoth.extractRawText({ path: filePath });
            return result.value;
        } else {
            throw new Error('Unsupported file type');
        }
    } catch (error) {
        console.error('Error extracting text:', error);
        throw new Error('Failed to extract text from file');
    }
}

app.post('/api/grade', upload.single('document'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const filePath = req.file.path;
        const mimeType = req.file.mimetype;

        // 1. Extract text
        const documentText = await extractTextFromFile(filePath, mimeType);

        // Clean up the uploaded file
        fs.unlinkSync(filePath);



        // 2. Build Prompt
        let systemPrompt = `You are an expert, highly accurate grading assistant.
Your task is to grade a student's document based on the provided content.
IMPORTANT GUIDELINE FOR GRADING:
- Do not be strict about formatting, blank lines, or spacing. Students might use multiple newlines (e.g., leaving 2-3 blank lines) before writing their answers.
- Focus strictly on the content, meaning, and correctness of their answers, ignoring any messy formatting or excessive whitespace.

You MUST output your result in strict JSON format. Do not include any other text, markdown formatting, or explanations outside the JSON object.
The JSON object must have the following structure:
{
  "score": "The total score as a fraction, e.g., '8/10' or '80/100'",
  "summary": "A brief summary of the student's performance, strengths, and areas for improvement (in Thai)",
  "wrong_summary": "A short text summarizing which questions were wrong, grouped by section. Format strictly as 'ตอนที่ 1\\nข้อ 5,8\\nตอนที่ 2\\nข้อ 3,5,7' (use \\n for newlines)",
  "mistakes": [
    {
      "question": "The original question or topic",
      "student_answer": "What the student wrote",
      "correct_answer": "The correct answer or expected concept",
      "explanation": "Why the student's answer is wrong or incomplete (in Thai)"
    }
  ]
}
If there are no mistakes, the "mistakes" array should be empty [].
Please respond in Thai language for the summary and explanation fields.
Make sure to properly escape any double quotes inside the string values.`;

        const userPrompt = `Here is the student's document content to grade:\n\n${documentText}`;

        // 3. Call Qwen API
        const response = await axios.post(QWEN_API_URL, {
            model: MODEL_NAME,
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userPrompt }
            ],
            format: "json",
            stream: false,
            options: {
                temperature: 0.0, // Set to 0 for maximum consistency
                seed: 42 // Fixed seed to ensure deterministic output
            }
        });

        // 4. Parse response
        let aiResponse = response.data.message.content;

        // Sometimes the AI might still wrap the JSON in markdown code blocks like ```json ... ```
        // Let's clean it up before parsing
        aiResponse = aiResponse.replace(/```json/g, '').replace(/```/g, '').trim();

        const resultJson = JSON.parse(aiResponse);

        res.json(resultJson);

    } catch (error) {
        console.error('Error grading document:', error.message);
        res.status(500).json({
            error: 'Failed to grade document. Please try again.',
            details: error.message
        });
    }
});

// Create uploads directory if it doesn't exist
if (!fs.existsSync('uploads')) {
    fs.mkdirSync('uploads');
}

app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
