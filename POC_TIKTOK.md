# TikTok Integration POC Plan (Business Context)

https://developers.tiktok.com/doc/overview?enter_method=left_navigation

## 1. Discovery & Prerequisites
- Audit current Mozflow POC architecture, identify integration touchpoints (auth service, chat backend, CRM, marketing data layer).
- Enroll in TikTok for Developers & TikTok Business Center, ensuring Business Account access and required permissions for Marketing API, Login Kit, and Business Messages if available in region.
- Create TikTok app (dev portal) and document Client Key, Client Secret, Redirect URI, test user accounts.
- Confirm compliance requirements (privacy policy, terms of service, user consent flows) and capture any review/approval timelines from TikTok.

## 2. Login with TikTok (OAuth 2.0)
1. Register redirect URL and requested scopes (e.g., `user.info.basic`, `user.info.profile`, `business.account.info.read`).
2. Implement OAuth authorization code flow in auth service:
   - `/auth/tiktok` endpoint redirects to TikTok authorize URL.
   - `/auth/tiktok/callback` exchanges code for access+refresh tokens using TikTok OAuth token endpoint.
3. Persist tokens securely (hashed refresh token, encrypted access token) and map TikTok UID to Mozflow user.
4. Build token refresh job and error‑handling for expired scopes or revoked consent.
5. Add login UI entry point (web + mobile) and feature flag to toggle in POC environments.

## 3. Chat / Messaging Integration (Business Messages)
1. Validate availability of TikTok Business Messages API for the target market (requires Business Center approval).
2. If approved:
   - Subscribe webhook endpoint to receive message events (verification handshake + signature validation).
   - Store conversation state (thread ID, sender info, timestamps) for CRM linkage.
   - Build outbound messaging service that signs requests with Business API credentials and honors rate limits.
   - Map TikTok message types (text, media) to Mozflow chat schema; implement attachment download proxy if required.
3. If Business Messages unavailable, document fallback (deep link to TikTok Inbox or partner tool) and keep task in backlog.

## 4. Contact & Profile Data Sync
1. Determine required profile attributes (display name, avatar, follower counts, business category, linked shop URL, region).
2. Use TikTok User Info / Business Account endpoints to fetch profile; respect scope requirements (`business.account.info.read`, `user.info.profile`).
3. Normalize into Mozflow contact model; store refresh timestamp + versioning for historical tracking.
4. Schedule incremental sync (webhook driven if available, else cron job calling `/business/get/` APIs).
5. Add data governance checks (consent logging, PII minimization) before exposing in UI or CRM exports.

## 5. Marketing-Focused API Opportunities
- **TikTok Marketing API**: manage campaigns, ad groups, creatives; pull spend and performance metrics for dashboards.
- **Audience / Lead Generation APIs**: ingest lead forms generated on TikTok and push to Mozflow CRM.
- **Insights & Reporting APIs**: surface engagement metrics to account managers; integrate with BI pipeline.
- **Content / Comment Management**: monitor organic post comments and sentiment if Business API access allows.
- Evaluate feature fit vs. effort, then prioritize a lightweight KPI dashboard for the POC (e.g., spend + conversions for key campaigns).

## 6. Security, Monitoring, and QA
- Implement logging for OAuth exchanges, webhook deliveries, and outbound API calls (mask secrets).
- Set up alerting for response time, failed token refreshes, and rate-limit breaches.
- Write integration tests using mocked TikTok endpoints; add manual test scripts for end-to-end login and chat scenarios.
- Prepare rollback plan: feature flags + ability to revoke tokens for affected users.

## 7. Timeline & Deliverables
1. Week 1: Discovery, TikTok approvals, environment setup, finalize scopes.
2. Week 2: OAuth login + basic profile fetch end-to-end demo.
3. Week 3: Chat webhook prototype (if available) and contact sync job.
4. Week 4: Marketing API data ingest MVP + dashboard widget, hardening, documentation handoff.
