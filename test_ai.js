const axios = require('axios');

async function testAI() {
    try {
        console.log('Sending request to AI...');
        const response = await axios.post('http://10.80.39.41:11941/api/chat', {
            model: "qwen3.6:35b",
            messages: [
                { role: "system", content: "You are a helpful assistant." },
                { role: "user", content: "Say hello!" }
            ],
            stream: false
        });
        console.log('Response status:', response.status);
        console.log('Response data:', JSON.stringify(response.data, null, 2));
    } catch (error) {
        if (error.response) {
            console.error('Server error:', error.response.status, error.response.data);
        } else {
            console.error('Network error:', error.message);
        }
    }
}

testAI();
