<div align="center">

# Project Management Platform


Built with the **PERN Stack** — PostgreSQL, Express.js, React.js & Node.js.

Manage organizations, projects, tasks, and team collaboration from one place.

<br/>

![React](https://img.shields.io/badge/React.js-2026-blue?style=for-the-badge&logo=react&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-20+-green?style=for-the-badge&logo=node.js&logoColor=white)
![Express](https://img.shields.io/badge/Express.js-Backend-black?style=for-the-badge&logo=express&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Database-blue?style=for-the-badge&logo=postgresql&logoColor=white)
![Vercel](https://img.shields.io/badge/Deployed-Vercel-black?style=for-the-badge&logo=vercel&logoColor=white)

</div>

---

## About The Project

**Project Management Platform** is a modern full-stack application designed to help organizations manage their **projects, tasks, and team collaboration** efficiently.

The platform provides secure authentication, organization management, task assignment, automated email notifications, due-date reminders, and background job processing.

---

## Features

### Authentication & Organizations
- Secure authentication using **Clerk**
- Create and manage multiple organizations
- Invite team members
- Organization-based access control

### Project Management
- Create multiple projects
- Organize projects within organizations
- Manage project-related tasks

### Task Management
- Create tasks
- Assign tasks to team members
- Update task status
- Track task progress
- Manage task due dates

### Email Notifications
- Automatic email when a task is assigned
- Due-date reminder emails
- Automated notification workflow

### Background Jobs
- Background job processing using **Inngest**
- Automated task reminder processing
- Event-driven workflows

### User Experience
- Responsive design
- Clean and user-friendly interface
- Works across desktop and mobile devices

### Deployment
- Frontend and backend deployed using **Vercel**
- PostgreSQL database hosted on **Neon**

---

## Tech Stack

| Category | Technologies |
|----------|--------------|
| Frontend | React.js, JavaScript, CSS |
| Backend | Node.js, Express.js |
| Database | PostgreSQL, Neon |
| Authentication | Clerk |
| Background Jobs | Inngest |
| Email | Email Notification System |
| Deployment | Vercel |

---

## Application Architecture

```text
                    ┌─────────────────────┐
                    │       User          │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │    React.js UI      │
                    │     Frontend        │
                    └──────────┬──────────┘
                               │
                         REST API
                               │
                               ▼
                    ┌─────────────────────┐
                    │   Express.js API    │
                    │      Backend        │
                    └──────┬───────┬──────┘
                           │       │
              ┌────────────┘       └─────────────┐
              ▼                                  ▼
     ┌─────────────────┐                ┌─────────────────┐
     │   PostgreSQL    │                │     Inngest     │
     │      Neon       │                │ Background Jobs │
     └─────────────────┘                └────────┬────────┘
                                                  │
                                                  ▼
                                       ┌──────────────────┐
                                       │ Email Notification│
                                       └──────────────────┘
