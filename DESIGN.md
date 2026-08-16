# Share2Earn Web Application — DESIGN.md

## 1. Product Overview

**Product name:** CelcomDigi Share2Earn
**Platform:** Responsive web application / Progressive Web App (PWA)

### Core Idea

A customer who needs help completing a digital CelcomDigi task can securely request help from a trusted person. The trusted helper receives a push notification, reviews the task, recommends an action, and sends it back to the account owner. The account owner always remains in control and must approve any action that changes a plan, creates a purchase, or affects the account.

### Product Promise

> Help someone go digital. Both of you benefit.

The experience should feel:

- Simple
- Human
- Trustworthy
- Mobile-first
- Rewarding
- Secure

---

# 2. Primary Business Goals

The platform exists to create measurable digital engagement rather than adding another app feature.

### Objectives

1. Increase successful self-service completion.
2. Reduce contact centre dependency.
3. Improve digital confidence.
4. Increase commercial conversions.
5. Encourage peer-to-peer assistance.
6. Create repeat engagement loops.
7. Reward meaningful digital behaviour.

### Success Metrics

- Digital task completion rate
- Share2Earn request acceptance rate
- Helper response time
- Owner approval rate
- Commercial conversion rate
- Repeat Share2Earn usage
- Customer satisfaction
- Reward cost per completion
- Fraud rate

---

# 3. Core Entities

## Entity A — Account Owner (Requester)

The person who owns the CelcomDigi account and requires assistance.

### Examples

- Mother needs help activating roaming.
- Father needs help understanding his bill.
- Customer wants to compare plans.
- Customer needs onboarding assistance.

### Capabilities

Can:

- Sign in
- View account summary
- Start supported tasks
- Request help
- Select trusted helpers
- Review recommendations
- Approve or reject actions
- View activity history
- Receive rewards

### Rule

> The Account Owner always has final approval.

---

## Entity B — Trusted Helper

A trusted person selected to assist with a specific task.

### Examples

- Son helping mother
- Daughter helping father
- Friend helping friend
- Spouse helping spouse

### Capabilities

Can:

- Receive help requests
- Accept or decline requests
- Review limited task information
- Recommend options
- Track rewards
- View helper progress

### Rule

> The Helper recommends. The Owner approves.

---

# 4. Core Flow

```text
OWNER
  ↓
Select Task
  ↓
Ask Someone I Trust
  ↓
Select Helper
  ↓
Send Request
  ↓
HELPER
  ↓
Review Task
  ↓
Recommend Option
  ↓
OWNER
  ↓
Review Recommendation
  ↓
Approve / Reject
  ↓
Execute Task
  ↓
Reward Both Users
```

---

# 5. MVP Use Cases

## Use Case 1 — Bill Explanation

### Owner

- Opens Bill section
- Selects “Why is my bill higher?”
- Requests help

### Helper

- Sees bill comparison
- Reviews explanation
- Sends explanation to owner

### Risk

GREEN

---

## Use Case 2 — Roaming Recommendation

### Owner

- Selects destination
- Selects travel dates
- Requests assistance

### Helper

- Reviews available roaming options
- Recommends one option

### Owner

- Reviews recommendation
- Approves
- Roaming activated

### Risk

AMBER

---

## Use Case 3 — Plan Change

### Owner

Requests plan comparison.

### Helper

Reviews:

- Current plan
- Eligible plans
- Benefits comparison

Recommends a plan.

### Owner

Approves or rejects.

### Risk

AMBER

---

## Use Case 4 — Digital Onboarding

### Existing Customer

Invites a friend.

### New Customer

Completes onboarding.

### Rule

Identity verification must always be performed by the new customer.

### Risk

AMBER / RED

---

# 6. UI / UX Direction

## Design Personality

The application should feel:

- Friendly
- Human
- Inclusive
- Secure
- Modern
- Trustworthy

Avoid:

- Complex dashboards
- Small text
- Technical jargon
- Dense forms
- Aggressive upselling

---

## Colour Palette

```css
--navy-900: #082B75;
--blue-700: #0057D9;
--blue-500: #1976F3;
--blue-100: #EAF3FF;

--yellow-500: #FFD400;
--yellow-300: #FFE66A;

--green-500: #32C85A;
--red-500: #E64646;

--text-primary: #0E1B3D;
--text-secondary: #5C6784;

--background: #F3F7FD;
--surface: #FFFFFF;
```

---

## Typography

Recommended:

- Inter
- Plus Jakarta Sans
- SF Pro

Sizes:

- Hero: 32–40px
- Page Title: 24–28px
- Heading: 18–20px
- Body: 16px minimum

---

## Shape Language

- Card Radius: 16–20px
- Buttons: 12–16px
- Pills: 999px
- Soft shadows
- Blue borders
- Yellow for highlights
- Green only for success

---

