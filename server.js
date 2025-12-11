const express = require('express');
const path = require('path');

const app = express();
const PORT = 5500;

// Middleware to parse JSON
app.use(express.json());

// Request logging middleware
app.use((req, res, next) => {
    const timestamp = new Date().toISOString();
    console.log('\n' + '═'.repeat(60));
    console.log(`📥 ${req.method} ${req.path}`);
    console.log(`🕐 ${timestamp}`);
    if (req.method === 'POST' && (req.path === '/api/check-key' || req.path === '/api/chat')) {
        const keyPreview = req.body.key ? `${req.body.key.substring(0, 7)}...` : 'No key';
        console.log(`🔑 Key: ${keyPreview}`);
    }
    console.log('─'.repeat(60));
    next();
});

// Serve static files
app.use(express.static(__dirname));

// API endpoint
app.post('/api/check-key', async (req, res) => {
    const { key } = req.body;

    // Validate input
    if (!key || typeof key !== 'string') {
        return res.status(400).json({ error: 'API key is required' });
    }

    if (!key.startsWith('sk-')) {
        return res.status(400).json({ error: 'Invalid API key format. OpenAI keys start with "sk-"' });
    }

    try {
        console.log('🌐 Calling OpenAI API...');
        
        // Call OpenAI API to check if the key is valid
        const openaiResponse = await fetch('https://api.openai.com/v1/models', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${key}`,
                'Content-Type': 'application/json',
            },
        });

        const data = await openaiResponse.json();

        if (openaiResponse.ok) {
            console.log('✅ Status: 200 OK');
            console.log('✨ Key is VALID and working!');
            console.log('═'.repeat(60) + '\n');
            
            return res.status(200).json({ 
                message: 'Your OpenAI key is valid and working!',
                valid: true 
            });
        }

        // Handle different error cases
        if (openaiResponse.status === 401) {
            console.log('❌ Status: 401 Unauthorized');
            console.log('🔒 Key is INVALID or EXPIRED');
            console.log('═'.repeat(60) + '\n');
            
            return res.status(401).json({ 
                error: 'Your API key is invalid or expired. Please check your key and try again.' 
            });
        }

        if (openaiResponse.status === 429) {
            console.log('⚠️  Status: 429 Rate Limit');
            console.log('⏱️  Rate limit exceeded');
            console.log('═'.repeat(60) + '\n');
            
            return res.status(429).json({ 
                error: 'Rate limit exceeded. Please try again later.' 
            });
        }

        if (openaiResponse.status === 403) {
            console.log('🚫 Status: 403 Forbidden');
            console.log('🔐 Access forbidden - insufficient permissions');
            console.log('═'.repeat(60) + '\n');
            
            return res.status(403).json({ 
                error: 'Access forbidden. Your API key may not have the required permissions.' 
            });
        }

        // Handle other API errors
        const errorMessage = data.error?.message || data.error?.code || 'Unknown error occurred';
        console.log(`❌ Status: ${openaiResponse.status}`);
        console.log(`⚠️  Error: ${errorMessage}`);
        console.log('═'.repeat(60) + '\n');
        
        return res.status(openaiResponse.status).json({ 
            error: `OpenAI API error: ${errorMessage}` 
        });

    } catch (error) {
        // Handle network errors or other exceptions
        console.log('💥 Network Error');
        console.log(`❌ ${error.message}`);
        console.log('═'.repeat(60) + '\n');
        
        return res.status(500).json({ 
            error: 'Failed to connect to OpenAI API. Please check your internet connection and try again.' 
        });
    }
});

// Chat completion endpoint
app.post('/api/chat', async (req, res) => {
    const { key } = req.body;

    // Validate input
    if (!key || typeof key !== 'string') {
        return res.status(400).json({ error: 'API key is required' });
    }

    if (!key.startsWith('sk-')) {
        return res.status(400).json({ error: 'Invalid API key format. OpenAI keys start with "sk-"' });
    }

    try {
        console.log('💬 Sending chat completion request...');
        console.log('📝 Message: "Hi, how are you?"');
        
        // Call OpenAI Chat Completion API
        const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${key}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: 'gpt-3.5-turbo',
                messages: [
                    {
                        role: 'user',
                        content: 'Hi, how are you?'
                    }
                ],
                max_tokens: 150
            }),
        });

        const data = await openaiResponse.json();

        if (openaiResponse.ok) {
            const responseText = data.choices[0]?.message?.content || 'No response';
            console.log('✅ Chat completion successful');
            console.log(`💬 Response: ${responseText.substring(0, 100)}...`);
            console.log('═'.repeat(60) + '\n');
            
            return res.status(200).json({ 
                message: responseText,
                success: true 
            });
        }

        // Handle errors
        if (openaiResponse.status === 401) {
            console.log('❌ Status: 401 Unauthorized');
            console.log('🔒 Key is INVALID or EXPIRED');
            console.log('═'.repeat(60) + '\n');
            
            return res.status(401).json({ 
                error: 'Your API key is invalid or expired.',
                errorType: 'invalid_key'
            });
        }

        // Handle 429 errors - distinguish between quota and rate limit
        if (openaiResponse.status === 429) {
            const errorMessage = data.error?.message || data.error?.code || 'Rate limit exceeded';
            const isQuotaError = errorMessage.toLowerCase().includes('quota') || 
                                errorMessage.toLowerCase().includes('billing') ||
                                errorMessage.toLowerCase().includes('exceeded your current quota');
            
            if (isQuotaError) {
                console.log('💰 Status: 429 Quota Exceeded');
                console.log('💳 Key is VALID but account has no credits/quota');
                console.log('═'.repeat(60) + '\n');
                
                return res.status(429).json({ 
                    error: 'Your API key is valid, but your account has no credits/quota remaining. Please add credits to your OpenAI account.',
                    errorType: 'quota_exceeded'
                });
            } else {
                console.log('⚠️  Status: 429 Rate Limit');
                console.log('⏱️  Rate limit exceeded');
                console.log('═'.repeat(60) + '\n');
                
                return res.status(429).json({ 
                    error: 'Rate limit exceeded. Please try again later.',
                    errorType: 'rate_limit'
                });
            }
        }

        const errorMessage = data.error?.message || data.error?.code || 'Unknown error occurred';
        console.log(`❌ Status: ${openaiResponse.status}`);
        console.log(`⚠️  Error: ${errorMessage}`);
        console.log('═'.repeat(60) + '\n');
        
        return res.status(openaiResponse.status).json({ 
            error: `OpenAI API error: ${errorMessage}`,
            errorType: 'other'
        });

    } catch (error) {
        console.log('💥 Network Error');
        console.log(`❌ ${error.message}`);
        console.log('═'.repeat(60) + '\n');
        
        return res.status(500).json({ 
            error: 'Failed to connect to OpenAI API. Please check your internet connection and try again.' 
        });
    }
});

app.listen(PORT, () => {
    console.log('\n' + '═'.repeat(60));
    console.log('🚀  OpenAI Key Checker Server');
    console.log('═'.repeat(60));
    console.log(`📍  Server running at http://localhost:${PORT}`);
    console.log(`🌐  Open in browser: http://127.0.0.1:${PORT}`);
    console.log('═'.repeat(60));
    console.log('💡  Press CTRL+C to stop the server');
    console.log('═'.repeat(60) + '\n');
});

