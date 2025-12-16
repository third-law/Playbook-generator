# Testing Guide for AI Visibility Tool

This document provides comprehensive information about the testing infrastructure and procedures for the AI Visibility Tool.

## 🧪 Testing Overview

Our testing strategy covers multiple layers:

- **Unit Tests**: Individual function and component testing
- **Integration Tests**: API routes and database operations
- **E2E Tests**: Complete user journeys and workflows
- **Component Tests**: React component behavior and interactions

## 📁 Test Structure

```
tests/
├── unit/                     # Unit tests
│   ├── auth/                 # Authentication function tests
│   │   ├── password.test.ts  # Password hashing/verification
│   │   └── session.test.ts   # Session management
│   └── components/           # React component tests
│       ├── dashboard.test.tsx
│       └── new-analysis.test.tsx
├── integration/              # Integration tests
│   └── api/                  # API route tests
│       ├── auth/
│       │   ├── login.test.ts
│       │   └── logout.test.ts
│       └── analyses/
│           └── list.test.ts
├── e2e/                      # End-to-end tests
│   ├── auth.spec.ts          # Authentication flows
│   └── dashboard.spec.ts     # Dashboard functionality
├── utils/                    # Test utilities
│   └── database.ts           # Database testing helpers
└── setup.ts                  # Global test setup
```

## 🚀 Getting Started

### Prerequisites

1. **Node.js 18+** - Required for running tests
2. **PostgreSQL** - Required for integration/E2E tests
3. **Dependencies** - Install with `npm install`

### Initial Setup

```bash
# Install dependencies
npm install

# Install Playwright browsers
npm run playwright:install

# Set up test environment variables (optional)
cp .env.example .env.test
```

## 🏃 Running Tests

### Quick Commands

```bash
# Run all tests
npm run test:all

# Run specific test types
npm run test:unit          # Unit tests only
npm run test:integration   # Integration tests only
npm run test:e2e          # End-to-end tests only

# Development commands
npm run test              # Run unit tests (default)
npm run test:watch        # Watch mode for development
npm run test:coverage     # Generate coverage report
```

### Advanced E2E Testing

```bash
# Run E2E tests with UI (interactive mode)
npm run test:e2e-ui

# Debug E2E tests (step-by-step debugging)
npm run test:e2e-debug

# Run E2E tests on specific browser
npx playwright test --project=chromium
npx playwright test --project=firefox
npx playwright test --project=webkit
```

## 🔧 Configuration

### Jest Configuration

Located in `jest.config.js`:

- **Test Environment**: jsdom for React components, node for API tests
- **Setup Files**: Global mocks and test utilities
- **Coverage**: Comprehensive coverage reporting
- **Module Mapping**: Path aliases (@/ for project root)

### Playwright Configuration

Located in `playwright.config.ts`:

- **Browsers**: Chromium, Firefox, WebKit
- **Base URL**: http://localhost:3000
- **Screenshots**: On failure
- **Traces**: On retry
- **Mobile Testing**: iPhone and Android viewports

## 📊 Test Categories

### Unit Tests

**Purpose**: Test individual functions and components in isolation

**Examples**:
- Password hashing and verification functions
- Session creation and validation logic
- React component rendering and user interactions

**Location**: `tests/unit/`

**Run with**: `npm run test:unit`

### Integration Tests

**Purpose**: Test API routes and database interactions

**Examples**:
- Login/logout API endpoints
- Analysis list retrieval
- Database query functions

**Location**: `tests/integration/`

**Run with**: `npm run test:integration`

### End-to-End Tests

**Purpose**: Test complete user workflows in real browser

**Examples**:
- Complete authentication flow
- Dashboard navigation and search
- Analysis creation workflow
- Responsive design testing

**Location**: `tests/e2e/`

**Run with**: `npm run test:e2e`

## 🎯 Testing the 404 Issue

The missing `/analyze/new` route was **identified and fixed** during testing setup:

### Issue Found
- Dashboard links to `/analyze/new` but route didn't exist
- Clicking "Create New Analysis" resulted in 404 error

### Solution Implemented
- Created `/app/analyze/new/page.tsx`
- Implemented basic form with customer name input
- Added proper navigation and error handling
- Included development notice for incomplete features

### Test Coverage
- Unit tests verify form behavior and validation
- E2E tests ensure navigation works correctly
- Integration tests cover API interactions

## 📈 Coverage Reports

Generate and view coverage reports:

```bash
# Generate coverage report
npm run test:coverage

# View coverage in browser
open coverage/lcov-report/index.html
```

### Coverage Targets

- **Overall**: > 80%
- **Functions**: > 85%
- **Lines**: > 80%
- **Branches**: > 75%

