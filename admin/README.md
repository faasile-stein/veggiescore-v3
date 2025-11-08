# VeggieScore Admin Dashboard

Admin dashboard for managing VeggieScore platform.

## Features

- **Dashboard**: Overview statistics (places, menus, items, jobs)
- **Place Management**: View and manage restaurants
- **Menu Editor**: Edit menu items and dietary labels
- **User Management**: View users and award points (coming soon)
- **Job Queue**: Monitor processing jobs (coming soon)
- **Audit Logs**: Track all admin actions (coming soon)

## Setup

1. Install dependencies:
```bash
npm install
```

2. Configure environment:
```bash
cp .env.example .env.local
# Edit .env.local with your Supabase credentials
```

3. Run development server:
```bash
npm run dev
```

4. Open http://localhost:3001

## Admin Access

To grant admin access to a user:

```sql
-- First, create a user via Supabase Auth
-- Then grant admin role:
INSERT INTO admin_users (user_id, role)
VALUES ('<user-id>', 'admin');
```

## Roles

- **admin**: Full access to all features
- **moderator**: Can view places, edit menus, ban users
- **content_editor**: Can view places, edit menus
- **data_ops**: Can view jobs, trigger reprocessing

## Features by Page

### Dashboard (`/dashboard`)
- Total places, menus, items
- Pending jobs count
- Quick actions

### Places (`/dashboard/places`)
- List all places
- Search and filter
- View VeggieScore

### Place Details (`/dashboard/places/[id]`)
- View place information
- See all menus
- Trigger reprocessing

### Menu Editor (`/dashboard/menus/[id]`)
- Edit menu items inline
- Update names, descriptions, prices
- View dietary labels
- Changes logged in audit trail

## Tech Stack

- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS
- Radix UI components
- Supabase (Auth + Database)

## Development

```bash
# Run development server
npm run dev

# Build for production
npm run build

# Run production server
npm start
```

## Deployment

Deploy to Vercel:

```bash
vercel
```

Or use Docker:

```bash
docker build -t veggiescore-admin .
docker run -p 3001:3001 veggiescore-admin
```
