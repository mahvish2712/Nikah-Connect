# Security Specification for Nikaah App

## 1. Data Invariants
- A user can only create their own profile.
- A user can only see their own profile or other people's basic info for discovery.
- PII (email) must only be readable by the owner.
- Matches can only be created between two distinct users.
- Messages can only be sent within an existing match where the sender is a participant.
- Timestamps must be server-generated.

## 2. Invariants & Access Control
- `users`: `get` allowed for owner (PII) or others (no PII). `list` restricted.
- `matches`: Participants only.
- `messages`: Participants only.

## 3. The "Dirty Dozen" Payloads (Denial Tests)
1. **Identity Spoofing**: Attempt to create a user profile with a different UID.
2. **PII Leak**: Non-owner attempts to read another user's email.
3. **Shadow Field Injection**: Adding `isVerified: true` to a profile update.
4. **ID Poisoning**: Using a 2KB string as a match ID.
5. **Timestamp Fraud**: Providing a manual `createdAt` in the future.
6. **Orphaned Message**: Creating a message for a non-existent match.
7. **Privilege Escalation**: Attempting to change `role` to `admin`.
8. **Relational Bypass**: Non-participant attempting to list messages in a match.
9. **State Shortcut**: Changing match status from `pending` to `accepted` without being one of the parties.
10. **Denial of Wallet**: Sending a 1MB string in a message content field.
11. **Verification Bypass**: Unverified email attempting a write.
12. **Self-Assigned Admin**: Creating an admin document in `admins` collection.

## 4. Test Runner Plan
- Implement `firestore.rules.test.ts` using `@firebase/rules-unit-testing`.
- Verify each rejected payload above.
