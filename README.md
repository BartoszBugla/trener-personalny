# Trener Personalny

Full-stack TanStack Start boilerplate: SSR, file-based routing, shadcn/ui, TanStack Query/Form, Drizzle + SQLite and Nest-style dependency injection (Inversify).

## Quick start

```bash
pnpm install
cp .env.example .env.local
pnpm db:setup                # run migrations + seed
pnpm dev                     # http://localhost:3000
```

### Trainer calendars

Trainings are imported from Google Calendar `.ics` exports named
`<calendar-id>.ics`. Real calendars contain client data, so they live outside
the repo: put them in `data/calendars/` (git-ignored) and set
`CALENDARS_DIR=data/calendars` in `.env.local`. Without it, the sample
calendars in `src/server/modules/calendar-import/calendars/` are used.
Both `pnpm db:seed` and the import button in the UI read from the same place;
re-importing updates trainings instead of duplicating them.

| Script                             | What it does                                 |
| ---------------------------------- | -------------------------------------------- |
| `pnpm dev`                         | Vite dev server with SSR + HMR               |
| `pnpm build` / `pnpm start`        | Production build (Nitro) / run it            |
| `pnpm typecheck` / `pnpm lint`     | `tsc --noEmit` / oxlint                      |
| `pnpm test` / `pnpm test:watch`    | Vitest (unit + integration)                  |
| `pnpm db:generate --name <name>`   | Generate SQL migration from schema changes   |
| `pnpm db:migrate`                  | Apply migrations                             |
| `pnpm db:seed`                     | Import trainer calendars (`scripts/seed.ts`) |
| `pnpm db:studio`                   | Drizzle Studio                               |
| `pnpm dlx shadcn@latest add <cmp>` | Add a shadcn/ui component                    |

### Sign-in (Firebase)

Every page except `/login` and every server function requires a session.
The browser signs in with the Firebase SDK (Google or email + password) and
sends the ID token to the server, which verifies it with `firebase-admin` and
sets an httpOnly session cookie (`__session`). The email must be verified and
belong to an **app user** (`users.app_access`) or to a bootstrap admin listed
in `AUTH_ALLOWED_EMAILS`.

People are split into two lists:

- **App users** (`/users`) – can sign in; added by hand in the app (name +
  sign-in email). Trainers are listed here too.
- **Clients / podopieczni** (`/clients`) – no account. "Give access" (with
  their email) turns one into an app user; "Revoke access" turns them back.

Adding an app user also creates their Firebase account (when Firebase Admin is
configured), so they can set a password via "Forgot password?" or just use
Google. There are no roles yet: every app user sees all data.

Setup (values go to `.env.local`, see `.env.example`):

1. Firebase console → **Authentication → Sign-in method**: enable **Google**
   and **Email/Password**.
2. **Authentication → Settings → User actions**: turn off sign-up if the
   option is available (accounts are created by you, step 5; the allow-list
   and verified-email checks protect the app either way). **Authorised domains**: add your production
   domain (`localhost` is there by default).
3. **Project settings → General → Your apps**: add a web app and copy its
   config into `VITE_FIREBASE_*`.
4. **Project settings → Service accounts → Generate new private key**: copy
   `project_id`, `client_email` and `private_key` into `FIREBASE_*`.
5. Set `AUTH_ALLOWED_EMAILS` to your own email (bootstrap admin), sign in and
   add the other app users in the app. For email + password they click
   "Forgot password?" on `/login`: the link sets their password and verifies
   the address (unverified emails are rejected).
6. Restart `pnpm dev` (Vite reads `VITE_*` at startup).

`/api/health` stays public for monitoring.

## Architecture

