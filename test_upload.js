const fs = require('fs');
const path = require('path');
const axios = require('axios');
const FormData = require('form-data');

async function testUpload() {
    try {
        const filePath = path.join(__dirname, 'LAB8.pdf');
        
        const form = new FormData();
        form.append('file', fs.createReadStream(filePath));
        
        console.log('Uploading LAB8.pdf...');
        
        const response = await axios.post('http://localhost:3000/api/upload', form, {
            headers: form.getHeaders(),
            timeout: 300000 // 5 minutes just in case
        });
        
        const data = response.data;
        console.log(`Total Score: ${data.totalScore} / ${data.maxScore}`);
        console.log(`Correct: ${data.correct.length}`);
        console.log(`Incorrect: ${data.incorrect.length}`);
        
        if (data.incorrect.length > 0) {
            console.log('\n--- Sample AI Feedback for first incorrect answer ---');
            console.log('Q:', data.incorrect[0].question);
            console.log('Expected:', data.incorrect[0].expected);
            console.log('Student:', data.incorrect[0].student);
            console.log('AI Feedback:', data.incorrect[0].aiFeedback);
        }
        
    } catch (error) {
        if (error.response) {
            console.error('Server error:', error.response.data);
        } else {
            console.error('Error:', error.message);
        }
    }
}

testUpload();
