const fs = require('fs');
const path = require('path');
const pdfParse = require('pdf-parse');
const grader = require('./services/grader');

async function testGrading() {
    try {
        const filePath = path.join(__dirname, 'LAB8.pdf');
        console.log('Reading PDF...');
        const dataBuffer = fs.readFileSync(filePath);
        const data = await pdfParse(dataBuffer);

        console.log('Sending to AI for full grading (This might take a while)...');
        console.time('GradingTime');
        const result = await grader.gradeSubmissionAI(data.text);
        console.timeEnd('GradingTime');

        console.log(`\nScore: ${result.totalScore} / ${result.maxScore}`);

        if (result.incorrect && result.incorrect.length > 0) {
            console.log('\n--- First 3 Incorrect Answers ---');
            result.incorrect.slice(0, 3).forEach(item => {
                console.log(`Q${item.question} (Part ${item.part})`);
                console.log(`Expected: ${item.expected}`);
                console.log(`Student:  ${item.student}`);
                console.log(`Reason/Feedback:   ${item.aiFeedback || item.reason}\n`);
            });
        } else {
            console.log('\nAll correct! 100%');
        }
    } catch (e) {
        console.error('Error:', e);
    }
}

testGrading();