```
src/
├── routes/                    # File-based routes (TanStack Router)
│   ├── __root.tsx             # HTML shell, providers, header, error/404 boundaries
│   ├── index.tsx              # Home
│   ├── trainings/index.tsx    # Trainings imported from calendars, client assignment
│   ├── billing/index.tsx      # Billing plans, periods, family packages, SMS reminders
│   ├── users/index.tsx        # Trainers and clients
│   └── api/health.ts          # REST server route (GET /api/health)
│
├── features/<feature>/        # Client-importable feature code
│   ├── <feature>.functions.ts # "Controllers": createServerFn + validation → resolve(Service)
│   ├── <feature>.queries.ts   # queryOptions, key factory, mutation hooks
│   └── components/            # Feature UI
│
├── server/                    # SERVER-ONLY (import-protected, see vite.config.ts)
│   ├── app.module.ts          # Root module – register feature modules here
│   ├── app.ts                 # Container bootstrap + resolve()
│   ├── core/
│   │   ├── di/                # defineModule(), createContainer(), TOKENS
│   │   ├── config/            # ConfigService (zod-validated process.env)
│   │   ├── database/          # CoreModule (DB provider), schema barrel
│   │   ├── logger/            # LoggerService
│   │   └── errors/            # HttpException, NotFoundException, ...
│   └── modules/<feature>/
│       ├── <feature>.table.ts       # Drizzle table
│       ├── <feature>.repository.ts  # Data access
│       ├── <feature>.service.ts     # Business logic
│       ├── <feature>.module.ts      # defineModule({ imports, providers })
│       └── *.test.ts                # Unit (mocked) + integration (in-memory DB)
│
├── shared/<feature>/          # Isomorphic DTOs (zod) used by forms AND server validation
├── components/ui/             # shadcn/ui (generated)
├── components/layout/         # Header, theme toggle, error boundaries
└── lib/server-fn/middleware.ts # Server fn middleware: logging + exception filter
```

### Request flow

```
Route loader / component
  → queryOptions (TanStack Query)
    → server function  (features/*/x.functions.ts, validates with shared DTO)
      → middleware      (logging, exception filter: NotFoundException → notFound())
        → resolve(XService)          ← Inversify container (singletons)
          → XRepository              ← @inject(TOKENS.Database)
            → Drizzle → SQLite
```

### NestJS → this project

| NestJS                             | Here                                                                                 |
| ---------------------------------- | ------------------------------------------------------------------------------------ |
| `@Injectable()`                    | `@injectable()` (inversify)                                                          |
| constructor injection              | `constructor(@inject(Dep) private dep: Dep)`                                         |
| `@Inject('TOKEN')`                 | `@inject(TOKENS.X)`                                                                  |
| `@Module({ imports, providers })`  | `defineModule({ name, imports, providers })`                                         |
| `useClass / useValue / useFactory` | same keys in `providers`                                                             |
| `AppModule` / `NestFactory.create` | `server/app.module.ts` / `server/app.ts`                                             |
| Controller                         | `createServerFn` (RPC) or server route (REST)                                        |
| DTO + class-validator              | zod schema in `src/shared` + `.validator(schema)`                                    |
| Interceptor / exception filter     | `createMiddleware({ type: 'function' })`                                             |
| `Test.createTestingModule`         | `new Container()` + bind mocks (see `calendar-import.reconcile.integration.test.ts`) |

> Always pass the token explicitly to `@inject(...)`. Vite's transformer does not reliably emit
> `design:paramtypes` metadata, so implicit type-based injection is not used.

### Adding a feature module

1. `src/shared/<name>/<name>.dto.ts` – zod DTOs.
2. `src/server/modules/<name>/` – `table`, `repository`, `service`, `module`.
3. Export the table from `src/server/core/database/schema.ts`, then `pnpm db:generate --name <name> && pnpm db:migrate`.
4. Add the module to `imports` in `src/server/app.module.ts`.
5. `src/features/<name>/` – `functions.ts`, `queries.ts`, components.
6. Add routes in `src/routes/<name>/`.

### i18n (Polish / English)

- `react-i18next`; messages in `src/i18n/locales/{en,pl}.ts`. `en.ts` is the source of truth –
  keys passed to `t()` are type-checked against it; `src/i18n/locales.test.ts` checks that `pl.ts`
  has the same keys, placeholders and all Polish plural forms (`_one/_few/_many/_other`).
- Language: `locale` cookie (header switcher) → `Accept-Language` → Polish. Resolved in the root
  route's `beforeLoad` (`context.locale`, also used by `head()` titles via `pageTitle()`).
- Dates: `useFormatters()` (locale-aware, Europe/Warsaw). Runtime keys (zod messages): `useMessage()`.
- Server errors: throw `new BadRequestException({ key: 'errorKey', params })` with a key from
  `errors.*`; the exception-filter middleware translates it to the request's language.

### Server/client boundary

- `src/server/**` and `**/*.server.*` are blocked from the client bundle (`importProtection` in `vite.config.ts`).
- Server function handlers and server-route handlers may import from `#/server/...`; the Start compiler strips them from the client build.
- `src/lib/server-fn/middleware.ts` is imported by client code, so it must not import `#/server` directly.
- Server env: `ConfigService`. Client env (must be `VITE_` prefixed): `src/env.ts`.