## 🔍 Database Testing

### Test Database Setup

Uses dedicated test database with:
- Isolated test data
- Automatic cleanup between tests
- Mock data fixtures
- Transaction rollback support

### Database Test Utilities

Located in `tests/utils/database.ts`:

```typescript
// Setup test database
await setupTestDb();

// Clean between tests  
await cleanTestDb();

// Create test data
const analysisId = await createTestAnalysis({
  customerName: 'Test Customer'
});

// Seed sample data
const { analysisId, briefIds } = await seedTestData();
```

## 🐛 Debugging Tests

### Failed Tests

1. **Check console output** for error messages
2. **Review test logs** in CI/CD pipeline
3. **Use debugging mode** for E2E tests
4. **Add console.log** statements for investigation

### E2E Debugging

```bash
# Run tests in headed mode (see browser)
npx playwright test --headed

# Run tests with debugging
npm run test:e2e-debug

# Generate test traces
npx playwright test --trace on
```

### Common Issues

**Authentication Issues**:
- Verify password is 'admin' in tests
- Check session secret is set
- Ensure cookies are properly handled

**Database Issues**:
- Verify PostgreSQL is running
- Check connection strings
- Ensure test database exists

**Route Issues**:
- Verify all routes exist
- Check Next.js app directory structure
- Ensure proper file naming

## 🚀 Continuous Integration

Tests run automatically on:

- **Push** to main/develop branches
- **Pull requests** to main/develop
- **Scheduled** nightly runs (optional)

### CI Pipeline

1. **Linting & TypeScript** - Code quality checks
2. **Unit Tests** - Fast isolated tests
3. **Integration Tests** - API and database tests
4. **E2E Tests** - Full browser testing
5. **Build Verification** - Ensure app builds correctly
6. **Security Scanning** - Vulnerability checks

### Environment Variables

Required for CI/CD:

```bash
# Database
POSTGRES_URL=postgresql://user:password@host:port/database

# Session
SESSION_SECRET=your-secure-secret-key

# Optional: Test database
TEST_DB_HOST=localhost
TEST_DB_PORT=5432
TEST_DB_NAME=ai_visibility_test
TEST_DB_USER=postgres
TEST_DB_PASSWORD=postgres
```

## 🎨 Best Practices

### Writing Tests

1. **Descriptive Names**: Test names should explain what is being tested
2. **Arrange-Act-Assert**: Structure tests clearly
3. **Isolation**: Tests should not depend on each other
4. **Cleanup**: Always clean up after tests
5. **Mocking**: Mock external dependencies appropriately

### Test Data

1. **Predictable**: Use consistent test data
2. **Minimal**: Only create data needed for the test
3. **Clean**: Remove test data after each test
4. **Realistic**: Use realistic but safe test values

### Example Test Structure

```typescript
describe('Feature Name', () => {
  beforeEach(() => {
    // Setup before each test
  });

  afterEach(() => {
    // Cleanup after each test
  });

  describe('Specific functionality', () => {
    it('should do something specific', async () => {
      // Arrange: Setup test data and conditions
      const testData = { name: 'Test' };
      
      // Act: Execute the code being tested
      const result = await functionUnderTest(testData);
      
      // Assert: Verify the expected outcome
      expect(result).toEqual(expectedResult);
    });
  });
});
```

## 🔧 Troubleshooting

### Common Problems

**Tests hanging or timing out**:
```bash
# Increase timeout in jest.config.js
testTimeout: 30000  // 30 seconds
```

**Playwright browsers not found**:
```bash
npm run playwright:install
```

**Database connection issues**:
```bash
# Check PostgreSQL is running
pg_isready -h localhost -p 5432

# Verify environment variables
echo $POSTGRES_URL
```

**Module resolution issues**:
```bash
# Clear Jest cache
npx jest --clearCache

# Clear Next.js cache  
rm -rf .next
```

### Getting Help

1. Check test output and error messages
2. Review this documentation
3. Look at existing test examples
4. Check the CI/CD pipeline logs
5. Verify environment setup

## 📚 Additional Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [Playwright Documentation](https://playwright.dev/docs/intro)
- [Next.js Testing Guide](https://nextjs.org/docs/app/building-your-application/testing)

## ✅ Test Checklist

Before deploying:

- [ ] All unit tests pass
- [ ] All integration tests pass  
- [ ] All E2E tests pass
- [ ] Code coverage meets targets (>80%)
- [ ] No security vulnerabilities
- [ ] Build completes successfully
- [ ] Manual testing of critical paths

---

For questions about testing or to report issues, please create an issue in the project repository.