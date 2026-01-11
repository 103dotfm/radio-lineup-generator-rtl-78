# Update Procedure - GitHub Repository Updates

This document outlines the mandatory procedure for all updates to the GitHub repository, including bug fixes, feature updates, and security patches.

## Update Frequency

- **Minimum**: Monthly updates to the repository
- **Security Updates**: Immediate (within 24 hours of vulnerability discovery)
- **Critical Bug Fixes**: Within 1 week
- **Feature Updates**: As needed, but must follow this procedure

## Mandatory Commit Message Format

All commits must follow this format:

```
<type>: <short description>

<detailed description if needed>

Version Notes:
- <package/component>: <old version> → <new version> (<reason/CVE if applicable>)
- <package/component>: <old version> → <new version> (<reason/CVE if applicable>)
- System: <any system-level updates>
- npm: <any npm/Node.js updates>
```

### Commit Type Prefixes

- `security:` - Security updates and vulnerability fixes
- `fix:` - Bug fixes
- `feat:` - New features
- `update:` - Dependency updates
- `refactor:` - Code refactoring
- `docs:` - Documentation updates

### Version Notes Format

Version notes must be included in the commit message body (not just in the description). Each update must specify:
- The package/component name
- Old version → New version
- Reason for update (CVE number, bug fix, feature addition, etc.)

### Example Commit Message

```
security: Fix CVE-2026-22029 and CVE-2025-68428

Update vulnerable packages to patch security vulnerabilities.

Version Notes:
- react-router-dom: 7.10.1 → 7.12.0 (CVE-2026-22029: XSS via Open Redirects)
- jspdf: 3.0.4 → 4.0.0 (CVE-2025-68428: Local File Inclusion/Path Traversal)
- html2pdf.js: 0.12.1 → 0.13.0 (Dependency update for jspdf fix)
- System: Ubuntu packages updated
- npm: All dependencies audited and updated
```

## Testing Requirements

Before committing any updates:

1. **Build Test**: Run `npm run build` and verify it succeeds
2. **Functional Test**: Test critical user flows (authentication, PDF generation, routing, etc.)
3. **Integration Test**: Verify the application runs correctly in development mode
4. **Security Audit**: Run `npm audit` and document any remaining vulnerabilities

## Update Checklist

- [ ] Create backup of package.json and package-lock.json
- [ ] Create database backup (if database changes involved)
- [ ] Update packages/components as needed
- [ ] Run `npm install` to update dependencies
- [ ] Run `npm audit` to check for vulnerabilities
- [ ] Build the application successfully
- [ ] Test critical functionality
- [ ] Update this procedure document if needed
- [ ] Create commit with proper message format including version notes
- [ ] Push to GitHub repository

## Rollback Procedure

If an update causes issues, use the rollback script:

```bash
./scripts/rollback-security-updates.sh
```

Or manually restore from backups:

```bash
# Restore package files
cp backup/package.json.before-<update-timestamp> package.json
cp backup/package-lock.json.before-<update-timestamp> package-lock.json
npm install --legacy-peer-deps

# Restore database if needed
pm2 stop all
PGPASSWORD="radio123" psql -h localhost -U radiouser -d radiodb < backup/radiodb-backup-before-<timestamp>.sql
pm2 start all
```

## Notes

- This procedure applies to ALL updates, not just security fixes
- Version notes are mandatory - they help track changes over time
- Regular monthly updates help prevent accumulation of technical debt
- Always test before committing
- Keep backups before making changes
- Document any deviations from this procedure
