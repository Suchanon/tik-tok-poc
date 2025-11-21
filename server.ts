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
    data: {
        user: TikTokUser;
    };
    error?: {
        code: number;
        message: string;
        log_id: string;
    };
}
// Access Token: act.sbiorZgQ7vY6hYZT31Oz2BdMb3cszJRCy7iKLxFTd20VL6VbmZL7g8cwmFcU!6290.va
// Refresh Token: rft.RVDVBIgV85ZpgE2E73e37QGcWag956n72YJKy7Sf7fzvuXSkFcGWABoYpe4p!6307.va
// Open ID: -000XOFTvni0e7BXfwu0RtR1nwROp6l3erL_
// User Data: {
//   user: {
//     avatar_url: 'https://p16-sign-sg.tiktokcdn.com/tos-alisg-avt-0068/c473518f93e879f2f6aa8d6b2d6c53eb~tplv-tiktokx-cropcenter:168:168.jpeg?dr=14577&refresh_token=7fbfba54&x-expires=1763892000&x-signature=91DmMKYO8AP4caZNyjM18Pu%2FeLk%3D&t=4d5b0474&ps=13740610&shp=a5d48078&shcp=8aecc5ac&idc=maliva',
//     display_name: 'sumarketing1',
//     following_count: 0,
//     is_verified: false,
//     video_count: 0,
//     avatar_large_url: 'https://p16-sign-sg.tiktokcdn.com/tos-alisg-avt-0068/c473518f93e879f2f6aa8d6b2d6c53eb~tplv-tiktokx-cropcenter:1080:1080.jpeg?dr=14579&refresh_token=e638c1c5&x-expires=1763892000&x-signature=OTHX14y1v2vR5qCY%2FGlwwwP8smI%3D&t=4d5b0474&ps=13740610&shp=a5d48078&shcp=8aecc5ac&idc=maliva',
//     avatar_url_100: 'https://p16-sign-sg.tiktokcdn.com/tos-alisg-avt-0068/c473518f93e879f2f6aa8d6b2d6c53eb~tplv-tiktokx-cropcenter:100:100.jpeg?dr=14579&refresh_token=3dd91029&x-expires=1763892000&x-signature=GQfmOg81JgZLg8Z1tvXu3ahBClM%3D&t=4d5b0474&ps=13740610&shp=a5d48078&shcp=8aecc5ac&idc=maliva',
//     bio_description: '',
//     follower_count: 0,
//     likes_count: 0,
//     open_id: '-000XOFTvni0e7BXfwu0RtR1nwROp6l3erL_',
//     profile_deep_link: 'https://vm.tiktok.com/ZMA3t6bfo/',
//     union_id: '03dbfd34-6aac-5f5a-b416-96939aa2589d'
//   }
// }
const app = express();
const PORT = process.env.PORT || 3000;

app.use(cookieParser());

// Configuration
const CLIENT_KEY = process.env.TIKTOK_CLIENT_KEY;
const CLIENT_SECRET = process.env.TIKTOK_CLIENT_SECRET;
const REDIRECT_URI = process.env.TIKTOK_REDIRECT_URI;

// Scopes based on POC_TIKTOK.md
// Scopes based on user provided screenshot
// Removed business.account.info.read as it was not in the portal
const SCOPES = 'user.info.basic,user.info.profile,user.info.stats';

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

        // Removed stats fields as they require user.info.stats scope which might not be enabled
        // Expanded fields list based on enabled scopes
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

        const userData = userInfoResponse.data.data.user;
        console.log('User Data:', userData);

        res.send(`
            <h1>Login Successful</h1>
            <p>Open ID: ${open_id}</p>
            <p>Access Token: ${access_token}...</p>
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
