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

        // --- DEMO MOCK FOR LAB8.pdf ---
        if (req.file.originalname.includes('LAB8')) {
            return res.json({
                "score": "89/96",
                "summary": "นักศึกษาทำแบบฝึกหัดได้ดีมากในภาพรวม แต่ยังมีความเข้าใจคลาดเคลื่อนเล็กน้อยเกี่ยวกับการเขียนเงื่อนไข (Condition) ในบางข้อ",
                "mistakes": [
                    {
                        "question": "ส่วนแรก ข้อ 7",
                        "student_answer": "score > 50",
                        "correct_answer": "score >= 50",
                        "explanation": "เงื่อนไขไม่ตรงตามโจทย์ที่กำหนดให้ใช้มากกว่าหรือเท่ากับ"
                    },
                    {
                        "question": "ส่วนแรก ข้อ 45",
                        "student_answer": "age >= 18",
                        "correct_answer": "age > 18",
                        "explanation": "โจทย์ระบุว่าต้องอายุเกิน 18 ปี ไม่รวม 18 พอดี"
                    },
                    {
                        "question": "ส่วนแรก ข้อ 64",
                        "student_answer": "if (x = 10)",
                        "correct_answer": "if (x == 10)",
                        "explanation": "ใช้เครื่องหมาย = (กำหนดค่า) แทนที่จะเป็น == (เปรียบเทียบ)"
                    },
                    {
                        "question": "ส่วนแรก ข้อ 65",
                        "student_answer": "while(true)",
                        "correct_answer": "while(condition)",
                        "explanation": "ทำให้เกิด Infinite Loop โดยไม่ได้ตั้งใจ"
                    },
                    {
                        "question": "ส่วนที่ 2 ข้อ 3",
                        "student_answer": "System.out.print(\"Hello\");",
                        "correct_answer": "System.out.println(\"Hello\");",
                        "explanation": "โจทย์ต้องการให้ขึ้นบรรทัดใหม่หลังแสดงผล"
                    },
                    {
                        "question": "ส่วนที่ 2 ข้อ 6",
                        "student_answer": "int[] arr = new int[5]; arr[5] = 10;",
                        "correct_answer": "arr[4] = 10;",
                        "explanation": "อ้างอิง Array Index Out of Bounds (Index สูงสุดคือ 4)"
                    },
                    {
                        "question": "ส่วนที่ 2 ข้อ 22",
                        "student_answer": "public void Main(String[] args)",
                        "correct_answer": "public static void main(String[] args)",
                        "explanation": "Method main ต้องเป็น static และ m ตัวเล็กเสมอ"
                    }
                ]
            });
        }
        // ------------------------------

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
Please respond in Thai language for the summary and explanation fields.`;

        const userPrompt = `Here is the student's document content to grade:\n\n${documentText}`;

        // 3. Call Qwen API
        const response = await axios.post(QWEN_API_URL, {
            model: MODEL_NAME,
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userPrompt }
            ],
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
