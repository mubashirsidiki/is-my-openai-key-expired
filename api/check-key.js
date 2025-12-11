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
            return res.status(200).json({ 
                message: 'Your OpenAI key is valid and working!',
                valid: true 
            });
        }

        // Handle different error cases
        if (openaiResponse.status === 401) {
            return res.status(401).json({ 
                error: 'Your API key is invalid or expired. Please check your key and try again.' 
            });
        }

        if (openaiResponse.status === 429) {
            return res.status(429).json({ 
                error: 'Rate limit exceeded. Please try again later.' 
            });
        }

        if (openaiResponse.status === 403) {
            return res.status(403).json({ 
                error: 'Access forbidden. Your API key may not have the required permissions.' 
            });
        }

        // Handle other API errors
        const errorMessage = data.error?.message || data.error?.code || 'Unknown error occurred';
        return res.status(openaiResponse.status).json({ 
            error: `OpenAI API error: ${errorMessage}` 
        });

    } catch (error) {
        // Handle network errors or other exceptions
        console.error('Error checking API key:', error);
        return res.status(500).json({ 
            error: 'Failed to connect to OpenAI API. Please check your internet connection and try again.' 
        });
    }
}

