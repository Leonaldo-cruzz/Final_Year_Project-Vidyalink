# Notifications Module — VIDYALINK

## Overview

The **Notifications Module** provides a complete in-app notification system across all supported roles on the VIDYALINK platform: **Student**, **Faculty**, **Recruiter**, **Alumni**, and **Admin**.

It enables real-time awareness for critical platform events such as certificate verification status changes, recruitment candidate shortlisting, interview scheduling, mentorship lifecycle updates, skill endorsements, and job referrals.

---

## Architecture

```
┌────────────────────────────────────────────────────────┐
│                   Domain Services                      │
│ (Certificate, Application, Mentorship, Referral, etc.) │
└───────────────────────────┬────────────────────────────┘
                            │ (calls safe dispatchers)
                            ▼
┌────────────────────────────────────────────────────────┐
│             NotificationEventsService                  │
│       (Resilient, fail-safe event wrappers)            │
└───────────────────────────┬────────────────────────────┘
                            │ (creates notification doc)
                            ▼
┌────────────────────────────────────────────────────────┐
│                 NotificationService                    │
│      (CRUD, Pagination, Unread Counts, Read State)     │
└───────────────────────────┬────────────────────────────┘
                            │ (persists document)
                            ▼
┌────────────────────────────────────────────────────────┐
│                 MongoDB: Notification                  │
│  (Indexed by recipientId+createdAt, recipientId+isRead)│
└───────────────────────────┬────────────────────────────┘
                            │ (REST APIs)
                            ▼
┌────────────────────────────────────────────────────────┐
│              Frontend Notification UI                  │
│  (NotificationBell, Dropdown, Center /notifications)   │
└────────────────────────────────────────────────────────┘
```

---

## Notification Model Schema

| Field | Type | Required | Description |
|---|---|---|---|
| `recipientId` | `ObjectId` (Ref: `User`) | Yes | The user receiving the notification |
| `actorId` | `ObjectId` (Ref: `User`) | No | The user who triggered the event (if applicable) |
| `type` | `String` (Enum) | Yes | Specific notification event type |
| `title` | `String` | Yes | Short, descriptive title (2–200 chars) |
| `message` | `String` | Yes | Notification message text (2–2000 chars) |
| `entityType` | `String` | No | Associated entity model (e.g. `'Application'`, `'Certificate'`, `'MentorshipRequest'`, `'Referral'`) |
| `entityId` | `ObjectId` | No | Specific database ID of the referenced entity |
| `metadata` | `Mixed` (Object) | No | Flexible payload storing contextual keys |
| `isRead` | `Boolean` | Default: `false` | Read status |
| `readAt` | `Date` | Default: `null` | Timestamp when marked as read |
| `createdAt` | `Date` | Auto | Creation timestamp |
| `updatedAt` | `Date` | Auto | Last update timestamp |

### Indexes
- `{ recipientId: 1, createdAt: -1 }` (Optimizes newest-first inbox queries)
- `{ recipientId: 1, isRead: 1, createdAt: -1 }` (Optimizes unread filter and badge count)
- `{ type: 1 }` (Optimizes type filtering)
- `{ entityType: 1, entityId: 1 }` (Optimizes entity lookups)

---

## Notification Types & Enums

### 1. Verification
- `VERIFICATION_SUBMITTED` — Student submits certificate/portfolio for faculty verification.
- `VERIFICATION_APPROVED` — Faculty approves verification.
- `VERIFICATION_REJECTED` — Faculty rejects verification.
- `CHANGES_REQUESTED` — Faculty requests modifications on submitted item.

### 2. Recruitment & Interviews
- `SHORTLISTED` — Recruiter shortlists student for a project or role.
- `INTERVIEW_SCHEDULED` — Interview scheduled with date, time, and mode.
- `INTERVIEW_RESCHEDULED` — Interview rescheduled to new date/time.
- `INTERVIEW_CANCELLED` — Interview cancelled.
- `INTERVIEW_COMPLETED` — Interview concluded / candidate selected.

### 3. Alumni & Mentorship
- `MENTORSHIP_REQUEST` — Student requests mentorship from verified alumni.
- `MENTORSHIP_ACCEPTED` — Alumni accepts mentorship request.
- `MENTORSHIP_DECLINED` — Alumni declines request with optional response message.
- `MENTORSHIP_COMPLETED` — Mentorship session marked complete.

### 4. Endorsements & Referrals
- `SKILL_ENDORSEMENT` — Alumni endorses a skill on student's verified profile.
- `REFERRAL_CREATED` — Alumni creates a job referral for student.
- `REFERRAL_UPDATED` — Referral status changes (e.g. `SUBMITTED`, `REFERRED`, `REJECTED`).

### 5. Portfolio & System
- `PORTFOLIO_UPDATED` — Portfolio updates.
- `SYSTEM` — Platform announcements and system alerts.

---

## Backend REST API Endpoints

All notification endpoints require a valid JWT `Authorization: Bearer <token>`. Users can only access, update, or delete their own notifications.

