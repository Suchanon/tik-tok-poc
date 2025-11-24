import 'dotenv/config';
import express, { Request, Response } from 'express';
import axios from 'axios';
import cookieParser from 'cookie-parser';

import * as crypto from 'crypto';

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

// Middleware to capture raw body for webhook verification
app.use(express.json({
    verify: (req: any, res, buf) => {
        req.rawBody = buf;
    }
}));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Configuration
const CLIENT_KEY = process.env.TIKTOK_CLIENT_KEY;
const CLIENT_SECRET = process.env.TIKTOK_CLIENT_SECRET;
const REDIRECT_URI = process.env.TIKTOK_REDIRECT_URI;

// Scopes based on POC_TIKTOK.md
// Scopes based on user provided screenshot
// Removed business.account.info.read as it was not in the portal
const SCOPES = [
    'user.info.basic',
    'artist.certification.read',
    'artist.certification.update',
    'user.info.profile',
    'user.info.stats',
    'video.list',
    // 'portability.directmessages.ongoing'
].join(',');

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
    url += `&disable_auto_auth=1`; // Force re-authorization/login screen

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
            <!DOCTYPE html>
            <html>
            <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>TikTok Login Success</title>
            <style>
                body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f0f2f5; display: flex; justify-content: center; align-items: center; min-height: 100vh; margin: 0; color: #333; }
                .container { background: white; padding: 40px; border-radius: 24px; box-shadow: 0 20px 40px rgba(0,0,0,0.08); max-width: 480px; width: 90%; }
                h1 { font-size: 24px; margin: 0 0 30px 0; color: #161823; text-align: center; font-weight: 700; }
                .profile-header { display: flex; align-items: center; gap: 20px; margin-bottom: 30px; }
                .avatar { width: 84px; height: 84px; border-radius: 50%; object-fit: cover; border: 4px solid #fff; box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
                .user-info { flex: 1; }
                .user-info h2 { margin: 0; font-size: 20px; display: flex; align-items: center; gap: 6px; color: #161823; }
                .verified { color: #20D5EC; font-size: 18px; }
                .bio { color: #86909c; margin: 6px 0 0; font-size: 14px; line-height: 1.5; }
                .stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 30px; text-align: center; background: #f8f9fa; padding: 20px; border-radius: 16px; }
                .stat-value { display: block; font-size: 18px; font-weight: 700; color: #161823; margin-bottom: 4px; }
                .stat-label { font-size: 12px; color: #73747b; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600; }
                .actions { display: flex; flex-direction: column; gap: 12px; }
                .btn { display: block; text-align: center; padding: 14px; border-radius: 12px; text-decoration: none; font-weight: 600; transition: all 0.2s ease; font-size: 15px; }
                .btn-primary { background: #FE2C55; color: white; box-shadow: 0 4px 12px rgba(254, 44, 85, 0.2); }
                .btn-secondary { background: #fff; color: #161823; border: 1px solid #e3e3e3; }
                .btn:hover { transform: translateY(-2px); }
                .btn-primary:hover { box-shadow: 0 6px 16px rgba(254, 44, 85, 0.3); }
                .btn-secondary:hover { background: #f8f9fa; border-color: #d0d0d0; }
                .tech-details { margin-top: 30px; border-top: 1px solid #f0f0f0; padding-top: 20px; font-size: 12px; color: #999; font-family: monospace; }
                .tech-item { margin-bottom: 8px; word-break: break-all; display: flex; gap: 8px; }
                .tech-label { font-weight: 600; color: #666; min-width: 70px; }
                details { margin-top: 20px; background: #1e1e1e; border-radius: 12px; overflow: hidden; }
                summary { padding: 15px; cursor: pointer; font-weight: 500; color: #fff; user-select: none; font-size: 13px; display: flex; align-items: center; justify-content: space-between; }
                summary::after { content: '+'; font-size: 16px; }
                details[open] summary::after { content: '-'; }
                pre { margin: 0; padding: 20px; overflow-x: auto; background: #1e1e1e; color: #a9b7c6; font-size: 12px; border-top: 1px solid #333; line-height: 1.5; }
            </style>
            </head>
            <body>
            <div class="container">
                <h1>Login Successful</h1>
                
                <div class="profile-header">
                    <img src="${userData.avatar_large_url || userData.avatar_url}" class="avatar" alt="Avatar">
                    <div class="user-info">
                        <h2>${userData.display_name} ${userData.is_verified ? '<span class="verified">☑️</span>' : ''}</h2>
                        <p class="bio">${userData.bio_description || 'No bio available'}</p>
                    </div>
                </div>

                <div class="stats">
                    <div class="stat-item">
                        <span class="stat-value">${userData.follower_count}</span>
                        <span class="stat-label">Followers</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-value">${userData.following_count}</span>
                        <span class="stat-label">Following</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-value">${userData.likes_count}</span>
                        <span class="stat-label">Likes</span>
                    </div>
                </div>

                <div class="actions">
                    <a href="${userData.profile_deep_link}" target="_blank" class="btn btn-primary">Open in TikTok</a>
                    <a href="/auth/tiktok/refresh?refresh_token=${refresh_token}" target="_blank" class="btn btn-secondary">Test Refresh Token</a>
                    <a href="/portability/request?access_token=${access_token}&open_id=${open_id}" target="_blank" class="btn btn-secondary" style="background: #e1f5fe; color: #0277bd; border-color: #b3e5fc;">Request Message History (EEA/UK Only)</a>
                </div>

                <div class="tech-details">
                    <div class="tech-item"><span class="tech-label">Open ID:</span> ${open_id}</div>
                    <div class="tech-item"><span class="tech-label">Token:</span> ${access_token}...</div>
                </div>

                <details>
                    <summary>View Raw JSON Response</summary>
                    <pre>${JSON.stringify(userData, null, 2)}</pre>
                </details>
            </div>
            </body>
            </html>
        `);

    } catch (error: any) {
        console.error('Error:', error.response ? error.response.data : error.message);
        res.status(500).send(`Error: ${error.response ? JSON.stringify(error.response.data) : error.message}`);
    }
});

// 3. Refresh Token Endpoint (Demo)
app.get('/auth/tiktok/refresh', async (req: Request, res: Response) => {
    const { refresh_token } = req.query;

    if (!refresh_token) {
        res.status(400).send('Error: No refresh_token provided');
        return;
    }

    try {
        const tokenEndpoint = 'https://open.tiktokapis.com/v2/oauth/token/';
        const params = new URLSearchParams();
        if (CLIENT_KEY) params.append('client_key', CLIENT_KEY);
        if (CLIENT_SECRET) params.append('client_secret', CLIENT_SECRET);
        params.append('grant_type', 'refresh_token');
        params.append('refresh_token', refresh_token as string);

        const response = await axios.post<TikTokTokenResponse>(tokenEndpoint, params, {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        });

        const { access_token, refresh_token: new_refresh_token, expires_in, open_id } = response.data;

        console.log('New Access Token:', access_token);
        console.log('New Refresh Token:', new_refresh_token);

        res.send(`
            <h1>Token Refreshed Successfully</h1>
            <p><strong>New Access Token:</strong> ${access_token}</p>
            <p><strong>New Refresh Token:</strong> ${new_refresh_token}</p>
            <p><strong>Expires In:</strong> ${expires_in} seconds</p>
            <p><strong>Open ID:</strong> ${open_id}</p>
        `);

    } catch (error: any) {
        console.error('Error refreshing token:', error.response ? error.response.data : error.message);
        res.status(500).send(`Error refreshing token: ${error.response ? JSON.stringify(error.response.data) : error.message}`);
    }
});

// 4. Webhook Endpoint
app.post('/webhook', (req: Request, res: Response) => {
    try {
        const signature = req.headers['tiktok-signature'] as string;
        const rawBody = (req as any).rawBody;

        if (!signature || !rawBody) {
            res.status(400).send('Missing signature or body');
            return;
        }

        // Verify Signature
        // Signature format: t=timestamp,s=signature
        const parts = signature.split(',');
        const timestamp = parts.find(p => p.startsWith('t='))?.split('=')[1];
        const providedSignature = parts.find(p => p.startsWith('s='))?.split('=')[1];

        if (!timestamp || !providedSignature) {
            res.status(400).send('Invalid signature format');
            return;
        }

        // Construct signed payload: timestamp.rawBody
        const signedPayload = `${timestamp}.${rawBody.toString()}`;

        // Calculate expected signature using HMAC-SHA256 and CLIENT_SECRET
        const expectedSignature = crypto
            .createHmac('sha256', CLIENT_SECRET || '')
            .update(signedPayload)
            .digest('hex');

        if (expectedSignature !== providedSignature) {
            console.error('Invalid Signature');
            res.status(401).send('Invalid Signature');
            return;
        }

        console.log('Webhook Verified & Received:', JSON.stringify(req.body, null, 2));

        const event = req.body;

        // Check for common event type fields (TikTok structure varies by API)
        const eventType = event.event || event.type || event.event_type;

        if (eventType) {
            console.log(`Event Type Detected: ${eventType}`);

            // Check for Chat/Message events
            // Note: 'im.message.receive_v1' is common in Lark, 'NEW_MESSAGE' in TikTok Shop
            if (eventType === 'im.message.receive_v1' || eventType === 'NEW_MESSAGE') {
                console.log('💬 New Chat Message Received!');
                // Add your chat handling logic here
            }
        } else {
            console.log('⚠️ Could not detect Event Type. Inspect the raw body above.');
        }

        res.status(200).send('OK');

    } catch (error) {
        console.error('Webhook Error:', error);
        res.status(500).send('Internal Server Error');
    }
});

// Webhook Verification Challenge (Optional/If required by specific TikTok API)
app.get('/webhook', (req: Request, res: Response) => {
    const { challenge } = req.query;
    if (challenge) {
        res.send(challenge);
    } else {
        res.status(400).send('No challenge provided');
    }
});

// 5. Data Portability Endpoints
app.get('/portability/request', async (req: Request, res: Response) => {
    const { access_token, open_id } = req.query;

    if (!access_token || !open_id) {
        res.status(400).send('Error: Missing access_token or open_id');
        return;
    }

    try {
        // Note: This endpoint is for demonstration. Actual endpoint depends on region and specific API version.
        // Using a hypothetical endpoint based on standard Data Portability flows.
        const portabilityEndpoint = 'https://open.tiktokapis.com/v2/portability/request/';

        const response = await axios.post(portabilityEndpoint, {
            open_id: open_id,
            data_types: ['direct_messages']
        }, {
            headers: {
                'Authorization': `Bearer ${access_token}`,
                'Content-Type': 'application/json'
            }
        });

        console.log('Portability Request Response:', response.data);
        res.send(`
            <h1>Request Submitted</h1>
            <p>Data export request for messages has been submitted.</p>
            <p>Job ID: ${response.data.job_id || 'N/A'}</p>
            <p><a href="/">Back to Home</a></p>
        `);

    } catch (error: any) {
        console.error('Portability Error:', error.response ? error.response.data : error.message);
        res.status(500).send(`
            <h1>Request Failed</h1>
            <p>Error: ${error.response ? JSON.stringify(error.response.data) : error.message}</p>
            <p><strong>Note:</strong> This feature is restricted to EEA/UK users. If you are outside these regions, this error is expected.</p>
        `);
    }
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
// Webhooks implemented
