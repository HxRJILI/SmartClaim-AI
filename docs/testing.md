# Testing

Testing guide for SmartClaim AI.

## Test Types

### Unit Tests
- Component tests
- Utility function tests
- Service tests

### Integration Tests
- API route tests
- Database tests
- AI service tests

### End-to-End Tests
- User flow tests
- Authentication tests
- Full workflow tests

## Running Tests

### Frontend Tests

```bash
# Run all tests
pnpm test

# Run with coverage
pnpm test:coverage

# Run specific test
pnpm test -- --grep "test name"
```

### E2E Tests

```bash
# Run Playwright tests
cd apps/e2e
pnpm test

# Run with UI
pnpm test:ui
```

### AI Service Tests

```bash
cd python-services
pytest
```

## Test Structure

```
tests/
├── unit/
│   ├── components/
│   └── utils/
├── integration/
│   ├── api/
│   └── services/
└── e2e/
    ├── authentication/
    └── workflows/
```

## Writing Tests

### Component Test Example

```typescript
import { render, screen } from '@testing-library/react';
import { TicketForm } from './TicketForm';

describe('TicketForm', () => {
  it('renders form fields', () => {
    render(<TicketForm />);
    expect(screen.getByLabelText('Description')).toBeInTheDocument();
  });
});
```

### API Test Example

```typescript
import { createMocks } from 'node-mocks-http';
import handler from './route';

describe('API Route', () => {
  it('returns 200', async () => {
    const { req, res } = createMocks();
    await handler(req, res);
    expect(res._getStatusCode()).toBe(200);
  });
});
```

## Coverage

Maintain minimum coverage:
- Statements: 70%
- Branches: 70%
- Functions: 70%
- Lines: 70%
