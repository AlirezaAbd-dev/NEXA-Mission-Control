# English, Persian, and RTL

Mission Control supports English (`en`, LTR) and Persian (`fa`, RTL). Change language using the language icon in the header or sign-in screen, or **Settings → General & Appearance → Interface language**. The choice is saved in this browser and synchronized across its tabs. On first use, a Persian browser preference selects Persian; other languages default to English.

This is a shared interface capability for every business activity. Existing workspace membership, project visibility, role checks, and task permissions continue to govern access. No API payload, permission identifier, or database schema changes are required.

## Content and dates

- Interface text, controls, accessibility labels, application-owned enum labels, and known server errors have explicit Persian translations.
- Task titles, column names, workspace names, notes, comments, labels, imported content, and other user data stay as written. Existing English column names are editable data and are not automatically renamed.
- Persian uses local Vazirmatn fonts and Persian number formatting. Calendars and formatted dates remain **Gregorian**, including in Persian, as required for this project.
- Mixed text uses automatic content direction. Email addresses, URLs, code, keyboard shortcuts, and stopwatch readouts retain LTR presentation. Rich-text paragraphs retain their independent LTR/RTL/auto settings.
- Searchable selectors accept Arabic Yeh/Kaf keyboard variants without changing saved text or stripping Persian ZWNJ characters.
- Language switching rerenders the existing interface without remounting the application, preserving open forms and editor drafts.

## Shared responsive behavior

Logical spacing, borders, and alignment mirror with document direction. Directional navigation icons mirror; calendar keyboard navigation follows RTL. Timeline chart coordinates remain chronological LTR so scheduling and drag math stay consistent.

Mobile dialogs, selectors, action menus, notifications, and date pickers use the canonical workspace Vaul bottom-sheet pattern adapted to Mission Control's shared Button and theme. Nested sheets stack above their parent. Task details retain their details/properties tabs, independent scrolling, safe-area spacing, and keyboard-friendly fields. Operational tables become stacked editable cards using the same controls, rather than forcing horizontal scrolling. The Kanban board and timeline retain intentional internal horizontal navigation.

## Maintaining translations

Use `tr("English source", { value0 })` from `client/src/i18n` and add its exact source key to `fa.ts`. Components displaying translated text subscribe through `useUiLocale()`. Keep module-level translated metadata in getters so it follows live language changes. Translate complete sentences with placeholders; never concatenate translated grammar or translate user data. Use `uiLabel` only for controlled application enums, and `formatNumber`/`dateLocale` for localized display. Keep wire values unchanged.

Run `npm test` and `npm run build` in `client`. Tests check catalog completeness for literal translation calls, interpolation parity, English switching, user-content preservation, Gregorian dates, Persian digits, and search normalization.

## Verification

Browser checks used an isolated demo database, not production data. Verified Persian desktop layouts and 320/390 px mobile layouts; English mobile switching; task sheets and nested calendars; editable task-list cards; notifications and account menus; workspace dashboard, settings, backlog, insights, automation, service desk, and authentication screens. Keyboard task movement between RTL columns was verified. An unsaved mixed-language note survived a language switch, subsequent save, and reload. No browser console errors were observed in the final task-sheet check.

These checks use browser viewport emulation. Physical Android/iOS keyboard, safe-area, and screen-reader behavior still need device testing. Unknown dynamic server validation details are preserved verbatim when there is no catalog translation; known errors and status fallbacks are localized. Technical API examples, plugin manifests, stored names, and query operators intentionally retain their original identifiers.

The final calendar direction and reduced-padding correction passes TypeScript/build checks. Browser debugger synchronization timed out during its 320 px recheck, so that specific narrow-calendar correction still needs visual confirmation. The earlier nested-calendar interaction passed at 390 px.
