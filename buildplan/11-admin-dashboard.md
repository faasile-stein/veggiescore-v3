# Task 11: Admin Dashboard

## Phase
Phase 2: Parsing, Labeling & Admin (Weeks 6-8)

## Objective
Build a web-based admin dashboard for managing places, menus, and processing jobs.

## Description
Create a Next.js admin dashboard with SSO authentication, RBAC, and comprehensive management tools for places, menus, users, and system health.

## Core Features

### 1. Authentication & Authorization
- SSO setup (Auth0 or similar)
- Role-based access control (RBAC)
- MFA support
- Session management

### 2. Place Management
- List all places with filters
- View place details
- View crawl history
- Trigger manual reprocessing
- View/edit menus
- Claim/opt-out management

### 3. Menu Management
- View parsed menus
- Edit menu items
- Manual overrides
- Confidence score display
- Compare original vs parsed

### 4. User Management
- View user list
- User activity tracking
- Ban/suspend users
- View points/badges
- Fraud detection flags

### 5. System Health
- Worker status
- Job queue monitoring
- Error tracking
- Performance metrics
- Cost tracking

## Tasks
1. Set up Next.js admin application
2. Configure SSO authentication
3. Implement RBAC system
4. Create admin layout and navigation
5. Build place management pages
6. Create menu editor interface
7. Implement user management
8. Build system health dashboard
9. Create audit logging
10. Add search and filtering
11. Implement data export
12. Deploy admin dashboard

## Pages to Create
- `/admin` - Dashboard overview
- `/admin/places` - Place list
- `/admin/places/[id]` - Place details
- `/admin/menus/[id]` - Menu editor
- `/admin/users` - User management
- `/admin/jobs` - Job queue
- `/admin/system` - System health
- `/admin/audit` - Audit logs

## RBAC Roles
```javascript
const ROLES = {
  admin: ['*'], // All permissions
  moderator: ['view:places', 'edit:menus', 'ban:users'],
  content_editor: ['view:places', 'edit:menus'],
  data_ops: ['view:jobs', 'trigger:reprocess']
};
```

## Success Criteria
- [ ] Next.js app deployed
- [ ] SSO authentication working
- [ ] RBAC implemented
- [ ] All management pages functional
- [ ] Menu editor working
- [ ] User management complete
- [ ] System health dashboard live
- [ ] Audit logging functional
- [ ] Search/filtering working
- [ ] Mobile responsive
- [ ] Performance optimized

## Dependencies
- Task 02: Database Schema
- Task 04: Basic Edge Functions

## Estimated Time
8-10 days

## Notes
- Use Next.js 13+ with App Router
- Consider using admin UI library (React Admin, etc.)
- Implement real-time updates where needed
- Add comprehensive error handling
- Plan for internationalization
