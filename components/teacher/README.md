# Teacher Components

This folder contains all teacher-specific workflow components.

## Files in this folder:

1. **TeacherDashboard.tsx** - Main dashboard with tool selection
2. **AttendanceRecorder.tsx** - Voice-based attendance recording
3. **GradeEntry.tsx** - Voice-based grade entry with read-back
4. **MeritAward.tsx** - Merit/demerit awarding system

## How to use:

Teachers access these tools through the "Teacher Tools" button on the main page.

Each tool includes:
- Voice input/output
- Security verification (weird Q&A)
- Read-back confirmation
- Audit logging
- Edit window checking
- Data forwarding to admin

## File Structure:
```
components/
└── teacher/
    ├── README.md (this file)
    ├── TeacherDashboard.tsx
    ├── AttendanceRecorder.tsx
    ├── GradeEntry.tsx
    └── MeritAward.tsx
```