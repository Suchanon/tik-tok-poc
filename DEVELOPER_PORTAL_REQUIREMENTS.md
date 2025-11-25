# TikTok Developer Portal Requirements

Please provide the following information to configure the TikTok App for production.

## 1. Basic Information
| Field | Requirement | Example / Notes |
| :--- | :--- | :--- |
| **App Name** | Publicly visible name. | `My Cool App` |
| **App Icon** | **1024px x 1024px**, Max 5MB, JPG/PNG. | Must not have transparent background. |
| **Category** | App category. | `Business`, `Entertainment`, etc. |
| **Description** | Short description of what the app does. | "A dashboard for managing TikTok messages and analytics." |

## 2. Legal & URLs
These URLs must be publicly accessible.

| Field | Value (Current POC) | Action Required |
| :--- | :--- | :--- |
| **Terms of Service URL** | `https://tik-tok-poc.onrender.com` | **Replace** with real ToS link if available. |
| **Privacy Policy URL** | `https://tik-tok-poc.onrender.com` | **Replace** with real Privacy Policy link. |
| **Web/Desktop URL** | `https://tik-tok-poc.onrender.com` | The main homepage of the app. |


## 3. Permissions (Scopes)
We need approval for the following permissions:

*   `user.info.basic` (Read basic profile info)
*   `user.info.profile` (Read detailed profile info)
*   `user.info.stats` (Read follower/like counts)
*   `video.list` (Read video data)
*   `im.message.receive_v1` (Receive chat messages - **Business Account Only**)