# 7. Navigation

## Bottom Navigation

```text
Home
Help
Activity
Rewards
Profile
```

### Home

Account summary and Share2Earn entry point.

### Help

Create or respond to requests.

### Activity

View request history.

### Rewards

View rewards and helper progress.

### Profile

Manage helpers and settings.

---

# 8. Main Screens

## Owner Home

### Hero

```text
Need help with your CelcomDigi task?

[ Try Myself ]

[ Ask Someone I Trust ]
```

Yellow button:

```text
Ask Someone I Trust
```

### Quick Tasks

- Bill
- Roaming
- Plan
- eSIM
- Onboarding

---

## Select Trusted Helper

Title:

```text
Choose someone you trust
```

Security Message:

```text
Only information required for this task will be shared.
```

CTA:

```text
Send Help Request
```

---

## Helper Notification

```text
CelcomDigi Share2Earn

Mum needs your help choosing a Thailand roaming pass.

[ View Request ]
```

---

## Helper Review Screen

Example:

```text
3-Day Pass
RM38
3GB Data

7-Day Pass
RM68
6GB Data
```

Security Note:

```text
You are recommending, not purchasing.
```

CTA:

```text
Recommend to Mum
```

---

## Owner Approval Screen

```text
Aina recommends this for you.
```

Security Message:

```text
Nothing will be purchased until you approve.
```

Buttons:

```text
Approve
Ask Again
Decline
```

---

## Success Screen

```text
Task Completed Successfully
```

Rewards:

```text
You earned:
500MB

Helper earned:
500MB
```

CTA:

```text
Help Someone Else
```

---

# 9. Notification System

## Technology

Recommended:

- PWA
- Web Push API
- Firebase Cloud Messaging
- WebSockets
- Supabase Realtime

---

## Events

### HELP_REQUEST_CREATED

```json
{
  "title": "Mum needs your help",
  "request_id": "REQ-10001"
}
```

### RECOMMENDATION_SENT

```json
{
  "title": "Aina has replied",
  "request_id": "REQ-10001"
}
```

### OWNER_APPROVED

```json
{
  "title": "Recommendation approved",
  "request_id": "REQ-10001"
}
```

### TASK_COMPLETED

```json
{
  "title": "Share2Earn completed",
  "request_id": "REQ-10001"
}
```

---

# 10. Request Status Model

```text
DRAFT
SENT
HELPER_VIEWED
HELPER_ACCEPTED
RECOMMENDATION_SENT
OWNER_REVIEWING
OWNER_APPROVED
EXECUTING
COMPLETED
```

Alternative States:

```text
DECLINED_BY_HELPER
DECLINED_BY_OWNER
EXPIRED
CANCELLED
FAILED
```

---

# 11. Permission Model

Every request creates a temporary task-scoped permission.

Example:

```json
{
  "request_id": "REQ-10001",
  "task_type": "ROAMING",
  "permissions": [
    "VIEW_ELIGIBLE_ROAMING_OPTIONS",
    "RECOMMEND_OPTION"
  ]
}
```

Helpers must NOT access:

- IC numbers
- Payment details
- Full billing history
- Passwords
- Banking information
- Identity documents

---

# 12. Risk Levels

## GREEN

Low-risk assistance.

Examples:

- Bill explanation
- Product information
- App guidance

## AMBER

Owner approval required.

Examples:

- Roaming
- Plan change
- Add-ons
- eSIM

## RED

Not supported in MVP.

Examples:

- Ownership transfer
- SIM replacement
- Identity changes
- Payment card changes

---

# 13. Authentication

Prototype:

- Mobile login
- Mock OTP

Important:

Users do not have permanent roles.

A user can be:

- Owner for one request
- Helper for another request

---

# 14. Database Model

## users

```text
id
name
mobile_number
email
avatar_url
customer_id
created_at
```

## trusted_relationships

```text
id
owner_user_id
trusted_user_id
relationship_label
status
created_at
```

## help_requests

```text
id
owner_user_id
helper_user_id
task_type
status
risk_level
context_json
created_at
expires_at
```

## recommendations

```text
id
help_request_id
helper_user_id
selected_option_id
message
created_at
```

## task_options

```text
id
help_request_id
title
price
metadata_json
recommended
```

## notifications

```text
id
user_id
type
title
body
created_at
```

## rewards

```text
id
user_id
reward_type
reward_value
status
created_at
```

## helper_progress

```text
user_id
successful_assists
xp
level
```

## audit_log

```text
id
actor_user_id
help_request_id
event
created_at
```

---

# 15. API Structure

## Authentication

```http
POST /api/auth/login
POST /api/auth/verify-otp
GET /api/me
POST /api/auth/logout
```

## Trusted Helpers

```http
GET /api/trusted-helpers
POST /api/trusted-helpers
DELETE /api/trusted-helpers/:id
```

