# Real-Life Scenario: TikTok Chat Webhook

This document explains how the webhook we implemented works in a real-world production environment with a **TikTok Business Account**.

## 1. The Setup (One-time)
Before any messages can be received, the following configuration must be in place:

1.  **Business Account**: You have a verified **TikTok Business Account** (not a personal one).
2.  **Developer Portal**: You have created an app in the TikTok Developer Portal and enabled the **Business Messaging API**.
3.  **Webhook URL**: You have deployed your server (e.g., to AWS, Heroku, or using ngrok) and registered the URL (e.g., `https://api.mozflow.com/webhook`) in the portal.
4.  **Subscription**: You have subscribed to the **"Receive Messages"** event (e.g., `im.message.receive_v1` or `NEW_MESSAGE`).

## 2. The Trigger (Real-time)
Here is the step-by-step flow of what happens when a customer contacts you:

### Step A: Customer Action
A TikTok user (e.g., "Jane Doe") opens the TikTok app on her phone. She visits your brand's profile ("MozFlow Official") and clicks the **"Message"** button.

### Step B: Sending the Message
Jane types: *"Hi, do you have this item in red?"* and hits **Send**.

### Step C: TikTok Processing
1.  TikTok's servers receive the message immediately.
2.  TikTok checks your app's settings and sees you are subscribed to message events.
3.  TikTok packages the event data into a JSON object:
    ```json
    {
      "event": "im.message.receive_v1",
      "from_user": { "display_name": "Jane Doe", "open_id": "..." },
      "content": { "text": "Hi, do you have this item in red?" }
    }
    ```
4.  TikTok calculates a **signature** using your `CLIENT_SECRET` to prove authenticity.

### Step D: The Webhook Call
TikTok sends a **POST request** to your server URL (`/webhook`) with the JSON data and the `TikTok-Signature` header.

### Step E: Your Server's Response
Your Node.js server (running `server.ts`) receives the request:
1.  **Verifies Signature**: It recalculates the signature using your local `CLIENT_SECRET`. If it matches the header, the request is genuine.
2.  **Logs Event**: It prints `💬 New Chat Message Received!` to the console.
3.  **Business Logic**: In a real app, this is where you would:
    *   Save the message to your database (MozFlow CRM).
    *   Trigger an automated "Thank you" reply.
    *   Notify your support team via Slack/Email.

## Key Takeaways
*   **You don't call TikTok**: TikTok calls *you* whenever an event happens.
*   **Business Account Required**: This entire flow requires a TikTok Business Account. Personal accounts cannot receive these webhooks.
*   **Security**: The signature verification is critical to ensure hackers can't send fake messages to your server.
