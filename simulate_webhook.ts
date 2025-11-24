import axios from 'axios';
import crypto from 'crypto';
import 'dotenv/config';

const CLIENT_SECRET = process.env.TIKTOK_CLIENT_SECRET;
const WEBHOOK_URL = 'http://localhost:3000/webhook';

if (!CLIENT_SECRET) {
    console.error('Error: TIKTOK_CLIENT_SECRET is missing in .env');
    process.exit(1);
}

// 1. Create the Mock Payload
const payload = {
    event: 'im.message.receive_v1', // or 'NEW_MESSAGE'
    create_time: Math.floor(Date.now() / 1000),
    content: {
        message_type: 'text',
        text: 'Hello, this is a test message!',
        from_user: {
            display_name: 'sumarketing1', // The user you mentioned
            open_id: 'mock_openid_12345'
        },
        to_user: {
            open_id: 'your_bot_openid'
        }
    }
};

// 2. Create the Signature
const timestamp = Math.floor(Date.now() / 1000).toString();
const rawBody = JSON.stringify(payload);
const signedPayload = `${timestamp}.${rawBody}`;

const signature = crypto
    .createHmac('sha256', CLIENT_SECRET)
    .update(signedPayload)
    .digest('hex');

// 3. Send the Request
async function sendWebhook() {
    try {
        console.log(`Sending webhook to ${WEBHOOK_URL}...`);
        console.log('Payload:', JSON.stringify(payload, null, 2));

        const response = await axios.post(WEBHOOK_URL, payload, {
            headers: {
                'Content-Type': 'application/json',
                'TikTok-Signature': `t=${timestamp},s=${signature}`
            }
        });

        console.log('Response:', response.status, response.data);
        console.log('✅ Webhook simulation successful!');
    } catch (error: any) {
        console.error('❌ Error sending webhook:', error.response ? error.response.data : error.message);
    }
}

sendWebhook();
