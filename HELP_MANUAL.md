# JTS Support Full Help Manual

## 1. Project Overview

JTS Support is a multi-role customer operations platform built for:

- live website chat
- support ticket handling
- CRM lead and customer management
- sales follow-up workflows
- routing by website, department, and category
- notifications, activity history, and audit visibility
- tenant-based business operations

This project is divided into 3 main parts:

- `backend`
  Express + MongoDB + Socket.IO API
- `dashboard`
  React web dashboard for admin, client, manager, agent, user, and sales roles
- `chat-widget`
  embeddable website chat widget used by visitors

In simple words:

- Visitor talks through the widget
- Team handles chat in the dashboard
- Support issues become tickets
- Sales opportunities become CRM leads
- Managers and clients supervise the full lifecycle

---

## 2. Core Working Process

The full working flow of the system is:

1. A website visitor opens the chat widget
2. A `Visitor` record is created or reused
3. A `Chat Session` is created
4. Chat appears in dashboard queues
5. Team member replies live
6. If the issue needs support tracking, chat becomes a `Ticket`
7. If the issue is sales/business related, chat can create or enrich a `CRM Lead`
8. CRM lead is assigned to a sales owner
9. Sales user moves the lead through the pipeline
10. Tasks, notes, email follow-up, and activity timeline continue the process
11. Reports, notifications, and audit history help management supervise everything

---

## 3. Main Modules

The system is organized into these major modules:

- Dashboard / Overview
- Websites
- Agents / Staff
- Chats
- Tickets
- CRM
- Departments
- Categories
- Shortcuts / Canned Responses
- Reports
- Security
- Billing / Subscriptions
- Historical Archive

---

## 4. Roles in the System

### 4.1 Admin

Admin is the top-level platform owner.

Admin can:

- access all tenants
- manage clients
- manage all websites
- manage all staff
- monitor all chats
- monitor all tickets
- access CRM across the platform
- view reports and exports
- view security center and audit areas
- manage subscriptions and billing administration

Best use:

- platform setup
- global troubleshooting
- system governance
- top-level analytics

### 4.2 Client

Client is the business owner for one tenant/account.

Client can:

- manage websites
- manage team members
- manage chats
- manage tickets
- manage CRM
- manage departments and categories
- manage reports
- manage security center
- manage billing for their tenant

Best use:

- business operations
- team setup
- tenant reporting
- supervision

### 4.3 Manager

Manager is the operational supervisor inside one tenant.

Manager can:

- monitor overview
- supervise CRM
- supervise tickets
- supervise streams/sessions
- view team workload
- manage assignments
- use reports if enabled in plan

Best use:

- team management
- lead assignment
- ticket follow-up
- pipeline supervision

### 4.4 Agent

Agent is the live support operator.

Agent can:

- work on chats
- handle assigned visitor sessions
- convert chats into tickets
- use shortcuts
- update tickets
- view customer intelligence context

Best use:

- live support
- fast visitor response
- support issue capture

### 4.5 User

`user` is a lightweight/basic support operator.

User can:

- work assigned chats
- update their own availability
- use a smaller subset of agent tools

Best use:

- simple queue handling
- basic support coverage

### 4.6 Sales

Sales is the CRM and lead follow-up role.

Sales can:

- access sales pipeline
- manage assigned leads
- update CRM stages
- add notes and interactions
- create follow-up tasks
- send sales emails
- work assigned sales chats
- review insights if reports are enabled

Best use:

- qualification
- proposals
- negotiation
- closing deals

---

## 5. Menu Structure by Role

### 5.1 Admin Menu

- Dashboard
- Clients
- Websites
- Agents
- Chats
- Tickets
- CRM
- Departments
- Categories
- Shortcuts
- Reports
- Historical Archive
- Security
- Subscriptions

### 5.2 Client Menu

- Dashboard
- Websites
- Billing
- Agents
- Chats
- Tickets
- Departments
- Categories
- CRM
- Shortcuts
- Reports
- Security

Some menus depend on plan access.

### 5.3 Manager Menu

- Overview
- CRM
- My Team
- Reports
- Streams

Some menus depend on plan access.

### 5.4 Agent Menu

For agent:

- Performance
- Active Queue
- Shortcuts
- Settings

For user:

- Performance
- Active Queue
- Settings

### 5.5 Sales Menu

- Pipeline
- Tasks
- Notes
- Chats
- Insights

Some menus depend on plan/report access.

---

## 6. Step-by-Step System Working

## 6.1 Website Setup Process

Use this when onboarding a new client website.

1. Login as `admin` or `client`
2. Open `Websites`
3. Click add/create website
4. Enter website name
5. Enter domain
6. Save website
7. Copy API key or embed script
8. Install widget on the client website

What this works for:

- connects the widget to the correct tenant website
- allows visitor tracking
- allows chats/tickets/CRM records to be linked to the correct business

