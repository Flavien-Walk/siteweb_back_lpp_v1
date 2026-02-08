/**
 * Test script for Red Team security fixes verification
 * Run with: node scripts/test-redteam-fixes.js
 *
 * NOTE: These are structural/code-level verification tests.
 * They check that the fixes are correctly implemented in the source code
 * without requiring a running MongoDB or server instance.
 */

const fs = require('fs');
const path = require('path');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  ✅ ${name}`);
    passed++;
  } catch (err) {
    console.log(`  ❌ ${name}: ${err.message}`);
    failed++;
  }
}

function assert(condition, msg) {
  if (!condition) throw new Error(msg || 'Assertion failed');
}

function readSrc(relPath) {
  return fs.readFileSync(path.join(__dirname, '..', 'src', relPath), 'utf-8');
}

// ============================================
console.log('\n🔴 RED-04: Socket rate limiting');
// ============================================
const socketCode = readSrc('socket/index.ts');

test('SocketRateLimiter class exists', () => {
  assert(socketCode.includes('class SocketRateLimiter'), 'Missing SocketRateLimiter class');
});

test('Rate limiters defined for all events', () => {
  assert(socketCode.includes('get_unread_counts: new SocketRateLimiter'), 'Missing get_unread_counts limiter');
  assert(socketCode.includes('join_conversation: new SocketRateLimiter'), 'Missing join_conversation limiter');
  assert(socketCode.includes('typing: new SocketRateLimiter'), 'Missing typing limiter');
  assert(socketCode.includes('message_read: new SocketRateLimiter'), 'Missing message_read limiter');
});

test('checkRateLimit called before each event handler', () => {
  // Count occurrences of checkRateLimit
  const matches = socketCode.match(/checkRateLimit\(socket/g);
  assert(matches && matches.length >= 4, `Expected ≥4 checkRateLimit calls, found ${matches?.length || 0}`);
});

test('rate_limited event emitted on limit exceeded', () => {
  assert(socketCode.includes("socket.emit('rate_limited'"), 'Missing rate_limited emission');
});

// ============================================
console.log('\n🔴 RED-05: Max connections per user');
// ============================================

test('MAX_SOCKETS_PER_USER constant defined', () => {
  assert(socketCode.includes('MAX_SOCKETS_PER_USER = 5'), 'Missing or wrong MAX_SOCKETS_PER_USER');
});

test('Oldest socket disconnected on overflow', () => {
  assert(socketCode.includes('force_disconnect'), 'Missing force_disconnect logic');
  assert(socketCode.includes('oldSocket.disconnect(true)'), 'Missing oldSocket.disconnect');
});

// ============================================
console.log('\n🔴 RED-06: Force leave on HTTP removal');
// ============================================

test('forceLeaveConversation exported', () => {
  assert(socketCode.includes('export function forceLeaveConversation'), 'Missing forceLeaveConversation export');
});

test('force_leave event emitted to removed user', () => {
  assert(socketCode.includes("socket.emit('force_leave'"), 'Missing force_leave emission');
});

const messagerieCode = readSrc('controllers/messagerieController.ts');

test('forceLeaveConversation imported in messagerie controller', () => {
  assert(messagerieCode.includes('forceLeaveConversation'), 'Missing import');
});

test('forceLeaveConversation called in retirerParticipant', () => {
  // Check it's called near participant removal (atomic $pull)
  const idx1 = messagerieCode.indexOf('forceLeaveConversation(participantId');
  const idx2 = messagerieCode.indexOf('$pull: { participants:');
  assert(idx1 > 0 && idx2 > 0, 'forceLeaveConversation not found near atomic participant removal');
});

// ============================================
console.log('\n🔴 RED-01: Atomic project followers');
// ============================================
const projetCode = readSrc('controllers/projetController.ts');

test('$addToSet used for follow', () => {
  assert(projetCode.includes('$addToSet: { followers: userId }'), 'Missing $addToSet for followers');
});

test('$pull used for unfollow', () => {
  assert(projetCode.includes('$pull: { followers: userId }'), 'Missing $pull for followers');
});

test('No non-atomic push/splice for followers', () => {
  // The toggleSuivreProjet should NOT have projet.followers.push or splice
  const funcStart = projetCode.indexOf('toggleSuivreProjet');
  const funcEnd = projetCode.indexOf('catch (error)', funcStart);
  const funcCode = projetCode.substring(funcStart, funcEnd);
  assert(!funcCode.includes('projet.followers.push'), 'Still uses non-atomic push');
  assert(!funcCode.includes('projet.followers.splice'), 'Still uses non-atomic splice');
});

// ============================================
console.log('\n🔴 RED-02: Atomic friend accept');
// ============================================
const userCode = readSrc('controllers/utilisateurController.ts');

test('$addToSet used for amis in accepter', () => {
  assert(userCode.includes('$addToSet: { amis:'), '$addToSet not found for amis');
});

test('$pull used for demandesAmis in accepter', () => {
  assert(userCode.includes('$pull: { demandesAmisRecues:'), '$pull not found for demandesAmisRecues');
});

test('findOneAndUpdate with condition for accept (race-safe)', () => {
  assert(userCode.includes('findOneAndUpdate'), 'Missing findOneAndUpdate');
  assert(userCode.includes('demandesAmisRecues: demandeur._id'), 'Missing condition in findOneAndUpdate');
});

// ============================================
console.log('\n🔴 RED-07: Block email change');
// ============================================
const profilCode = readSrc('controllers/profilController.ts');

test('Email change blocked in modifierProfil', () => {
  assert(profilCode.includes('RED-07'), 'Missing RED-07 marker');
  assert(
    profilCode.includes("Le changement d'email n'est pas autorisé") ||
    profilCode.includes("Le changement d\\'email n\\'est pas autorisé"),
    'Missing email block error message'
  );
});

// ============================================
console.log('\n🔴 RED-08: Live viewer dedup');
// ============================================
const liveCode = readSrc('controllers/liveController.ts');

test('activeViewersPerLive map exists', () => {
  assert(liveCode.includes('activeViewersPerLive'), 'Missing activeViewersPerLive');
});

test('Duplicate join returns without increment', () => {
  assert(liveCode.includes('viewers.has(userId)'), 'Missing dedup check in joinLive');
});

test('Leave only decrements if tracked', () => {
  assert(liveCode.includes('!viewers.has(userId)'), 'Missing leave guard');
});

test('Cleanup on endLive', () => {
  assert(liveCode.includes('activeViewersPerLive.delete'), 'Missing cleanup on endLive');
});

// ============================================
console.log('\n🟠 RED-03: Cascade delete on project');
// ============================================

test('Notification cascade on project delete', () => {
  assert(projetCode.includes("Notification.deleteMany({ 'data.projetId': projetId })"), 'Missing notification cascade');
});

test('Report cascade on project delete', () => {
  assert(projetCode.includes("Report.deleteMany({ targetType: 'projet', targetId: projetId })"), 'Missing report cascade');
});

// ============================================
console.log('\n🟠 RED-09: Block comment on hidden publication');
// ============================================
const pubCode = readSrc('controllers/publicationController.ts');

test('isHidden check before comment creation', () => {
  assert(pubCode.includes('publication.isHidden'), 'Missing isHidden check');
  assert(pubCode.includes('Impossible de commenter une publication modérée'), 'Missing error message');
});

// ============================================
console.log('\n🟠 RED-12: Socket payload validation');
// ============================================

test('Payload validated as unknown type first', () => {
  assert(socketCode.includes('payload: unknown'), 'Missing unknown type for payloads');
});

test('typeof checks for all payload fields', () => {
  assert(socketCode.includes("typeof conversationId !== 'string'"), 'Missing string check for conversationId');
  assert(socketCode.includes("typeof isTyping !== 'boolean'"), 'Missing boolean check for isTyping');
  assert(socketCode.includes("typeof messageId !== 'string'"), 'Missing string check for messageId');
});

// ============================================
console.log('\n🟠 RED-13: Story view rate limit');
// ============================================
const appCode = readSrc('app.ts');

test('Rate limit on /api/stories/:id/seen', () => {
  assert(appCode.includes("'/api/stories/:id/seen'"), 'Missing rate limit on story seen');
});

test('Rate limit on /api/live/:id/join', () => {
  assert(appCode.includes("'/api/live/:id/join'"), 'Missing rate limit on live join');
});

// ============================================
console.log('\n🟠 RED-14: Dedup like notifications');
// ============================================

test('Check for existing notification before creating like notif', () => {
  assert(pubCode.includes('existingNotif'), 'Missing existing notification check');
  assert(pubCode.includes("type: 'nouveau_like'"), 'Missing notification type check');
});

// ============================================
console.log('\n🟠 RED-15: Max rooms per socket');
// ============================================

test('MAX_ROOMS_PER_SOCKET constant defined', () => {
  assert(socketCode.includes('MAX_ROOMS_PER_SOCKET = 50'), 'Missing MAX_ROOMS_PER_SOCKET');
});

test('Room count checked on join', () => {
  assert(socketCode.includes('_joinedRooms') && socketCode.includes('MAX_ROOMS_PER_SOCKET'), 'Missing rooms cap check');
});

// ============================================
// Summary
// ============================================
console.log(`\n${'='.repeat(50)}`);
console.log(`Tests: ${passed} passed, ${failed} failed, ${passed + failed} total`);
console.log(`${'='.repeat(50)}\n`);

process.exit(failed > 0 ? 1 : 0);
