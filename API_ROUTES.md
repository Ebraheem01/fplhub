# FPL API Routes

This project uses Next.js API routes to proxy FPL (Fantasy Premier League) API calls. All routes are prefixed with `/api/fpl/`.

## Available Endpoints

### Bootstrap Data

- **GET** `/api/fpl/bootstrap-static` - Get core game data (players, teams, gameweeks, etc.)

### Player Data

- **GET** `/api/fpl/player/{playerId}` - Get detailed player statistics

### Manager Data

- **GET** `/api/fpl/manager/{managerId}` - Get manager profile
- **GET** `/api/fpl/manager/{managerId}/history` - Get manager's season history
- **GET** `/api/fpl/manager/{managerId}/picks/{gameweek}` - Get manager's picks for a gameweek
- **GET** `/api/fpl/manager/{managerId}/transfers` - Get manager's transfers

### Live Data

- **GET** `/api/fpl/live/{gameweek}` - Get live gameweek data
- **GET** `/api/fpl/dream-team/{gameweek}` - Get dream team for a gameweek

### Fixtures & Leagues

- **GET** `/api/fpl/fixtures` - Get all fixtures
- **GET** `/api/fpl/league/{leagueId}?page={page}` - Get league standings (with pagination)

### Game Status

- **GET** `/api/fpl/event-status` - Get current game status

## Features

- **Caching**: All routes implement intelligent caching based on data volatility
- **Error Handling**: Comprehensive error handling with appropriate HTTP status codes
- **Validation**: Input validation for all parameters
- **Performance**: Optimized cache headers for better performance

## Cache Strategy

- Bootstrap Static: 15 minutes (data rarely changes)
- Live Data: 2 minutes (updates frequently during matches)
- Manager Data: 5 minutes (can change before deadlines)
- Fixtures: 30 minutes (relatively static)
- Dream Team: 30 minutes (calculated after gameweek ends)

## Usage

Replace direct FPL API calls with these local API routes:

```javascript
// Old way (direct FPL API)
const response = await fetch(
  "https://fantasy.premierleague.com/api/bootstrap-static/"
);

// New way (Next.js API route)
const response = await fetch("/api/fpl/bootstrap-static");
```
