# Task 15: Leaderboards

## Phase
Phase 3: Gamification + UX (Weeks 9-11)

## Objective
Implement leaderboard system with caching, real-time updates, and multiple scopes.

## Description
Build efficient leaderboard generation and caching system supporting global, city-based, and friend leaderboards with different timeframes and real-time updates.

## Leaderboard Types

### 1. Global Leaderboard
- All users worldwide
- Timeframes: daily, weekly, monthly, all-time

### 2. City Leaderboard
- Users in same city
- Automatic city detection
- Same timeframes

### 3. Friends Leaderboard
- User's friends only
- Competitive social element

## Tasks
1. Create leaderboard generation logic
2. Implement caching system
3. Build real-time update mechanism
4. Create Edge Function: `get_leaderboard`
5. Implement timeframe filtering
6. Build city-based scoping
7. Create friend leaderboard logic
8. Set up cache invalidation
9. Implement pagination
10. Add user rank calculation
11. Create scheduled updates (cron)
12. Test with load

## Implementation Details

```javascript
async function updateLeaderboard(scope = 'global', timeframe = 'all_time') {
  let query = supabase
    .from('points_transactions')
    .select('user_id, users(username, avatar_url)');

  // Apply timeframe filter
  if (timeframe !== 'all_time') {
    const start = getTimeframeStart(timeframe);
    query = query.gte('created_at', start.toISOString());
  }

  // Apply scope filter
  if (scope.startsWith('city:')) {
    const city = scope.split(':')[1];
    query = query.eq('metadata->>city', city);
  }

  const { data } = await query;

  // Aggregate points
  const leaderboard = aggregatePoints(data);

  // Sort and rank (top 100)
  const sorted = sortAndRank(leaderboard);

  // Cache result
  await cacheLeaderboard(scope, timeframe, sorted);

  return sorted;
}
```

## Caching Strategy
- Cache for 5 minutes
- Invalidate on point awards
- Scheduled updates every hour
- Store in `leaderboard_cache` table

## Success Criteria
- [ ] Leaderboard generation working
- [ ] Caching implemented
- [ ] Real-time updates functional
- [ ] All scopes supported
- [ ] Timeframes working
- [ ] Pagination implemented
- [ ] User rank calculation accurate
- [ ] Cache invalidation working
- [ ] Scheduled updates running
- [ ] Performance optimized (<500ms)
- [ ] Tested with 10K+ users

## Dependencies
- Task 13: Gamification Backend
- Task 02: Database Schema

## Estimated Time
4-5 days

## Notes
- Consider Redis for faster caching
- Monitor cache hit rates
- Add leaderboard tiers (top 10, 100, 1000)
- Show user's rank even if not in top 100
- Consider weekly tournaments