---

## 6.2 Staff Setup Process

Use this to create managers, agents, sales users, or basic users.

1. Login as `admin` or `client`
2. Open `Agents`
3. Click add/create user
4. Choose role
5. Assign websites
6. Assign department/category if needed
7. Save user
8. Share login credentials

What this works for:

- gives staff dashboard access
- controls what they can see
- controls routing and responsibility

---

## 6.3 Live Chat Process

This is the first operational layer of the system.

### Visitor Side

1. Visitor opens website widget
2. Visitor enters chat message
3. Chat session is created
4. Visitor identity is tracked

Tracked data may include:

- page URL
- first page
- visit history
- device/browser/os
- country/city

### Team Side

1. Chat appears in dashboard queue
2. Agent or user opens the session
3. Agent replies in real time
4. Internal notes can be added
5. Session can be transferred if needed
6. Session can be closed when complete

What chat works for:

- immediate customer support
- live sales conversations
- first-contact capture

---

## 6.4 Chat to Ticket Process

Use this when the issue needs structured support tracking.

1. Open a chat session
2. Click `Convert to Ticket`
3. Enter ticket subject
4. Set priority
5. Set category and subcategory if available
6. Optional: set CRM sales stage if the request is business-related
7. Save

After conversion:

- a `Ticket` record is created
- the visitor can receive a status link
- the ticket enters the ticket workspace
- assignment and SLA handling begin

What ticket conversion works for:

- technical problems
- billing issues
- complaints
- requests needing follow-up

---

## 6.5 Ticket Working Process

Tickets are the structured support case system.

### Ticket Fields

Each ticket can include:

- ticket ID
- subject
- priority
- status
- CRM stage
- category
- subcategory
- department
- assigned agent
- escalation level
- notes
- watchers
- activity history

### Ticket Statuses

Current ticket statuses include:

- `open`
- `in_progress`
- `waiting`
- `resolved`
- `closed`
- `archived`

`pending` may still appear in legacy or older flows.

### Ticket Priority

- low
- medium
- high
- urgent

### Ticket SLA Behavior

The project includes SLA support:

- SLA countdown is shown in ticket UI
- backend stores `firstResponseDueAt`
- backend stores `resolutionDueAt`
- breached tickets can be escalated automatically
- managers can receive SLA breach alerts

### Ticket Process

1. Ticket is created
2. Priority is set or inferred
3. Category/department helps routing
4. Ticket is assigned to staff
5. Notes and updates are added
6. Status moves to `in_progress` or `waiting`
7. If solved, move to `resolved`
8. When finalized, move to `closed`

What tickets work for:

- trackable support workflow
- support accountability
- SLA-driven operations

---

## 6.6 CRM Working Process

CRM is used for leads, business opportunities, and customer relationship work.

### CRM Main Purpose

CRM works for:

- lead capture
- lead assignment
- pipeline movement
- activity logging
- sales follow-up
- customer intelligence
- communication tracking

### Lead Creation Sources

A lead can come from:

- manual creation
- chat
- ticket context
- website inquiry
- ads or referral data

### Lead Fields

Important CRM fields include:

- name
- email
- phone
- company name
- lead source
- lead value
- budget
- interest level
- probability
- priority
- expected close date
- owner
- tags
- notes
- source details from chat context

### CRM Pipeline Stages

Current pipeline stages:

- `new`
- `contacted`
- `qualified`
- `proposal_sent`
- `negotiation`
- `won`
- `lost`

This is the real lead journey inside the system.

### CRM Statuses

CRM status closely follows pipeline behavior and includes:

- `new`
- `contacted`
- `qualified`
- `proposal_sent`
- `negotiation`
- `won`
- `lost`

Legacy values may still exist in old data:

- `prospect`
- `lead`
- `customer`
- `inactive`

### CRM UI Workflow

1. Open `CRM` or `Pipeline`
2. Choose board view or list view
3. Filter leads by:
   - my leads
   - due today
   - no follow-up
   - archived
4. Open a lead card
5. Review customer drawer details
6. Update stage, owner, or follow-up
7. Add note, task, email, or interaction
8. Continue movement until won/lost

### Lead Board Working

The board supports lane-based pipeline work:

- New
- Contacted
- Qualified
- Proposal Sent
- Negotiation
- Won
- Lost

What it works for:

- quick visual pipeline management
- daily sales control
- conversion monitoring

### CRM Detail Drawer Tabs

Lead/customer drawer may include:

- Tickets
- Chats
- Notes
- Tasks
- Journey
- Timeline
- Actions

What these work for:

- linked support history
- linked sales history
- interaction logging
- follow-up execution

---

## 6.7 CRM Automation

The project includes automation for lead handling.

### Auto Assignment

New or unowned leads can be auto-assigned to a balanced sales owner.