### 1. List Notifications
- **Method:** `GET`
- **Path:** `/api/v1/notifications`
- **Query Parameters:**
  - `page` (default: 1)
  - `limit` (default: 20, max: 100)
  - `isRead` (`true` | `false`)
  - `type` (Comma-separated notification types or single type)
  - `entityType` (Optional filter by referenced model name)
- **Response (200 OK):**
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Notifications fetched successfully",
  "data": {
    "notifications": [
      {
        "_id": "6a873832a0e77b584ad7c639",
        "recipientId": "6a87380a0dfb6e63aefb611b",
        "actorId": {
          "_id": "6a87380a0dfb6e63aefb6121",
          "fullName": "Acme Recruiter",
          "email": "recruiter@acme.com",
          "role": "recruiter"
        },
        "type": "SHORTLISTED",
        "title": "You Have Been Shortlisted!",
        "message": "Congratulations! You have been shortlisted for 'Backend Architecture Sprint'.",
        "entityType": "Application",
        "entityId": "6a87380b6eb3c721128bbe11",
        "isRead": false,
        "readAt": null,
        "createdAt": "2026-08-20T17:23:55.000Z"
      }
    ],
    "pagination": {
      "total": 1,
      "page": 1,
      "limit": 20,
      "totalPages": 1,
      "hasPrevPage": false,
      "hasNextPage": false
    },
    "unreadCount": 1
  }
}
```

### 2. Get Unread Notifications
- **Method:** `GET`
- **Path:** `/api/v1/notifications/unread`
- **Query Parameters:** `page`, `limit`, `type`

### 3. Get Unread Count
- **Method:** `GET`
- **Path:** `/api/v1/notifications/unread-count`
- **Response (200 OK):**
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Unread count fetched successfully",
  "data": {
    "unreadCount": 3
  }
}
```

### 4. Mark Single as Read
- **Method:** `PATCH`
- **Path:** `/api/v1/notifications/:id/read`
- **Response (200 OK):**
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Notification marked as read",
  "data": {
    "notification": {
      "_id": "6a873832a0e77b584ad7c639",
      "isRead": true,
      "readAt": "2026-08-20T17:24:00.000Z"
    }
  }
}
```

### 5. Mark All as Read
- **Method:** `PATCH`
- **Path:** `/api/v1/notifications/read-all`
- **Response (200 OK):**
```json
{
  "success": true,
  "statusCode": 200,
  "message": "All notifications marked as read",
  "data": {
    "modifiedCount": 3,
    "readAt": "2026-08-20T17:24:05.000Z"
  }
}
```

### 6. Delete Single Notification
- **Method:** `DELETE`
- **Path:** `/api/v1/notifications/:id`
- **Response (200 OK):**
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Notification deleted successfully"
}
```

### 7. Delete All Notifications
- **Method:** `DELETE`
- **Path:** `/api/v1/notifications`
- **Response (200 OK):**
```json
{
  "success": true,
  "statusCode": 200,
  "message": "All notifications deleted successfully",
  "data": {
    "deletedCount": 5
  }
}
```

---

## Frontend Components

### 1. `NotificationBell` (`client/src/components/notifications/NotificationBell.jsx`)
- Positioned in the Topbar header.
- Displays animated pill counter when `unreadCount > 0`.
- Polls `/api/v1/notifications/unread-count` every 30 seconds.
- Clicking toggles the `NotificationDropdown`.

### 2. `NotificationDropdown` (`client/src/components/notifications/NotificationDropdown.jsx`)
- Shows up to 8 recent notifications.
- Includes quick "Mark all read" button.
- Clean loading, empty, and error states.
- Footer navigation link to `/notifications`.

### 3. `NotificationItem` (`client/src/components/notifications/NotificationItem.jsx`)
- Displays category icon, title, message, relative timestamp (`"5m ago"`, `"Yesterday"`).
- Highlights unread items with an active blue indicator dot.
- Supports single-click to mark as read and navigate to the related entity (`/certificates`, `/projects`, `/workspaces`, `/portfolio/me`, etc.).
- Quick mark-read and delete buttons on hover.

### 4. `Notifications` Page (`client/src/pages/notifications/Notifications.jsx`)
- Full Notification Center accessible at `/notifications`.
- Filter tabs: **All**, **Unread**, **Read**.
- Category chips: **Verification**, **Recruitment**, **Interviews**, **Mentorship**, **Endorsements & Referrals**, **System**.
- Global actions: **Mark all read**, **Clear all**, **Refresh**.
- Full pagination support (page size: 15).

---

## Testing

### Run Backend Notification Tests
```bash
# In the server directory:
npm run test:notifications
```

**Test Suite Coverage (36 assertions):**
- List notifications & unread count verification
- Unread filter & type filtering
- Pagination metadata verification
- Mark single read & mark all read
- Delete single & delete all notifications
- User isolation & cross-tenant security verification
- Event dispatcher integration
