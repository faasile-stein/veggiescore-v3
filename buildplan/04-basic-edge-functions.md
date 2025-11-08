# Task 04: Basic Edge Functions

## Phase
Phase 0: Infrastructure & Foundations (Weeks 1-2)

## Objective
Create foundational Supabase Edge Functions for core API operations.

## Description
Implement basic Edge Functions (Deno) for place discovery, search, and job management. These will serve as the API layer between the frontend and backend.

## Edge Functions to Create

### 1. `discover_place`
- Accept place information (Google Place ID, name, location, website)
- Insert into `places` table
- Enqueue crawl job
- Return place ID and status

### 2. `search_places`
- Accept search parameters (query text, location, filters)
- Placeholder implementation for now (will be enhanced in Phase 4)
- Return list of places with basic filtering

### 3. `get_place`
- Accept place ID
- Return place details with menus and items
- Include computed VeggieScore

### 4. `health_check`
- Return system health status
- Check database connectivity
- Check worker queue status

## Tasks
1. Set up Supabase Edge Functions development environment
2. Create function templates
3. Implement `discover_place` function
4. Implement `search_places` function (basic version)
5. Implement `get_place` function
6. Implement `health_check` function
7. Add error handling and logging
8. Test all functions with Postman/curl
9. Deploy to Supabase

## Success Criteria
- [ ] Edge Functions development environment working
- [ ] All 4 functions created and deployed
- [ ] Functions callable via HTTP
- [ ] Error handling implemented
- [ ] Tests passing
- [ ] Documentation for each function
- [ ] CORS configured properly

## Dependencies
- Task 01: Supabase Setup
- Task 02: Database Schema
- Task 03: Worker Infrastructure

## Estimated Time
3-4 days

## Notes
- Edge Functions run on Deno runtime
- Keep functions lightweight and fast
- Use Supabase client for database operations
- Add authentication checks where needed
- Consider rate limiting
