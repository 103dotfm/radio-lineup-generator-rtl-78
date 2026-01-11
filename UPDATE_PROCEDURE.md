# Update Procedure - GitHub Repository Update Rule

This document establishes the mandatory procedure for updating the GitHub repository, including bug fixes, feature updates, and security patches.

## Update Frequency

- **Minimum**: Monthly updates required
- **Immediate**: Security vulnerabilities must be addressed within 48 hours
- **Scheduled**: Regular dependency updates should be performed monthly

## Pre-Update Requirements

### 1. Backup
- Create database backup before any updates
- Backup `package.json` and `package-lock.json`
- Note current git commit hash
- Document PM2 process status

### 2. Testing
- Run `npm run build` to verify build succeeds
- Test critical application functionality
- Test affected features (e.g., PDF generation, routing)
- Verify no breaking changes

## Commit Message Format

### Standard Format
```
<type>: <short description>

<detailed description if needed>

Version Notes:
- package-name: old-version → new-version (reason/CVE)
- package-name: old-version → new-version (reason/CVE)
- System: Ubuntu packages updated (if applicable)
- npm: Dependencies audited and updated (if applicable)
```

### Commit Types
- `security`: Security patches and vulnerability fixes
- `fix`: Bug fixes
- `feat`: New features
- `update`: Dependency updates
- `chore`: Maintenance tasks

### Examples

#### Security Update
```
security: Fix CVE-2026-22029 and CVE-2025-68428

Security Updates:
- react-router-dom: 7.10.1 → 7.12.0 (CVE-2026-22029: XSS via Open Redirects)
- jspdf: 3.0.4 → 4.0.0 (CVE-2025-68428: Local File Inclusion/Path Traversal)
- System: Ubuntu packages updated
- npm: All dependencies audited and updated
```

#### Bug Fix
```
fix: Resolve PDF generation issue in lineup export

Fix issue where PDF generation failed for lineups with special characters.

Version Notes:
- jspdf: 4.0.0 (updated in previous security patch)
- No dependency changes
```

#### Feature Update
```
feat: Add new schedule filtering options

Add advanced filtering options to schedule view including date range and show type filters.

Version Notes:
- react-router-dom: 7.12.0 (no changes, using existing version)
- No dependency changes
```

#### Regular Update
```
update: Monthly dependency audit and updates

Update dependencies to latest compatible versions and fix security vulnerabilities.

Version Notes:
- axios: 1.13.2 → 1.14.0 (minor update)
- express: 5.2.1 → 5.2.2 (patch update)
- npm: Updated to latest version
```

## Version Notes Requirements

Every commit that changes dependencies, packages, or system configuration MUST include a "Version Notes" section in the commit message body with:

1. **Package Updates**: List each package updated with:
   - Package name
   - Old version → New version
   - Reason (CVE, bug fix, feature, etc.)

2. **System Updates**: If Ubuntu packages are updated:
   - Note: "System: Ubuntu packages updated"
   - Include major updates if significant

3. **npm Updates**: If npm or Node.js are updated:
   - Note: "npm: Updated to version X.X.X" or "npm: Dependencies audited and updated"

4. **No Changes**: If no dependencies changed:
   - Note: "No dependency changes"

## Update Workflow

### Step 1: Create Backup
```bash
# Database backup
PGPASSWORD="radio123" pg_dump -h localhost -U radiouser -d radiodb \
  > backup/radiodb-backup-before-update-$(date +%Y%m%d_%H%M%S).sql

# Package files backup
cp package.json backup/package.json.backup-$(date +%Y%m%d_%H%M%S)
cp package-lock.json backup/package-lock.json.backup-$(date +%Y%m%d_%H%M%S)

# Git state
git rev-parse HEAD > backup/pre-update-commit.txt
```

### Step 2: Make Changes
- Update code, dependencies, or configuration
- Follow project coding standards
- Update relevant documentation if needed

### Step 3: Test
```bash
# Build verification
npm run build

# Run tests (if available)
npm test

# Manual testing of affected features
```

### Step 4: Commit
```bash
# Stage changes
git add .

# Commit with proper message format including Version Notes
git commit -m "type: description" -m "Detailed description if needed" \
  -m "" \
  -m "Version Notes:" \
  -m "- package: old → new (reason)" \
  -m "- package: old → new (reason)"

# Push to repository
git push
```

### Step 5: Verify
- Verify commit message format in GitHub
- Verify all changes are included
- Update project documentation if procedures changed

## Rollback Procedure

If an update causes issues:

1. **Quick Rollback (Code Only)**
   ```bash
   git checkout package.json package-lock.json
   npm install
   pm2 restart all
   ```

2. **Full Rollback (Using Rollback Script)**
   ```bash
   ./scripts/rollback-security-updates.sh
   ```

3. **Database Rollback (If Needed)**
   ```bash
   pm2 stop all
   PGPASSWORD="radio123" psql -h localhost -U radiouser -d radiodb < \
     backup/radiodb-backup-before-update-YYYYMMDD_HHMMSS.sql
   pm2 start all
   ```

## Monthly Update Checklist

- [ ] Review GitHub security alerts
- [ ] Run `npm audit` and address vulnerabilities
- [ ] Check for dependency updates
- [ ] Update Ubuntu packages (`sudo apt update && sudo apt upgrade`)
- [ ] Update npm if needed (`sudo npm install -g npm@latest`)
- [ ] Test all critical functionality
- [ ] Create backup before updates
- [ ] Commit with proper format and Version Notes
- [ ] Push to GitHub
- [ ] Verify deployment

## Security Update Priority

Security vulnerabilities must be addressed immediately:

1. **Critical/High Severity**: Address within 24-48 hours
2. **Medium Severity**: Address within 1 week
3. **Low Severity**: Address in next monthly update

## Documentation Updates

If this procedure is updated, ensure:
- All team members are notified
- README.md is updated if needed
- Related documentation is synchronized

## Enforcement

This procedure is **mandatory** for all updates to the repository. Commits without proper Version Notes for dependency changes will be rejected in code review.

---

**Last Updated**: January 11, 2026
**Version**: 1.0
**Established**: As part of security update procedure (CVE-2026-22029, CVE-2025-68428)
