# EducAssist local testing

This setup is local-only. It does not deploy, configure hosting, or create CI workflows.

## Install

```bash
npm install
npm --prefix backend install
```

## Test database safety

Never point tests at `educassist_db`. Database integration is disabled unless both conditions are true:

- `RUN_DB_INTEGRATION=true`
- `DB_NAME_TEST` contains the word `test`

The helper rejects `educassist_db`. Tests do not run `DROP TABLE`, `TRUNCATE`, or `sync({ force: true })`. Most writes run in transactions that roll back. The one commit test creates one uniquely named test user and deletes only that record afterward.

### Create the database in XAMPP/phpMyAdmin

1. Start MySQL from XAMPP.
2. Open phpMyAdmin.
3. Create a database named `educassist_test` using the same character set/collation as development.
4. Import a schema-only copy of the development database, or start the backend once with the test environment so the existing non-destructive `sequelize.sync()` creates missing tables.
5. Do not copy real passwords or personal production information. Create dedicated test accounts.

Copy `.env.test.example` to `.env.test.local`, then fill only local test values. The file is intentionally not committed with secrets.

Before commands that require the database, export the file in your shell:

```bash
set -a
source .env.test.local
set +a
```

The backend chooses `DB_NAME_TEST` whenever `NODE_ENV=test` and refuses a non-test-looking name.

## Unit and component tests

```bash
npm test
npm run test:watch
npm run test:unit
npm run test:components
npm run test:api
npm run test:coverage
```

Vitest uses jsdom and React Testing Library. Coverage is focused initially on shared utilities and authentication code, with realistic starter thresholds rather than 100%.

## Database integration tests

Without explicit permission, the suite safely skips database-changing integration tests:

```bash
npm run test:integration
```

To run them against the test database:

```bash
set -a
source .env.test.local
set +a
RUN_DB_INTEGRATION=true npm run test:integration
```

Sequelize connections close after the suite.

## Playwright end-to-end tests

Install the local Chromium test browser once:

```bash
npx playwright install chromium
```

Set dedicated test-account credentials in `.env.test.local`:

- `E2E_ADMIN_IDENTIFIER` / `E2E_ADMIN_PASSWORD`
- `E2E_TEACHER_IDENTIFIER` / `E2E_TEACHER_PASSWORD`
- `E2E_STUDENT_IDENTIFIER` / `E2E_STUDENT_PASSWORD`

Then run:

```bash
set -a
source .env.test.local
set +a
npm run test:e2e
```

Playwright starts the local backend and Next.js development server unless they are already running. Set `PLAYWRIGHT_SKIP_WEBSERVER=1` only when both servers are already available. Tests that require an account skip with an explicit message when its test credentials are absent.

Interactive mode:

```bash
npm run test:e2e:ui
```

## Static verification

```bash
npm run lint
npm run type-check
npm run build
```

Next.js 16 uses the ESLint CLI, so the lint script is `eslint .`, not the removed `next lint` command.

## Normal development workflow

```bash
npm run lint
npm run type-check
npm test
npm run test:e2e
```

Or run the non-E2E checks together:

```bash
npm run quality
```

## Reading failures

- Unit failure: a pure calculation, validation rule, role mapping, or token helper changed.
- Component failure: visible behavior, validation, loading/error rendering, or confirmation behavior changed.
- API failure: request validation, JWT handling, or RBAC behavior changed.
- Integration connection failure: verify XAMPP is running and the selected database is `DB_NAME_TEST`, never `educassist_db`.
- E2E login skipped: configure the corresponding dedicated test account.
- E2E server failure: verify ports 3000 and 4000 are available and the test database schema exists.

## Safely reset only the test database

There is intentionally no automatic reset script. In phpMyAdmin, verify the selected database name is exactly `educassist_test` before deleting or recreating it. Never run reset operations while `educassist_db` is selected. Re-import a schema-only copy afterward and recreate dedicated test accounts.

## Current scope

The first suite covers real quiz/attendance calculations, auth validation, JWT behavior, login UI, shared loading/error UI, administrator confirmation safety, basic API authentication/RBAC, and guarded Sequelize transaction behavior. Weighted-grade and adaptive-mastery calculations are not tested because the application does not currently implement those pure calculations. Broader endpoint success tests and full grade/quiz submission integration require a populated test fixture database and should be added as those workflows stabilize.
