const fs = require('fs');
const path = require('path');
const axios = require('axios');

const ansPath = path.join(__dirname, '../ans.json');
const BASE_URL = 'http://10.80.39.42:11434';
const QWEN_API_URL = `${BASE_URL}/api/chat`;

// Read the answers from ans.json
const getAnswers = () => {
    try {
        const rawData = fs.readFileSync(ansPath, 'utf8');
        return JSON.parse(rawData);
    } catch (error) {
        console.error('Error reading ans.json:', error);
        return null;
    }
};

const gradeSubmissionAI = async (studentText) => {
    const answers = getAnswers();
    if (!answers) {
        throw new Error('Answer key not found or invalid');
    }

    const truncatedStudentText = studentText;

    const prompt = `คุณคือผู้เชี่ยวชาญด้านการตรวจข้อสอบ Java 
คุณจะได้รับ "เฉลย (Rubric)" และ "คำตอบของนักศึกษา" ที่สกัดมาจากไฟล์ PDF (ซึ่งอาจมีการเว้นบรรทัดหรือข้อความปนกันเนื่องจากตาราง)
งานของคุณคือตรวจคำตอบอย่างละเอียดทีละข้อตามกฎต่อไปนี้อย่างเคร่งครัด:
1. เทียบคำตอบของนักศึกษากับเฉลย ทั้ง 96 ข้อ (ส่วนที่ 1 มี 66 ข้อ, ส่วนที่ 2 มี 30 ข้อ)
2. กฎการให้คะแนน (สำคัญมาก):
   - ในไฟล์ PDF คำตอบของนักศึกษาจะปะปนอยู่กับโค้ดโจทย์ ให้คุณแยกแยะให้ออกว่าส่วนไหนคือ "คำตอบ" และตรวจเฉพาะส่วนที่เป็นคำตอบเท่านั้น
   - อนุโลมเรื่องการเว้นวรรค, การขึ้นบรรทัดใหม่, ตัวพิมพ์เล็ก/พิมพ์ใหญ่
   - คำตอบของนักศึกษาจะต้องตรงกับเฉลยในด้าน "ความหมาย" และ "ผลลัพธ์" ห้ามมีผลลัพธ์หรือเงื่อนไขที่ผิดแปลกไปจากเฉลย (เช่น ถ้าเฉลยคือ A และ D ถ้านักศึกษาตอบ A, B, D ถือว่า **ผิด** ทันที เพราะมี B เกินมา)
   - หากโจทย์มีเรื่องเครื่องหมาย Operator (เช่น >, <, >=, <=) ต้องตรวจสอบให้ถูกต้องเป๊ะตามหลักคณิตศาสตร์ ห้ามอนุโลมเด็ดขาด
   - หากโจทย์ใช้คำสั่ง switch-case และลืมใส่คำสั่ง break จนทำให้ผลลัพธ์ไหล (Fall-through) ไปแสดงผลในเคสอื่นด้วย ให้ถือว่า **ผิด** ทันที (เช่น ตอบแค่ Two แต่เฉลยต้องมี Three และ Four ด้วย)
   - หากในเฉลยมีวงเล็บคำอธิบายของอาจารย์ (เช่น "(โจทย์พิมพ์ผิดเป็น score)") ให้นำมาเป็นข้อมูลอ้างอิงเฉยๆ ห้ามนำข้อความในวงเล็บไปตรวจแบบตัวต่อตัวกับคำตอบของนักศึกษา
   - หากคำตอบไม่มีเค้าโครงความถูกต้อง หรือตอบไม่ตรงคำถาม ให้ถือว่า **ผิด**
3. การระบุข้อ:
   - จับคู่หมายเลขข้อใน PDF กับเฉลยให้ตรงกันเป๊ะๆ ทั้ง 96 ข้อ อย่าข้ามข้อเด็ดขาด
4. สรุปผลคะแนนรวมอย่างแม่นยำ และระบุข้อที่ตอบ "ผิด" หรือ "ไม่พบคำตอบ" พร้อมคำอธิบายสั้นๆ (aiFeedback) ชี้แนะแนวทางที่ถูกต้อง

!!! บังคับ: คุณต้องตอบกลับมาเป็นรูปแบบ JSON เท่านั้น ห้ามมีข้อความอื่นปน (ไม่ต้องมีเครื่องหมาย markdown \`\`\`json) โครงสร้างดังนี้:
{
  "totalScore": 89,
  "maxScore": 96,
  "correct": [
    { "part": 1, "question": 1 }
  ],
  "incorrect": [
    {
      "part": 1,
      "question": 2,
      "expected": "End",
      "student": "student's wrong answer",
      "reason": "คำอธิบายเหตุผลแบบสั้นๆ",
      "aiFeedback": "คำแนะนำแบบสั้นๆ ว่าทำไมถึงผิดและที่ถูกคืออะไร"
    }
  ]
}

--- ข้อมูลเฉลย (Rubric) ---
${JSON.stringify(answers, null, 2)}

--- คำตอบของนักศึกษา ---
${truncatedStudentText}
`;

    try {
        console.log('Sending full document to AI for grading...');
        const response = await axios.post(QWEN_API_URL, {
            model: "qwen3.6:35b",
            messages: [
                { role: "system", content: "You are an expert grading system. You only output strict JSON matching the requested format. Do NOT wrap with markdown blocks. Do NOT output thinking steps." },
                { role: "user", content: prompt }
            ],
            stream: false,
            options: {
                temperature: 0.0,
                top_p: 0.1,
                num_predict: 8000,
                num_ctx: 131072
            }
        }, {
            timeout: 600000 // 10 minutes timeout
        });

        if (response.data && response.data.message) {
            let content = response.data.message.content || "";
            if (!content) {
                console.log("Warning: Content is empty. Thinking process:", response.data.message.thinking);
                throw new Error("AI รันสำเร็จแต่ไม่ได้ให้ผลลัพธ์ (อาจจะจำกัด token ไม่พอ)");
            }

            content = content.trim();

            // Try to clean up markdown if the AI mistakenly included it
            if (content.startsWith('```json')) {
                content = content.replace(/^```json/, '').replace(/```$/, '').trim();
            } else if (content.startsWith('```')) {
                content = content.replace(/^```/, '').replace(/```$/, '').trim();
            }

            try {
                const parsedJSON = JSON.parse(content);
                // ดึงชื่อโมเดลที่รันจริงๆ จาก API Response แล้วแนบกลับไป
                parsedJSON.modelUsed = response.data.model;
                return parsedJSON;
            } catch (parseError) {
                console.error("AI returned invalid JSON:", content);
                throw new Error("AI ตอบกลับมาเป็นรูปแบบที่โปรแกรมไม่สามารถอ่านได้ (Invalid JSON)");
            }
        } else {
            console.log("Unexpected AI response:", response.data);
            throw new Error("AI ไม่ส่งผลลัพธ์กลับมา");
        }
    } catch (error) {
        console.error('Error in AI grading:', error.message);
        throw error;
    }
};

module.exports = {
    gradeSubmissionAI
};
