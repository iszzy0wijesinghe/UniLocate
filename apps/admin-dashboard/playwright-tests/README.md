# Admin Dashboard Playwright Tests

This folder contains comprehensive Playwright tests for the admin dashboard application.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Install Playwright browsers:
```bash
npm run install:browsers
```

## Running Tests

### Run all tests
```bash
npm test
```

### Run tests in headed mode (shows browser)
```bash
npm run test:headed
```

### Run tests in debug mode
```bash
npm run test:debug
```

### Run tests with UI mode
```bash
npm run test:ui
```

### View test report
```bash
npm run test:report
```

## Test Coverage

The tests cover all major admin dashboard functionality:

### Authentication (`auth.spec.ts`)
- Login page display
- Form validation
- Invalid credentials handling
- Registration flow
- Password confirmation validation

### Dashboard (`dashboard.spec.ts`)
- Dashboard metrics display
- Navigation menu
- Charts and graphs
- Navigation between sections
- Recent activity feed
- Logout functionality

### Users Management (`users.spec.ts`)
- Users table display
- Search and filter functionality
- Add user modal
- Form validation
- Edit existing users
- Delete user with confirmation
- Table pagination

### Complaints Management (`complaints.spec.ts`)
- Complaints table display
- Search and filter by status/category
- View complaint details
- Update complaint status
- Add responses
- Chat history
- Export functionality
- Statistics display

### Lost & Found (`lost-found.spec.ts`)
- Lost & found table display
- Filter by item type and category
- Add new items
- Form validation
- View/edit item details
- Delete items
- Mark items as claimed
- Image upload
- Statistics display

### Buildings Management (`buildings.spec.ts`)
- Buildings table display
- Search functionality
- Add/edit/delete buildings
- View building details
- Floor and room management
- Update room occupancy
- Building statistics

## Configuration

The `playwright.config.ts` file contains:
- Browser configuration (Chrome, Firefox, Safari)
- Test directory settings
- Base URL configuration
- Web server setup
- Reporting options
- Screenshot and video settings for failed tests

## Test Data

Tests use generic selectors and data that should work with the actual admin dashboard implementation. The tests are designed to be:

- **Robust**: Using proper waits and expectations
- **Maintainable**: Clear test structure and naming
- **Comprehensive**: Covering all major user flows
- **Reliable**: Handling async operations properly

## Troubleshooting

If tests fail:
1. Ensure the admin dashboard is running on `http://localhost:5173`
2. Check that all required test data/attributes exist in the app
3. Verify the app structure matches the test expectations
4. Run tests in headed mode to see what's happening

## Adding New Tests

When adding new functionality to the admin dashboard:
1. Create a new `.spec.ts` file for the feature
2. Follow the existing test patterns
3. Use descriptive test names
4. Include positive and negative test cases
5. Test form validation
6. Test CRUD operations (Create, Read, Update, Delete)
