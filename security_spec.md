# Security Specification - Echo Real-Time

## Data Invariants
1. A user can only create/update their own profile.
2. A chat can only be read/written by its participants.
3. A message must belong to a valid chat where the sender is a participant.
4. Messages are immutable after creation (except status).

## The "Dirty Dozen" Payloads
1. Attempt to create a profile for another UID.
2. Attempt to read another user's private settings.
3. Attempt to create a chat where the current user is NOT a participant.
4. Attempt to read a chat from a non-participant account.
5. Attempt to send a message to a chat you aren't part of.
6. Attempt to modify a message sent by someone else.
7. Attempt to delete a message (not supported by UI).
8. Attempt to set `isOnline` for another user.
9. Attempt to inject a massive string as a username.
10. Attempt to read all chats in the system without participant filter.
11. Attempt to update message text after sending.
12. Attempt to create a message with a spoofed `senderId`.

## Test Runner Plan
- Verify `isParticipant(chatId)` for all chat/message access.
- Verify `isOwner(userId)` for user profiles.
- Enforce strict typing and size limits on fields.
