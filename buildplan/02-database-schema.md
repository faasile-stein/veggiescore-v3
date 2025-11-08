# Task 02: Database Schema

## Phase
Phase 0: Infrastructure & Foundations (Weeks 1-2)

## Objective
Create complete database schema with all tables, indexes, and Row-Level Security (RLS) policies.

## Description
Implement the full database schema including core tables (places, menus, menu_items), processing tables (crawl_runs, jobs, raw_artifacts), gamification tables (points_transactions, user_levels, badges, quests), and admin tables (audit_logs, manual_overrides).

## Tables to Create

### Core Tables
1. `places` - Restaurant/place information
2. `menus` - Menu metadata
3. `menu_items` - Individual menu items with embeddings

### Crawling & Processing Tables
4. `crawl_runs` - Tracking crawler executions
5. `raw_artifacts` - Storage references for crawled files
6. `jobs` - Job queue for workers

### Gamification Tables
7. `points_transactions` - User point awards
8. `user_levels` - User level/tier tracking
9. `user_badges` - Badge achievements
10. `quests` - Quest definitions
11. `user_quests` - User quest progress
12. `leaderboard_cache` - Cached leaderboard data

### Admin & Audit Tables
13. `admin_audit_logs` - Admin action logging
14. `manual_overrides` - Manual data corrections

## Tasks
1. Create all table definitions with proper data types
2. Set up foreign key relationships
3. Create indexes for performance:
   - GiST index on place locations
   - IVFFlat index on embeddings
   - Indexes on frequently queried columns
4. Implement Row-Level Security (RLS) policies
5. Create seed data for testing
6. Test schema with sample queries

## Success Criteria
- [ ] All tables created successfully
- [ ] Foreign key relationships working
- [ ] Indexes created and verified
- [ ] RLS policies implemented
- [ ] Seed data inserted
- [ ] Schema tested with sample queries
- [ ] Migration files created

## Dependencies
- Task 01: Supabase Setup

## Estimated Time
3-4 days

## Notes
- Reference DEVELOPMENT_PLAN.md for complete table definitions
- Test RLS policies thoroughly for security
- Consider partitioning for large tables in the future