## Help Requests

```http
POST /api/help-requests
GET /api/help-requests
GET /api/help-requests/:id
POST /api/help-requests/:id/accept
POST /api/help-requests/:id/decline
```

## Recommendation

```http
POST /api/help-requests/:id/recommendation
```

## Owner Decision

```http
POST /api/help-requests/:id/approve
POST /api/help-requests/:id/reject
```

---

# 16. Technology Stack

## Frontend

- Next.js
- TypeScript
- Tailwind CSS
- React Query
- Zustand
- PWA

## Backend

- Next.js API Routes
- Supabase

Alternative:

- NestJS
- PostgreSQL

## Realtime

- Supabase Realtime
- WebSockets

## Notifications

- Firebase Cloud Messaging

---

# 17. Demo Accounts

## Aina

```text
Name: Aina
Mobile: 0123 111 222
Level: Digital Buddy Level 2
XP: 620 / 1000
```

## Mum

```text
Name: Mum
Mobile: 0123 333 444
Account Type: Postpaid
```

---

# 18. Demo Scenario

### Step 1

Login as Mum.

```text
Roaming
→ Thailand
→ 15–22 May
→ Ask Someone I Trust
→ Aina
→ Send Help Request
```

### Step 2

Login as Aina.

Notification appears:

```text
Mum needs your help choosing Thailand roaming.
```

Aina recommends:

```text
3-Day Pass
RM38
```

### Step 3

Return to Mum.

Notification:

```text
Aina recommends Thailand 3-Day Pass.
```

Approve.

### Step 4

Success Screen.

```text
Task completed successfully.

Mum earned 500MB.
Aina earned 500MB.
```

Demo duration:

```text
60–90 seconds
```

---

# 19. Demo Mode

Route:

```text
/demo
```

Layout:

```text
┌──────────────┐      REALTIME      ┌──────────────┐
│ MUM / OWNER  │ <---------------> │ AINA/HELPER  │
└──────────────┘                    └──────────────┘
```

Presenter Toolbar:

```text
Reset Demo
Trigger Request
Trigger Recommendation
Approve
Complete
```

---

# 20. Accessibility

Requirements:

- WCAG AA
- 16px minimum body text
- 44px touch targets
- English + Bahasa Melayu
- Clear labels
- No icon-only critical actions
- Text scaling support
- Colour-independent status indicators

---

# 21. Reward Rules

Examples:

```text
Bill explanation:
100 points each

Roaming completed:
500MB each

Plan change:
500 points each

Onboarding:
2GB each
```

Anti-abuse:

- Monthly cap
- One reward per task
- Fraud monitoring
- No rewards for expired requests

---

# 22. Admin Dashboard

Route:

```text
/admin
```

Metrics:

- Requests created
- Requests completed
- Completion rate
- Response time
- Approval rate
- Rewards issued
- Conversion value
- Fraud flags

Filters:

- Date
- Status
- Task Type
- Risk Level

---

# 23. Event Tracking

Track:

```text
share2earn_home_viewed
help_started
trusted_help_selected
helper_selected
help_request_sent
helper_opened_request
recommendation_sent
owner_approved
owner_rejected
task_completed
reward_issued
```

Every event contains:

```text
user_id
help_request_id
task_type
timestamp
```

---

# 24. Security Requirements

- TLS everywhere
- OTP authentication
- Task-scoped permissions
- Audit logging
- Owner approval required
- Masked sensitive data
- Server-side authorization
- Rate limiting
- CSRF protection
- XSS protection
- Request expiry
- Immediate relationship revocation

---

# 25. MVP Scope

## Must Have

- Two-user login
- Trusted helper list
- Create request
- Realtime notifications
- Recommendation flow
- Owner approval
- Reward flow
- Activity history
- Audit logging
- Responsive UI
- Demo mode

## Should Have

- PWA
- Push notifications
- English + Bahasa Melayu
- Helper levels
- Analytics dashboard

## Could Have

- AI summaries
- AI explanations
- SMS fallback
- WhatsApp fallback

## Out of Scope

- Real billing changes
- Real SIM replacement
- Real financial transactions
- Real customer data

---

# 26. Acceptance Criteria

The MVP succeeds when:

1. Two users can sign in.
2. Requests can be created.
3. Helper receives realtime notification.
4. Helper can recommend.
5. Owner receives recommendation.
6. Owner can approve.
7. Task completes successfully.
8. Rewards are issued.
9. Activity is recorded.
10. Audit logs are created.
11. Permissions remain task-scoped.
12. UI works on mobile.
13. Demo mode functions correctly.
14. Thailand roaming scenario completes within 90 seconds.

---

# Product Principle

> Self-service when I can. Someone I trust when I need. CelcomDigi when it matters.

# Platform Vision

> Turn customers into a network — not just a customer base.
