const fs = require('fs');
const pdfParse = require('pdf-parse');
const axios = require('axios');

const BASE_URL = 'http://10.80.39.41:11941';
const QWEN_API_URL = `${BASE_URL}/api/chat`;
const MODEL_NAME = 'qwen3.6:27b';

async function test() {
  try {
    console.log('Reading PDF...');
    const dataBuffer = fs.readFileSync('LAB8.pdf');
    const data = await pdfParse(dataBuffer);
    const documentText = data.text;

    const criteria = `ข้อที่นักเรียนทำผิดมีดังนี้:
ส่วนแรก: ข้อ 7, 45, 64, 65
ส่วนที่ 2: ข้อ 3, 6, 22
ให้ AI ทำการตรวจหาคำตอบของนักเรียนในข้อเหล่านี้ และอธิบายว่าผิดอย่างไร โดยจำลองข้อมูลตามโจทย์และคำตอบที่น่าจะผิด`;

    let systemPrompt = `You are an expert, highly accurate grading assistant.
Your task is to grade a student's document based on the provided content.
IMPORTANT GUIDELINE FOR GRADING:
- Do not be strict about formatting, blank lines, or spacing.
- Focus strictly on the content, meaning, and correctness of their answers.

Here is the Answer Key / Information for grading:
${criteria}

You MUST output your result in strict JSON format.
{
  "score": "The total score as a fraction",
  "summary": "A brief summary of the student's performance (in Thai)",
  "mistakes": [
    {
      "question": "The original question or topic (e.g. ส่วนแรก ข้อ 7)",
      "student_answer": "What the student wrote",
      "correct_answer": "The correct answer or expected concept",
      "explanation": "Why the student's answer is wrong or incomplete (in Thai)"
    }
  ]
}`;

    const userPrompt = `Here is the student's document content to grade:\n\n${documentText}`;

    console.log('Sending request to Qwen API...');
    const response = await axios.post(QWEN_API_URL, {
      model: MODEL_NAME,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      stream: false,
      options: {
        temperature: 0.2
      }
    });

    let aiResponse = response.data.message.content;
    aiResponse = aiResponse.replace(/```json/g, '').replace(/```/g, '').trim();

    console.log('Result JSON:');
    console.log(JSON.stringify(JSON.parse(aiResponse), null, 2));
  } catch (err) {
    console.error(err.message);
  }
}

test();