What it works for:

- reduces manual assignment
- balances sales workload

### No Response Reassignment

If a lead stays inactive past the configured threshold, the system can reassign it.

Env setting:

```env
CRM_LEAD_REASSIGN_MINUTES=10
```

What it works for:

- keeps leads from being ignored
- improves team responsiveness

### Duplicate Detection

The system checks likely duplicates using:

- email
- phone
- company name

What it works for:

- cleaner CRM
- avoids repeated lead records

### Follow-Up Reminders

Follow-up tasks can trigger reminders when due.

What it works for:

- task discipline
- daily sales execution

---

## 6.8 CRM Communication Tracking

CRM stores communication history inside the lead profile.

Current tracked communication types include:

- email
- call logs
- chat-linked context
- manual email logs

What it works for:

- single lead history
- better handoff between team members

---

## 6.9 Manual Interactions in CRM

Sales or managers can log interactions like:

- call
- meeting
- manual email
- note

What it works for:

- sales timeline
- deal progress history
- professional lead records

---

## 6.10 Follow-Up Task Process

Follow-up tasks are used in CRM to plan next actions.

Task types can include:

- call
- email
- meeting
- demo
- quotation
- follow-up
- custom/general

Task statuses:

- open
- in_progress
- completed
- cancelled

Task process:

1. Open lead
2. Create task
3. Set title
4. Set type
5. Set due date
6. Assign owner
7. Complete when done

What it works for:

- follow-up scheduling
- sales discipline
- team accountability

---

## 6.11 Sales Email Process

Sales users can send CRM emails to leads.

Process:

1. Open lead
2. Draft email
3. Add subject
4. Add body
5. Optional: attach file
6. Send

What it works for:

- follow-up
- proposal communication
- lead outreach

Requirements:

- valid email on lead
- SMTP configured in backend

---

## 6.12 Categories and Departments

These modules support routing and organization.

### Departments

Examples:

- general
- billing
- technical
- sales

### Categories

Examples:

- payment issue
- login problem
- demo request
- complaint
- refund request

What they work for:

- support routing
- clean classification
- reporting
- ticket organization

---

## 6.13 Shortcuts / Canned Responses

Shortcuts are reusable saved replies.

Process:

1. Open `Shortcuts`
2. Create shortcut keyword
3. Save full reply text
4. Use shortcut during chat

How to use in chat:

1. Type `/`
2. Enter shortcut name
3. Choose saved reply

What it works for:

- faster responses
- team consistency
- support efficiency

---

## 6.14 Reports Process

Reports are used by admin, client, manager, and optionally sales insights.

The reports center currently works for:

- live sessions
- range chats
- total visitors
- resolved tickets
- feedback/satisfaction
- SLA metrics
- growth charts
- top countries
- leaderboard
- export CSV
- print report

What reports work for:

- management review
- business reporting
- performance tracking
- executive oversight

---

## 6.15 Security Process

Security center works for:

- 2FA-related visibility
- audit-type monitoring
- webhook delivery visibility
- operational trust and debugging

What it works for:

- safer operations
- tracking sensitive changes
- integration monitoring

---

## 6.16 Billing / Subscription Process

Billing is used for:

- subscription management
- plan review
- client billing control

Plan access controls which modules are enabled:

- chat
- tickets
- CRM
- shortcuts
- reports
- security

What it works for:

- SaaS gating
- plan-based module access

---

## 7. Role-Based Working Process

## 7.1 Admin Daily Process

1. Open dashboard
2. Check notifications
3. Review clients
4. Review websites
5. Review team/staff
6. Monitor chats and tickets
7. Monitor CRM and reports
8. Review subscriptions and security when needed

## 7.2 Client Daily Process

1. Open dashboard
2. Review live metrics
3. Monitor chats
4. Monitor tickets
5. Review CRM
6. Review reports
7. Update staff/websites/categories when needed

## 7.3 Manager Daily Process

1. Open overview
2. Check active sessions
3. Open streams
4. Review tickets
5. Review CRM
6. Check assignments and team workload
7. Review reports if enabled

## 7.4 Agent Daily Process

1. Open active queue
2. Pick assigned chat
3. Reply to visitor
4. Use shortcuts if needed
5. Convert to ticket when issue needs tracking
6. Close chat when complete

## 7.5 Sales Daily Process

1. Open pipeline
2. Review my leads
3. Review due today tasks
4. Update stage
5. Add notes and interactions
6. Send follow-up email
7. Review chats assigned to sales
8. Check insights if enabled

---

## 8. Notifications in the Project

Notifications can include:

- new chat
- new ticket
- CRM lead assigned
- CRM follow-up due
- CRM duplicate detected
- SLA breach
- activity alert

What notifications work for:

- action reminders
- issue escalation
- assignment awareness

---

## 9. Activity Timeline

