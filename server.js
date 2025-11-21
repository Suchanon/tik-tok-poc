import 'dotenv/config';
import express from 'express';
import axios from 'axios';
import cookieParser from 'cookie-parser';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cookieParser());

// Configuration
const CLIENT_KEY = process.env.TIKTOK_CLIENT_KEY;
const CLIENT_SECRET = process.env.TIKTOK_CLIENT_SECRET;
const REDIRECT_URI = process.env.TIKTOK_REDIRECT_URI;

// Scopes based on POC_TIKTOK.md
const SCOPES = 'user.info.basic,user.info.profile,business.account.info.read';

app.get('/', (req, res) => {
    res.send('<h1>TikTok OAuth 2.0 POC</h1><a href="/auth/tiktok">Login with TikTok</a>');
});

// 1. Redirect to TikTok Authorize URL
app.get('/auth/tiktok', (req, res) => {
    const csrfState = Math.random().toString(36).substring(2);
    res.cookie('csrfState', csrfState, { maxAge: 60000 });

    let url = 'https://www.tiktok.com/v2/auth/authorize/';
    url += `?client_key=${CLIENT_KEY}`;
    url += `&scope=${SCOPES}`;
    url += `&response_type=code`;
    url += `&redirect_uri=${REDIRECT_URI}`;
    url += `&state=${csrfState}`;

    res.redirect(url);
});

// 2. Callback to exchange code for token
app.get('/auth/tiktok/callback', async (req, res) => {
    const { code, state } = req.query;
    const { csrfState } = req.cookies;

    if (!code) {
        return res.status(400).send('Error: No code provided');
    }

    if (state !== csrfState) {
        return res.status(403).send('Error: Invalid state');
    }

    try {
        const tokenEndpoint = 'https://open.tiktokapis.com/v2/oauth/token/';
        const params = new URLSearchParams();
        params.append('client_key', CLIENT_KEY);
        params.append('client_secret', CLIENT_SECRET);
        params.append('code', code);
        params.append('grant_type', 'authorization_code');
        params.append('redirect_uri', REDIRECT_URI);

        const response = await axios.post(tokenEndpoint, params, {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        });

        const { open_id, access_token, refresh_token, expires_in } = response.data;

        // In a real app, save these securely
        console.log('Access Token:', access_token);
        console.log('Refresh Token:', refresh_token);
        console.log('Open ID:', open_id);

        // 3. Fetch User Profile Data
        const userInfoEndpoint = 'https://open.tiktokapis.com/v2/user/info/';
        // Fields to request: open_id, union_id, avatar_url, display_name
        // Note: Adjust fields based on scopes granted.
        const userInfoResponse = await axios.get(userInfoEndpoint, {
            headers: {
                'Authorization': `Bearer ${access_token}`
            },
            params: {
                'fields': 'open_id,union_id,avatar_url,display_name'
            }
        });

        const userData = userInfoResponse.data.data;
        console.log('User Data:', userData);

        res.send(`
            <h1>Login Successful</h1>
            <p>Open ID: ${open_id}</p>
            <p>Access Token: ${access_token.substring(0, 10)}...</p>
            <h2>User Profile</h2>
            <p>Display Name: ${userData.display_name}</p>
            <p>Avatar: <img src="${userData.avatar_url}" alt="Avatar" width="50"></p>
            <pre>${JSON.stringify(userData, null, 2)}</pre>
        `);

    } catch (error) {
        console.error('Error:', error.response ? error.response.data : error.message);
        res.status(500).send(`Error: ${error.response ? JSON.stringify(error.response.data) : error.message}`);
    }
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
