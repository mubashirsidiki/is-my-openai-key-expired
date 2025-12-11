export default async function handler(req, res) {
    // Only allow POST requests
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { key } = req.body;

    // Validate input
    if (!key || typeof key !== 'string') {
        return res.status(400).json({ error: 'API key is required' });
    }

    if (!key.startsWith('sk-')) {
        return res.status(400).json({ error: 'Invalid API key format. OpenAI keys start with "sk-"' });
    }

    try {
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
            
            return res.status(200).json({ 
                message: responseText,
                success: true 
            });
        }

        // Handle errors
        if (openaiResponse.status === 401) {
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
                return res.status(429).json({ 
                    error: 'Your API key is valid, but your account has no credits/quota remaining. Please add credits to your OpenAI account.',
                    errorType: 'quota_exceeded'
                });
            } else {
                return res.status(429).json({ 
                    error: 'Rate limit exceeded. Please try again later.',
                    errorType: 'rate_limit'
                });
            }
        }

        const errorMessage = data.error?.message || data.error?.code || 'Unknown error occurred';
        
        return res.status(openaiResponse.status).json({ 
            error: `OpenAI API error: ${errorMessage}`,
            errorType: 'other'
        });

    } catch (error) {
        console.error('Error in chat completion:', error);
        return res.status(500).json({ 
            error: 'Failed to connect to OpenAI API. Please check your internet connection and try again.' 
        });
    }
}

