# Quick Start Guide

Get up and running with SmartClaim AI in minutes.

## Prerequisites

Ensure you have completed the [Installation Guide](installation.md) before proceeding.

## Accessing the Application

1. Open your browser and navigate to `http://localhost:3000`
2. You will be redirected to the login page
3. Sign in with your credentials

## Creating Your First Ticket

### Step 1: Navigate to Dashboard

After logging in, you'll see the main dashboard. Click on **"New Ticket"** or navigate to the ticket submission form.

### Step 2: Choose Input Method

SmartClaim AI supports multiple input methods:

#### Text Input
1. Click the **Text** tab
2. Enter your incident description
3. Be as detailed as possible for accurate classification

#### Image Upload
1. Click the **Image** tab
2. Drag and drop an image or click to browse
3. Supported formats: JPG, PNG, WebP (max 10MB)

#### Voice Recording
1. Click the **Audio** tab
2. Click the microphone icon to start recording
3. Speak clearly about the incident
4. Click stop when finished

#### Document Upload
1. Click the **Document** tab
2. Upload PDF, Word, Excel, or other supported files
3. Text will be automatically extracted

### Step 3: Review AI Classification

After submitting your input, the AI will:

1. **Classify** your ticket into a category (Safety, Quality, Maintenance, etc.)
2. **Assign priority** (Critical, High, Medium, Low)
3. **Extract key information** from your input
4. **Predict SLA** for resolution time

### Step 4: Submit Ticket

Review the AI classification and:
- Confirm if accurate
- Modify if needed
- Add additional notes
- Submit the ticket

## Understanding the Dashboard

### Worker View

As a worker, you can see:
- **My Tickets**: Your submitted tickets
- **New Ticket**: Submit a new incident
- **Chat**: AI assistant for help
- **Profile**: Your account settings

### Manager View

As a department manager, you can see:
- **Department Queue**: All tickets in your department
- **Team Performance**: Analytics and metrics
- **Assignments**: Assign tickets to team members
- **Reports**: Generate department reports

### Admin View

As an administrator, you can see:
- **All Tickets**: Cross-department view
- **User Management**: Manage user accounts
- **Department Management**: Configure departments
- **System Settings**: Application configuration
- **AI Health**: Monitor AI services

## Using the AI Chat Assistant

1. Click the **Chat** icon in the navigation
2. Type your question or request
3. The AI will respond based on:
   - Your role (worker, manager, admin)
   - Your department context
   - Company policies and procedures

### Example Questions

**For Workers:**
- "How do I report a safety incident?"
- "What's the status of my ticket #123?"
- "What's the policy for equipment maintenance?"

**For Managers:**
- "Show me department performance this week"
- "What tickets are pending assignment?"
- "Generate a summary of open issues"

**For Admins:**
- "What's the system-wide SLA compliance?"
- "Which AI service has the highest load?"
- "Show cross-department trends"

## Ticket Lifecycle

```
┌─────────────┐
│   CREATED   │ ← Initial submission
└──────┬──────┘
       │
       ▼
┌─────────────┐
│   PENDING   │ ← Awaiting assignment
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  ASSIGNED   │ ← Assigned to handler
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ IN_PROGRESS │ ← Being worked on
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  RESOLVED   │ ← Solution implemented
└──────┬──────┘
       │
       ▼
┌─────────────┐
│   CLOSED    │ ← Verified and closed
└─────────────┘
```

## Next Steps

- [Features](features.md) - Explore all platform capabilities
- [User Roles](user-roles.md) - Understand permissions
- [API Reference](api-reference.md) - For developers
