# CI/CD Setup - Quick Reference

## 🚀 Quick Start

### Run CI Checks Locally

```bash
# Run all CI checks (same as GitHub Actions)
npm run ci

# Individual checks
npm run type-check    # TypeScript type checking
npm run lint          # ESLint code quality
npm run format:check  # Prettier formatting check
npm test              # Run tests
npm run test:coverage # Generate coverage report
```

### Fix Issues

```bash
# Auto-fix linting issues
npm run lint:fix

# Auto-format code
npm run format
```

## 📋 CI Pipeline Overview

The CI pipeline runs automatically on:
- Every push to `main` or `develop` branches
- Every pull request
- Manual trigger via GitHub Actions

### Pipeline Jobs

1. **Code Quality** - Linting, formatting, type checking
2. **Security Scan** - Dependency audit, secret scanning
3. **Test Suite** - Jest tests with PostgreSQL
4. **Build Verification** - TypeScript and dashboard builds
5. **Migration Validation** - Database migration checks

## ✅ Pre-Commit Checklist

Before committing, ensure:
- [ ] `npm run type-check` passes
- [ ] `npm run lint` passes (or run `npm run lint:fix`)
- [ ] `npm run format:check` passes (or run `npm run format`)
- [ ] `npm test` passes
- [ ] Coverage ≥ 80% (check with `npm run test:coverage`)

## 📚 Documentation

- **CI/CD Plan:** [CI_CD_PLAN.md](./CI_CD_PLAN.md)
- **Deployment Guide:** [DEPLOYMENT_PREPARATION.md](./DEPLOYMENT_PREPARATION.md)
- **Phase 0 CI Setup:** [PHASE_0_CI_SETUP.md](./PHASE_0_CI_SETUP.md)
- **Roadmap:** [ROADMAP.md](./ROADMAP.md) - Overall project roadmap and phase tracking

## 🔧 Configuration Files

- `.eslintrc.json` - ESLint rules
- `.prettierrc.json` - Prettier formatting
- `jest.config.js` - Jest test configuration
- `.github/workflows/ci.yml` - GitHub Actions workflow

## 🐛 Troubleshooting

### Scripts Not Found
If scripts aren't found, ensure `package.json` is saved and run:
```bash
npm install
```

### Type Errors
Run type checking to see detailed errors:
```bash
npm run type-check
```

### Linting Errors
Auto-fix most issues:
```bash
npm run lint:fix
```

### Formatting Issues
Auto-format code:
```bash
npm run format
```