The activity system records important changes.

Examples:

- record created
- assignment changed
- stage changed
- note added
- task created
- task completed
- duplicate detected
- email sent
- SLA breached

What timeline works for:

- auditability
- team collaboration
- historical visibility

---

## 10. Data Relationships in the Project

The main data relationships are:

- `Website`
  contains operational scope
- `Visitor`
  website visitor identity
- `ChatSession`
  live or past chat session
- `Ticket`
  structured support case
- `Customer`
  CRM lead/customer record
- `FollowUpTask`
  CRM action item
- `Notification`
  alerts
- `ActivityEvent`
  timeline/audit-style system activity

Relationship flow:

- Website -> Visitor
- Visitor -> Chat Session
- Chat Session -> Ticket
- Chat Session -> Customer
- Customer -> Follow-up Task
- Customer -> Activity Timeline
- Ticket -> Activity Timeline

---

## 11. What Each Main Feature Works For

### Chat

Works for:

- live conversations
- support intake
- sales first contact

### Ticket

Works for:

- structured support handling
- issue ownership
- SLA monitoring

### CRM

Works for:

- lead pipeline
- relationship management
- sales operations

### Reports

Works for:

- management visibility
- team performance review
- business decision support

### Categories and Departments

Works for:

- routing
- structure
- cleaner operations

### Shortcuts

Works for:

- speed
- consistency
- support response efficiency

### Notifications

Works for:

- alerting
- reminders
- escalation awareness

### Security

Works for:

- trust
- audit visibility
- system protection

---

## 12. Environment and Startup

## 12.1 Install

```bash
npm install
```

## 12.2 Backend Environment

Create `backend/.env`

Example:

```env
PORT=5000
MONGODB_URI=mongodb://127.0.0.1:27017/chat-support
JWT_SECRET=change-me
CLIENT_URL=http://localhost:5173
WIDGET_PUBLIC_URL=http://localhost:5000/chat-widget.js

SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
SMTP_FROM=noreply@chatsupport.app

SLA_QUEUE_ALERT_MINUTES=5
SLA_TICKET_ALERT_HOURS=24
CRM_LEAD_REASSIGN_MINUTES=10
```

## 12.3 Run Development

Backend:

```bash
npm run dev:backend
```

Dashboard:

```bash
npm run dev:dashboard
```

Optional seed:

```bash
npm run seed
```

## 12.4 Build

```bash
npm run build
```

What build does:

- builds dashboard
- builds chat widget
- copies widget bundle into backend public folder

---

## 13. Example Real-World Scenarios

## 13.1 Support Problem Scenario

1. Visitor opens widget
2. Visitor reports issue
3. Agent handles chat
4. Issue needs follow-up
5. Agent converts chat to ticket
6. Ticket is assigned
7. Manager/client monitors progress
8. Ticket is resolved and closed

## 13.2 Sales Lead Scenario

1. Visitor asks for pricing/demo
2. Chat session starts
3. Lead is created in CRM
4. Lead is assigned to sales
5. Sales logs note/call/meeting
6. Sales sends proposal
7. Lead moves to negotiation
8. Lead becomes won or lost

## 13.3 Missed Lead Scenario

1. Lead is created
2. No one responds in configured time
3. Automation reassigns to another sales owner
4. Notification is sent
5. Activity timeline records reassignment

## 13.4 Duplicate Lead Scenario

1. User creates lead with same email/phone/company
2. Duplicate candidates are detected
3. Notification/activity is generated
4. Manager/client can review and merge

---

## 14. Troubleshooting Guide

### Chat Not Appearing

Check:

- backend is running
- dashboard is running
- widget is installed correctly
- website/API key is correct
- socket connection is active

### CRM Email Not Sending

Check:

- SMTP env values
- lead has valid email
- role has email permission

### User Cannot See Module

Check:

- user role
- plan/module access
- website assignment
- tenant assignment

### Ticket Not Updating

Check:

- user permission
- correct ticket scope
- backend validation

### Reports Look Empty

Check:

- date range
- selected website filter
- available activity data

### Widget Not Working On Website

Check:

- embed script installed
- API key valid
- backend reachable from website
- domain/host correct

---

## 15. Quick Summary

If you want the shortest explanation of the project:

- `Chat` handles live visitor conversations
- `Ticket` handles support cases and SLA follow-up
- `CRM` handles leads, pipeline, and sales work
- `Departments/Categories` organize routing
- `Shortcuts` speed up replies
- `Reports` show management insights
- `Security` adds audit/protection visibility
- `Billing` controls plan and access

And the role logic is:

- `Admin` controls the whole platform
- `Client` runs one business account
- `Manager` supervises team operations
- `Agent` handles support
- `User` handles basic support
- `Sales` handles CRM and lead closure

This project works as a full customer operations system from first visitor contact to support resolution or sales conversion.
