# VeggieScore Mobile App

React Native mobile application for VeggieScore - discover and explore vegetarian-friendly restaurants.

## Features

- 🔍 **Restaurant Search**: Find restaurants by name with VeggieScore ratings
- 👤 **User Profile**: Track your level, badges, and achievements
- 🏆 **Badge Collection**: Unlock achievements as you explore
- 📋 **Quest System**: Complete challenges to earn points
- 🏅 **Leaderboards**: Compete globally with daily, weekly, and all-time rankings

## Tech Stack

- **Framework**: Expo SDK 50
- **Language**: TypeScript
- **Navigation**: React Navigation 6 (Bottom Tabs)
- **Backend**: Supabase (PostgreSQL + Edge Functions)
- **UI**: React Native + Expo Vector Icons

## Prerequisites

- Node.js 18+ and npm/yarn
- Expo CLI (`npm install -g expo-cli`)
- iOS Simulator (macOS) or Android Emulator
- Supabase project with VeggieScore schema

## Installation

1. **Install dependencies**:
   ```bash
   cd mobile
   npm install
   ```

2. **Configure Supabase**:

   Create `mobile/.env` file:
   ```env
   EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   ```

3. **Start development server**:
   ```bash
   npm start
   ```

4. **Run on device**:
   - Press `i` for iOS Simulator
   - Press `a` for Android Emulator
   - Scan QR code with Expo Go app on physical device

## Project Structure

```
mobile/
├── App.tsx                        # Main app entry with navigation
├── src/
│   ├── lib/
│   │   └── supabase.ts           # Supabase client configuration
│   └── screens/
│       ├── SearchScreen.tsx      # Restaurant search
│       ├── ProfileScreen.tsx     # User profile & stats
│       ├── BadgesScreen.tsx      # Badge collection
│       ├── QuestsScreen.tsx      # Quest tracking
│       └── LeaderboardScreen.tsx # Leaderboards
├── package.json
├── tsconfig.json
├── app.json                       # Expo configuration
└── .env                          # Environment variables (not committed)
```

## Screens

### 🔍 Search Screen
Search for restaurants and view their VeggieScore ratings. Displays:
- Restaurant name and address
- Cuisine types
- VeggieScore badge (0-100)

### 👤 Profile Screen
Your personal dashboard showing:
- Current level (Bronze/Silver/Gold/Platinum)
- Total points earned
- Places discovered, menus uploaded, badges unlocked
- Global ranking
- Recent activity feed

### 🏆 Badges Screen
Collection of unlocked achievements:
- Badge icon and name
- Tier level (Bronze/Silver/Gold)
- Description and unlock date
- Color-coded borders by tier

### 📋 Quests Screen
Active and completed challenges:
- Quest title and description
- Reward points
- Progress bar for active quests
- Completion dates for finished quests

### 🏅 Leaderboard Screen
Compete with other users:
- Daily, Weekly, All-Time timeframes
- Top 3 users with trophy icons
- User rank, level, and total points
- Medal colors for podium positions

## API Integration

The app connects to Supabase Edge Functions:

- `GET /functions/v1/get-user-stats` - User profile data
- `GET /functions/v1/get-leaderboard` - Leaderboard data
- Direct Supabase queries for places and menus

## Configuration

### Supabase Client (`src/lib/supabase.ts`)

```typescript
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Helper functions
export async function getUserStats() { ... }
export async function getLeaderboard(...) { ... }
```

## Development

### Running Tests
```bash
npm test
```

### Type Checking
```bash
npm run tsc
```

### Linting
```bash
npm run lint
```

### Building for Production

**iOS**:
```bash
expo build:ios
```

**Android**:
```bash
expo build:android
```

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `EXPO_PUBLIC_SUPABASE_URL` | Supabase project URL | Yes |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous key | Yes |

## Troubleshooting

### "Unable to resolve module @supabase/supabase-js"
```bash
npm install @supabase/supabase-js
expo start -c
```

### Expo Go Connection Issues
- Ensure phone and computer are on same WiFi network
- Try tunnel mode: `expo start --tunnel`

### TypeScript Errors
```bash
npm install --save-dev @types/react @types/react-native
```

## Authentication (Future)

Currently uses anonymous access. Production deployment requires:
1. Implement Supabase Auth in `App.tsx`
2. Add login/signup screens
3. Store session tokens securely
4. Update RLS policies to require authentication

## Known Limitations

- No offline support (requires network connection)
- Place details screen not yet implemented
- Image upload functionality pending (Phase 1)
- Push notifications not configured

## Contributing

1. Create feature branch
2. Make changes with TypeScript
3. Test on both iOS and Android
4. Submit pull request

## Related Documentation

- [Main Project README](../README.md)
- [Phase 3 Completion Report](../PHASE_3_COMPLETE.md)
- [Supabase Setup](../PHASE_0_SETUP.md)
- [Expo Documentation](https://docs.expo.dev/)
- [React Navigation](https://reactnavigation.org/)

## License

MIT License - See [LICENSE](../LICENSE) for details
