# Design tokens reference

The single source of truth is the `@theme` block in `src/index.css`. Tailwind
generates a utility for every token there, so components reference tokens by
utility class and never by literal value. `src/__tests__/design-tokens.test.ts`
fails the build if a raw hex colour appears anywhere under `src/`.

## Colour

| Token                          | Value     | Use for                                    |
| ------------------------------ | --------- | ------------------------------------------ |
| `--color-background-primary`   | `#f6f4ee` | Page background                            |
| `--color-background-secondary` | `#ffffff` | Cards, panels, table surfaces              |
| `--color-background-tertiary`  | `#e4e4e9` | Recessed surfaces, skeleton bars           |
| `--color-text-primary`         | `#111115` | Body copy and headings                     |
| `--color-text-secondary`       | `#6b6557` | Supporting copy, empty state messages      |
| `--color-text-tertiary`        | `#17160f` | High-emphasis copy on tinted surfaces      |
| `--color-interactive-primary`  | `#111115` | Primary button fill                        |
| `--color-interactive-hover`    | `#222227` | Primary button hover fill                  |
| `--color-interactive-text`     | `#ffffff` | Text on an interactive fill                |
| `--color-border-primary`       | `#e7e3d8` | Dividers and table rules                   |
| `--color-border-interactive`   | `#6b6557` | Input and control boundaries               |
| `--color-sage-background`      | `#e5ebdd` | Approved / positive status pill background |
| `--color-sage-foreground`      | `#3e5136` | Approved / positive status pill text       |
| `--color-pending-background`   | `#f5ecd9` | Pending status pill background             |
| `--color-pending-foreground`   | `#6c511c` | Pending status pill text                   |
| `--color-error-background`     | `#f2e2dd` | Error surface background                   |
| `--color-error-foreground`     | `#7c2e20` | Error surface text                         |
| `--color-focus-ring`           | `#3e5136` | `:focus-visible` outline                   |

Every text pair above clears WCAG 1.4.3 at 4.5:1; borders and the focus ring
clear WCAG 1.4.11 at 3:1.

## Breakpoints

Declared once in `@theme` and mirrored in `src/lib/breakpoints.ts` so CSS and JS
switch at the same point. `src/__tests__/design-tokens.test.ts` fails if the two
drift apart.

| Token             | Value   | Equivalent |
| ----------------- | ------- | ---------- |
| `--breakpoint-sm` | `40rem` | 640px      |
| `--breakpoint-md` | `48rem` | 768px      |
| `--breakpoint-lg` | `64rem` | 1024px     |
| `--breakpoint-xl` | `80rem` | 1280px     |

Every breakpoint is stated in `rem`, never `px`. `NAV_BREAKPOINT` and
`TABLE_BREAKPOINT` in `src/lib/breakpoints.ts` name the two that carry layout
decisions — both currently `md`. Change the constant, not the call sites.

Components that must render **different markup** either side of a breakpoint use
`useBreakpoint` from `src/lib/useMediaQuery.ts` rather than CSS visibility
toggles, so only one form is ever in the DOM. Everything else uses Tailwind's
`md:` variants.

In unit tests, `src/test/viewport.ts` stubs `matchMedia`;
`setViewportWidth(mobileWidth())` / `setViewportWidth(desktopWidth())` put a
render either side of a breakpoint, and the global setup resets to desktop
before each test.

## Target size

| Token                 | Value        | Meaning                          |
| --------------------- | ------------ | -------------------------------- |
| `--size-touch-target` | `2.75rem`    | Minimum hit area for any control |
| `--container-sidebar` | `20.6875rem` | Desktop side panel width         |

The `touch-target` utility applies the token to both axes. **Every interactive
element - link, button, input, select, textarea — must carry it.**
`src/__tests__/touch-targets.test.tsx` renders every screen at both widths and
fails if one does not; `cypress/e2e/reflow-320.cy.ts` measures the real boxes at
320px. 44px clears the 24px WCAG 2.5.8 minimum with room to spare.

## Navigation

`src/components/Navigation.tsx` renders one of two forms, never both:

| Width   | Form                          | Test id      |
| ------- | ----------------------------- | ------------ |
| `>= md` | Side panel with the user card | `sidebar`    |
| `< md`  | Sticky bottom bar with icons  | `bottom-nav` |

Both expose a single `Main` navigation landmark. The bottom bar uses each item's
`shortLabel` so five destinations fit at 320px. Adding a destination means
adding one entry to `navByRole` with both labels and an icon.

## Tables

Import `DataTable` from `src/components/DataTable.tsx` rather than writing a
`<table>` per screen. It renders a table at `md` and above and a stacked card
per record below, so nothing scrolls sideways on a phone (WCAG 1.4.10), and it
wires the loading, empty and error states above to whichever form is showing.

