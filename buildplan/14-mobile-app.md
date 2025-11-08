# Task 14: Mobile App

## Phase
Phase 3: Gamification + UX (Weeks 9-11)

## Objective
Build the Expo-based mobile application for iOS and Android with search, discovery, and gamification features.

## Description
Create a full-featured mobile app using Expo/React Native with location-based search, menu uploads via camera, gamification UI, social features, and offline support.

## Core Features

### 1. Search & Discovery
- Location-based search
- Map view with pins
- Filter by dietary preferences
- VeggieScore display
- Place details page

### 2. Menu Upload
- Camera integration
- Photo gallery selection
- Upload progress
- Points notification

### 3. Gamification
- User profile with level/points
- Badge collection display
- Quest list with progress
- Leaderboards (global, local, friends)

### 4. Social Features
- Activity feed
- Friend system
- Share places
- Achievement sharing

### 5. Offline Support
- Cache recent searches
- Offline place viewing
- Sync on reconnect

## Tasks
1. Set up Expo project
2. Configure navigation (React Navigation)
3. Implement authentication flow
4. Build search screen with map
5. Create place details screen
6. Implement camera/photo upload
7. Build user profile screen
8. Create badge collection screen
9. Implement quest tracking UI
10. Build leaderboard screens
11. Add social feed
12. Implement offline caching
13. Set up push notifications
14. Test on iOS and Android
15. Submit to app stores (TestFlight/Play Console)

## Screens to Build
- `/search` - Search with map
- `/place/[id]` - Place details
- `/upload` - Camera/upload flow
- `/profile` - User profile
- `/badges` - Badge collection
- `/quests` - Quest list
- `/leaderboard` - Leaderboards
- `/feed` - Social activity feed
- `/settings` - App settings

## Tech Stack
- Expo SDK 49+
- React Navigation
- Supabase JS Client
- Expo Camera
- Expo Location
- React Native Maps

## Success Criteria
- [ ] Expo project set up
- [ ] Navigation working
- [ ] Authentication functional
- [ ] Search with map complete
- [ ] Place details working
- [ ] Camera upload functional
- [ ] Profile screen complete
- [ ] Badges displaying
- [ ] Quests tracking
- [ ] Leaderboards working
- [ ] Offline mode functional
- [ ] Push notifications working
- [ ] Tested on both platforms
- [ ] Submitted to stores

## Dependencies
- Task 13: Gamification Backend
- Task 04: Basic Edge Functions

## Estimated Time
12-14 days

## Notes
- Use Expo EAS for builds
- Implement proper error boundaries
- Add loading states everywhere
- Optimize image uploads
- Test on various device sizes
- Plan for app updates
