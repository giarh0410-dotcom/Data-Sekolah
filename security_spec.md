# Security Specification - Exam Module & Core Entities

## Data Invariants
1. Students must have a unique NIS and belong to a valid Rombel.
2. Subjects must have a unique code.
3. ExamSchedules must reference a valid Subject and Room.
4. Questions must belong to a valid Subject and have exactly 4 options.
5. ExamRooms must have a positive capacity.
6. Only admins can modify core data (Students, Teachers, Subjects, Schedules, Rooms, Questions).
7. Attendance records are immutable once created, except for notification status.

## The Dirty Dozen Payloads (Targeting ExamRooms & Others)

1. **Identity Spoofing**: Creating a student record with a different `ownerId` (if applicable) or bypassing admin check.
2. **State Shortcutting**: Updating a student's NIS or class without proper authorization.
3. **Resource Poisoning (Room)**: Injecting a 1MB string into the `name` field of an `examRooms` document.
4. **Invalid Type (Room)**: Setting `capacity` to a string instead of a number.
5. **Shadow Field**: Adding a hidden `isAdmin: true` field to a user profile.
6. **Orphaned Schedule**: Creating an `examSchedule` with a non-existent `subjectId`.
7. **Question Corruption**: Creating a `Question` with 100 options instead of 4.
8. **Invalid Status**: Updating attendance status to "Libur" (not in enum).
9. **Time Travel**: Setting `createdAt` to a future date instead of `request.time`.
10. **Admin Escalation**: A viewer trying to create an `examRoom`.
11. **Mass Deletion**: Trying to delete the `settings` collection.
12. **PII Leak**: A student trying to read another student's full profile (if PII is present).

## Logic Verification
- Rules must reject any write that doesn't pass `isValid[Entity]()`.
- All string sizes must be capped.
- Admin status must be verified against the trusted `users` collection or hardcoded primary admin email.