```tsx
const columns: DataTableColumn<Row>[] = [
  { key: 'type', header: 'Type', cell: (r) => r.leave_type },
  { key: 'review', header: 'Review', hideHeader: true, hideCardLabel: true,
    cell: (r) => <LinkButton to={`/requests/${r.id}`}>Review</LinkButton> },
]

<DataTable
  caption="Time-off requests"
  columns={columns}
  rows={rows}
  rowKey={(r) => r.id}
  error={error}
  onRetry={retry}
  emptyMessage="No requests to review yet."
/>
```

Each column's `header` doubles as the card's label, so a value is never
unlabelled on a phone. Use `hideHeader` for an action column whose header would
be noise in the table, and `hideCardLabel` where the cell speaks for itself.
Hold `rows` as `T[] | null` exactly as described above.

`src/screens/shared/RequestsList.tsx` is the reference implementation.

## Typography

| Token          | Value               | Applied to                     |
| -------------- | ------------------- | ------------------------------ |
| `--font-sans`  | `Schibsted Grotesk` | `body`, all UI text by default |
| `--font-serif` | `Source Serif 4`    | `h1`–`h6`                      |

## Shared loading, empty and error states

Import from `@/components/states`. **Use these rather than rolling a new
spinner, "nothing here" message or error banner per screen.** Every one of them
already carries the right live-region role, so a screen reader user is told when
a region changes (WCAG 4.1.3).

### Layout metrics

Loading placeholders reserve the same box the real content will occupy, so
nothing shifts when the request resolves.

| Metric                  | Value   | Meaning                                   |
| ----------------------- | ------- | ----------------------------------------- |
| `STATE_MIN_HEIGHT`      | `12rem` | Height reserved by the non-table states   |
| `TABLE_ROW_HEIGHT`      | `3rem`  | Height of a table row, skeleton or loaded |
| `SKELETON_LINE_HEIGHT`  | `1rem`  | Height of a single skeleton bar           |
| `DEFAULT_SKELETON_ROWS` | `3`     | Rows/lines a skeleton renders by default  |

A table that uses `TableLoadingState` **must** apply
`style={{ height: TABLE_ROW_HEIGHT }}` to its loaded `<tr>` elements. That
pairing is what keeps the table the same height in both states.

### Components

| Component           | Role announced | Notes                                                             |
| ------------------- | -------------- | ----------------------------------------------------------------- |
| `Skeleton`          | none           | `aria-hidden` bar; sizing primitive, rarely used directly         |
| `LoadingState`      | `status`       | `aria-busy="true"`, visually hidden label, stack of skeleton bars |
| `EmptyState`        | `status`       | Message plus an optional call to action                           |
| `ErrorState`        | `alert`        | Message plus an optional retry button                             |
| `TableLoadingState` | `status`       | Renders a `<tbody>` of skeleton rows                              |
| `TableEmptyState`   | `status`       | Renders a `<tbody>` with one `colSpan` row                        |
| `TableErrorState`   | `alert`        | Renders a `<tbody>` with one `colSpan` row and a retry button     |

The table variants each render a complete `<tbody>`, so they drop straight into
a table in place of the loaded body and keep the column count intact.

### Error messages

`ErrorState` and `TableErrorState` take the raw rejection value and resolve the
copy through `getApiErrorMessage` in `src/lib/api.ts`, the same handler that
turns an API response into an `Error`. Pass the caught value through unchanged;
use `fallbackMessage` only for the case where the rejection carries no message.

### Usage

```tsx
import {
  TABLE_ROW_HEIGHT,
  TableEmptyState,
  TableErrorState,
  TableLoadingState,
} from '@/components/states'

const COLUMN_COUNT = 3

<table>
  <thead>{/* three <th> */}</thead>
  {error ? (
    <TableErrorState columns={COLUMN_COUNT} error={error} onRetry={retry} />
  ) : rows === null ? (
    <TableLoadingState columns={COLUMN_COUNT} label="Loading requests" />
  ) : rows.length === 0 ? (
    <TableEmptyState
      columns={COLUMN_COUNT}
      message="You have not requested any time off yet."
      action={<Link to="/employee/my-requests/new">New request</Link>}
    />
  ) : (
    <tbody>
      {rows.map((r) => (
        <tr key={r.id} style={{ height: TABLE_ROW_HEIGHT }}>
          {/* three <td> */}
        </tr>
      ))}
    </tbody>
  )}
</table>
```

Hold the loaded data in state as `T[] | null` — `null` means "still loading",
`[]` means "loaded and genuinely empty". Collapsing the two is what produces an
empty state flashing before real rows arrive.

`src/screens/shared/RequestsList.tsx` and
`src/screens/employee/MyRequests.tsx` are the reference implementations.

## Motion

Skeletons pulse via Tailwind's `animate-pulse` and carry
`motion-reduce:animate-none`, so the animation is dropped for anyone who has
asked for reduced motion.
