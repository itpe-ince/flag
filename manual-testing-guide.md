# Manual Testing Guide

This guide provides step-by-step instructions for manually testing all game modes and features to ensure complete integration.

## Prerequisites

1. **Start Backend Server**
   ```bash
   cd backend
   npm run dev
   ```
   - Server should start on port 3501
   - Check console for "Server running on port 3501"
   - Verify database and Redis connections are successful

2. **Start Frontend Server**
   ```bash
   cd frontend
   npm run dev
   ```
   - Server should start on port 3500
   - Open browser to http://localhost:3500

## Test Scenarios

### 1. Application Startup and Navigation

**Test Steps:**
1. Open http://localhost:3500 in browser
2. Verify the main menu loads with three game mode options
3. Check that all UI elements are properly styled
4. Verify authentication section shows "Playing as Guest"

**Expected Results:**
- ✅ Main menu displays correctly
- ✅ Three game mode cards are visible (Single Player, Time Attack, Multiplayer)
- ✅ Authentication section shows guest status
- ✅ No console errors in browser developer tools

### 2. Single Player Game Mode

**Test Steps:**
1. Click "Single Player" mode
2. Read the game rules on the start screen
3. Click "Start Game"
4. Wait for first question to load
5. Verify question displays with 2 choices (Level 1)
6. Select correct answer and observe feedback
7. Verify level progression (4 choices on Level 2)
8. Continue until reaching higher levels or game over
9. Test incorrect answer to trigger game over
10. Verify final score display and restart functionality

**Expected Results:**
- ✅ Game rules display correctly
- ✅ First question loads with flag image and 2 choices
- ✅ Timer counts down from 30 seconds
- ✅ Correct answers advance to next level with doubled choices
- ✅ Score increases with level multipliers
- ✅ Incorrect answer or timeout ends game
- ✅ Game over screen shows final statistics
- ✅ Restart and back to menu buttons work

### 3. Time Attack Game Mode

**Test Steps:**
1. Return to main menu and click "Time Attack"
2. Read the game rules
3. Click "Start Game"
4. Answer questions continuously for 60 seconds
5. Verify timer counts down correctly
6. Test both correct and incorrect answers
7. Verify score updates in real-time
8. Wait for timer to reach zero
9. Check final score and leaderboard display

**Expected Results:**
- ✅ 60-second timer starts correctly
- ✅ Questions appear continuously
- ✅ Score updates with each correct answer
- ✅ Time bonus points are awarded for fast answers
- ✅ Game ends when timer reaches zero
- ✅ Final score is displayed
- ✅ Leaderboard shows rankings (if implemented)

### 4. Multiplayer Game Mode

**Test Steps:**
1. Return to main menu and click "Multiplayer"
2. Click "Create Room"
3. Verify room creation and lobby display
4. Note the room ID for joining from another browser/tab
5. Open second browser tab/window to http://localhost:3500
6. Navigate to Multiplayer and click "Join Room"
7. Enter the room ID from step 4
8. Verify both players appear in the lobby
9. Set ready status for both players
10. Start the game when both are ready
11. Answer questions simultaneously in both windows
12. Verify real-time score updates
13. Complete the game and check winner announcement

**Expected Results:**
- ✅ Room creation works and generates unique ID
- ✅ Room lobby displays current players
- ✅ Second player can join using room ID
- ✅ Ready status changes are synchronized
- ✅ Game starts when all players are ready
- ✅ Questions appear simultaneously for all players
- ✅ Scores update in real-time across all clients
- ✅ Winner is determined and announced correctly

### 5. Authentication System

**Test Steps:**
1. Click "Register" from main menu
2. Fill out registration form with test credentials
3. Submit registration and verify login
4. Check that username appears in header
5. Click "Profile" to view user statistics
6. Logout and verify return to guest status
7. Click "Login" and use the same credentials
8. Verify successful login and profile restoration

**Expected Results:**
- ✅ Registration form accepts valid input
- ✅ Successful registration logs user in automatically
- ✅ Username displays in header after login
- ✅ Profile shows user statistics and game history
- ✅ Logout returns to guest status
- ✅ Login with existing credentials works
- ✅ User session persists across page refreshes

### 6. Error Handling and Edge Cases

