import 'dotenv/config';
import express, { Request, Response } from 'express';
import axios from 'axios';
import cookieParser from 'cookie-parser';

interface TikTokTokenResponse {
    open_id: string;
    access_token: string;
    refresh_token: string;
    expires_in: number;
    scope: string;
    token_type: string;
}

interface TikTokUser {
    open_id: string;
    union_id?: string;
    avatar_url: string;
    avatar_url_100?: string;
    avatar_large_url?: string;
    display_name: string;
    bio_description?: string;
    profile_deep_link?: string;
    is_verified?: boolean;
    follower_count?: number;
    following_count?: number;
    likes_count?: number;
    video_count?: number;
}

interface TikTokUserInfoResponse {
    data: TikTokUser;
    error?: {
        code: number;
        message: string;
        log_id: string;
    };
}

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cookieParser());

// Configuration
const CLIENT_KEY = process.env.TIKTOK_CLIENT_KEY;
const CLIENT_SECRET = process.env.TIKTOK_CLIENT_SECRET;
const REDIRECT_URI = process.env.TIKTOK_REDIRECT_URI;

// Scopes based on POC_TIKTOK.md + stats for more fields
const SCOPES = 'user.info.basic,user.info.profile,business.account.info.read,user.info.stats';

app.get('/', (req: Request, res: Response) => {
    res.send('<h1>TikTok OAuth 2.0 POC</h1><a href="/auth/tiktok">Login with TikTok</a>');
});

// 1. Redirect to TikTok Authorize URL
app.get('/auth/tiktok', (req: Request, res: Response) => {
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
app.get('/auth/tiktok/callback', async (req: Request, res: Response) => {
    const { code, state } = req.query;
    const { csrfState } = req.cookies;

    if (!code) {
        res.status(400).send('Error: No code provided');
        return;
    }

    if (state !== csrfState) {
        res.status(403).send('Error: Invalid state');
        return;
    }

    try {
        const tokenEndpoint = 'https://open.tiktokapis.com/v2/oauth/token/';
        const params = new URLSearchParams();
        if (CLIENT_KEY) params.append('client_key', CLIENT_KEY);
        if (CLIENT_SECRET) params.append('client_secret', CLIENT_SECRET);
        params.append('code', code as string);
        params.append('grant_type', 'authorization_code');
        if (REDIRECT_URI) params.append('redirect_uri', REDIRECT_URI);

        const response = await axios.post<TikTokTokenResponse>(tokenEndpoint, params, {
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

        // Expanded fields list
        const fields = [
            'open_id',
            'union_id',
            'avatar_url',
            'avatar_url_100',
            'avatar_large_url',
            'display_name',
            'bio_description',
            'profile_deep_link',
            'is_verified',
            'follower_count',
            'following_count',
            'likes_count',
            'video_count'
        ].join(',');

        const userInfoResponse = await axios.get<TikTokUserInfoResponse>(userInfoEndpoint, {
            headers: {
                'Authorization': `Bearer ${access_token}`
            },
            params: {
                'fields': fields
            }
        });

        const userData = userInfoResponse.data.data;
        console.log('User Data:', userData);

        res.send(`
            <h1>Login Successful</h1>
            <p>Open ID: ${open_id}</p>
            <p>Access Token: ${access_token.substring(0, 10)}...</p>
            <h2>User Profile</h2>
            <div style="display: flex; align-items: center; gap: 20px;">
                <img src="${userData.avatar_large_url || userData.avatar_url}" alt="Avatar" width="100" style="border-radius: 50%;">
                <div>
                    <h3>${userData.display_name} ${userData.is_verified ? '☑️' : ''}</h3>
                    <p>${userData.bio_description || 'No bio'}</p>
                </div>
            </div>
            <div style="margin-top: 20px; display: flex; gap: 20px;">
                <div><strong>Followers:</strong> ${userData.follower_count}</div>
                <div><strong>Following:</strong> ${userData.following_count}</div>
                <div><strong>Likes:</strong> ${userData.likes_count}</div>
            </div>
            <p><a href="${userData.profile_deep_link}" target="_blank">Open in TikTok</a></p>
            <h3>Raw Data</h3>
            <pre>${JSON.stringify(userData, null, 2)}</pre>
        `);

    } catch (error: any) {
        console.error('Error:', error.response ? error.response.data : error.message);
        res.status(500).send(`Error: ${error.response ? JSON.stringify(error.response.data) : error.message}`);
    }
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
