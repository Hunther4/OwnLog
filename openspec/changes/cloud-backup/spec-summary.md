## Specs Created

**Change**: cloud-backup

### Specs Written
| Domain | Type | Requirements | Scenarios |
|--------|------|-------------|-----------|
| cloud-backup | Delta | 5 added, 0 modified, 0 removed | 12 scenarios |

### Coverage
- Happy paths: 5 covered (auth, backup, restore, background sync, UI)
- Edge cases: 4 covered (auth failure, large file, older version, restore failure)
- Error states: 3 covered (auth misconfiguration, backup skip, restore failure)

### Next Step
Ready for design (sdd-design). If design already exists, ready for tasks (sdd-tasks).