**Test Steps:**
1. **Network Interruption**: Disconnect internet during gameplay
2. **Invalid Room ID**: Try joining multiplayer with fake room ID
3. **Server Restart**: Restart backend server during active game
4. **Browser Refresh**: Refresh page during active game
5. **Multiple Tabs**: Open multiple game instances in same browser
6. **Slow Network**: Throttle network speed in browser dev tools

**Expected Results:**
- ✅ Graceful error messages for network issues
- ✅ Appropriate error for invalid room IDs
- ✅ Reconnection handling when server restarts
- ✅ Game state recovery or appropriate reset on refresh
- ✅ Multiple instances don't interfere with each other
- ✅ Game remains playable on slow connections

### 7. Performance and User Experience

**Test Steps:**
1. **Image Loading**: Verify flag images load quickly
2. **Response Time**: Check game responsiveness to clicks
3. **Memory Usage**: Monitor browser memory during extended play
4. **Mobile Compatibility**: Test on mobile device or browser dev tools
5. **Accessibility**: Test keyboard navigation and screen reader compatibility

**Expected Results:**
- ✅ Flag images load within 2 seconds
- ✅ UI responds immediately to user interactions
- ✅ No significant memory leaks during extended play
- ✅ Game is playable on mobile devices
- ✅ Basic accessibility features work

## API Endpoint Testing

### Manual API Tests

Use browser developer tools or a tool like Postman to test these endpoints:

1. **Health Check**
   ```
   GET http://localhost:3501/api/health
   ```
   Expected: `{"status": "OK", "message": "Flag Guessing Game API is running"}`

2. **Random Flag**
   ```
   GET http://localhost:3501/api/flags/random
   ```
   Expected: Flag data with country information

3. **Create Game**
   ```
   POST http://localhost:3501/api/games
   Content-Type: application/json
   
   {
     "mode": "single",
     "createdBy": "test-user-id",
     "settings": {"difficultyProgression": true}
   }
   ```
   Expected: Game creation response with game ID

4. **Generate Question**
   ```
   GET http://localhost:3501/api/games/{gameId}/question?round=1&level=1
   ```
   Expected: Question with flag and multiple choice options

## WebSocket Testing

### Manual WebSocket Tests

Use browser developer tools console to test WebSocket functionality:

```javascript
// Connect to WebSocket
const socket = io('http://localhost:3501');

// Listen for connection
socket.on('connect', () => {
  console.log('Connected:', socket.id);
});

// Create room
socket.emit('create_room', {
  settings: {
    maxPlayers: 4,
    roundCount: 10,
    timePerQuestion: 30
  }
}, (response) => {
  console.log('Room created:', response);
});

// Join room (use room ID from create response)
socket.emit('join_room', {
  roomId: 'ROOM_ID_HERE'
}, (response) => {
  console.log('Joined room:', response);
});
```

## Troubleshooting Common Issues

### Backend Issues
- **Database Connection Failed**: Check PostgreSQL is running and credentials in .env
- **Redis Connection Failed**: Check Redis server is running
- **Port Already in Use**: Kill process on port 3501 or change PORT in .env

### Frontend Issues
- **API Requests Failing**: Verify backend server is running on port 3501
- **WebSocket Connection Failed**: Check CORS settings and server availability
- **Build Errors**: Run `npm install` to ensure all dependencies are installed

### Game Issues
- **Images Not Loading**: Check CDN_BASE_URL in backend .env file
- **Questions Not Generating**: Verify flag data was seeded successfully
- **Multiplayer Not Working**: Check WebSocket connection and Redis availability

## Success Criteria

All tests pass when:
- ✅ All three game modes work correctly
- ✅ Authentication system functions properly
- ✅ Real-time multiplayer synchronization works
- ✅ Error handling is graceful and informative
- ✅ Performance is acceptable across different devices
- ✅ API endpoints respond correctly
- ✅ WebSocket connections are stable

## Next Steps After Manual Testing

1. **Document any issues found** during manual testing
2. **Fix critical bugs** before proceeding to deployment
3. **Optimize performance** if any issues are identified
4. **Proceed to Task 13.2** (deployment configuration) once all tests pass
5. **Consider automated E2E tests** for continuous integration

---

**Note**: This manual testing should be performed by at least two people to catch different types of issues and ensure the application works correctly across different browsers and devices.