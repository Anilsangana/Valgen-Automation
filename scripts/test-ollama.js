const http = require('http');

const body = JSON.stringify({
    model: 'qwen2.5:7b', // switched to Qwen model
    prompt: 'Say hello in one sentence',
    stream: false
});

const options = {
    hostname: 'localhost',
    port: 11434,
    path: '/api/generate',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body)
    }
};

console.log('Making request to Ollama API...');

const req = http.request(options, (res) => {
    console.log('Status:', res.statusCode);
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
        console.log('Response (truncated):', data.substring(0, 500));
        try {
            const parsed = JSON.parse(data);
            if (parsed.error) {
                console.log('API ERROR:', parsed.error);
            } else {
                const text = parsed?.response;
                console.log('SUCCESS! Text:', text);
            }
        } catch (e) {
            console.log('Parse error:', e.message);
        }
    });
});

req.on('error', (e) => console.error('Request error:', e.message, e.code));
req.setTimeout(15000, () => { console.error('TIMEOUT!'); req.destroy(); });
req.write(body);
req.end();
