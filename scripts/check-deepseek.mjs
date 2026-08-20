async function checkDeepSeek() {
    const apiKey = process.env.DEEPSEEK_API_KEY || process.env.VITE_DEEPSEEK_API_KEY;
    if (!apiKey) {
        console.error('DeepSeek check failed: configure DEEPSEEK_API_KEY in .env.');
        return 1;
    }
    const response = await fetch('https://api.deepseek.com/chat/completions', {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            model: 'deepseek-v4-flash',
            messages: [{ role: 'user', content: 'Reply with OK.' }],
            max_tokens: 8,
        }),
    });
    if (!response.ok) {
        console.error(`DeepSeek check failed: HTTP ${response.status}.`);
        return 1;
    }
    const data = await response.json();
    if (!data.choices?.[0]?.message) {
        console.error('DeepSeek check failed: invalid API response.');
        return 1;
    }
    console.log('DeepSeek check passed: API key and deepseek-v4-flash are ready.');
    return 0;
}
process.exitCode = await checkDeepSeek();
