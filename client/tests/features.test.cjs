const test = require("node:test"),
  assert = require("node:assert/strict"),
  fs = require("node:fs"),
  vm = require("node:vm"),
  ts = require("typescript"),
  React = require("react"),
  render = require("react-dom/server").renderToStaticMarkup;
const moduleCache = new Map();
function load(path, clock = Date) {
  const nodePath = require("node:path");
  path = nodePath.resolve(path);
  if (clock === Date && moduleCache.has(path)) return moduleCache.get(path).exports;
  const module = { exports: {} };
  if (clock === Date) moduleCache.set(path, module);
  const code = ts.transpileModule(fs.readFileSync(path, "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      jsx: ts.JsxEmit.ReactJSX,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  vm.runInNewContext(code, {
    require: id => {
      if (!id.startsWith("@/") && !id.startsWith(".")) return require(id);
      const base = id.startsWith("@/") ? nodePath.resolve("src", id.slice(2)) : nodePath.resolve(nodePath.dirname(path), id);
      const file = [base, base + ".ts", base + ".tsx", nodePath.join(base, "index.ts")].find(f => fs.existsSync(f) && fs.statSync(f).isFile());
      if (!file) throw new Error("Test module not found: " + id);
      return load(file, clock);
    },
    module,
    exports: module.exports,
    URL,
    Date: clock,
    window: { location: { origin: "http://localhost:3000" } },
  });
  return module.exports;
}

test("project navigation remembers only valid work views for the same user and project", () => {
  const { readWorkView, saveWorkView, projectSection } = load("src/lib/projectNavigation.ts");
  const values = new Map();
  const storage = { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) };
  saveWorkView("alice", "project-a", "calendar", storage);
  assert.equal(readWorkView("alice", "project-a", storage), "calendar");
  assert.equal(readWorkView("bob", "project-a", storage), "board");
  assert.equal(readWorkView("alice", "project-b", storage), "board");
  saveWorkView("alice", "project-a", "governance", storage);
  assert.equal(readWorkView("alice", "project-a", storage), "calendar");
  values.set("mission_control_view:alice:project-a", "https://unexpected.example");
  assert.equal(readWorkView("alice", "project-a", storage), "board");
  const unavailable = { getItem() { throw new Error("Storage denied"); }, setItem() { throw new Error("Storage denied"); } };
  assert.equal(readWorkView("alice", "project-a", unavailable), "board");
  assert.doesNotThrow(() => saveWorkView("alice", "project-a", "list", unavailable));
  assert.equal(projectSection("/p/project-a/timeline", "project-a"), "timeline");
  assert.equal(projectSection("/projects/project-a/board", "project-a"), "board");
  assert.equal(projectSection("/p/project-b/calendar", "project-a"), "");
  assert.equal(projectSection("/settings", "project-a"), "");
});

test("recent projects are bounded, deduplicated and isolated by account and workspace", () => {
  const { readRecentProjects, rememberProject } = load("src/lib/projectNavigation.ts");
  const values = new Map();
  const storage = { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) };
  for (let i = 0; i < 9; i++) rememberProject("alice", "team-a", "project-" + i, storage);
  rememberProject("alice", "team-a", "project-6", storage);
  assert.equal(JSON.stringify(readRecentProjects("alice", "team-a", storage)), JSON.stringify(["project-6", "project-8", "project-7", "project-5", "project-4", "project-3"]));
  assert.equal(readRecentProjects("bob", "team-a", storage).length, 0);
  assert.equal(readRecentProjects("alice", "team-b", storage).length, 0);
  values.set("mission_control_recent:alice:team-a", "not json");
  assert.equal(readRecentProjects("alice", "team-a", storage).length, 0);
});

test("Persian UI translation interpolates values without translating user content", () => {
  const i18n = load("src/i18n/index.ts");
  try {
    i18n.setLocale("fa");
    assert.equal(i18n.tr("Notes"), "یادداشت‌ها");
    assert.equal(i18n.tr("Assigned {value0}", { value0: "Done" }), "Done مسئول شد");
    assert.equal(i18n.tr("{value0}m", { value0: 12 }), "۱۲ دقیقه");
    assert.equal(i18n.tr("Custom user content نیم‌فاصله"), "Custom user content نیم‌فاصله");
    i18n.setLocale("en");
    assert.equal(i18n.tr("Assigned {value0}", { value0: "Done" }), "Assigned Done");
    assert.equal(i18n.tr("Notes"), "Notes");
  } finally { i18n.setLocale("en"); }
});

test("all Persian catalog entries preserve interpolation placeholders", () => {
  const { fa } = load("src/i18n/fa.ts");
  for (const [source, translation] of Object.entries(fa)) {
    assert.ok(translation.trim(), source);
    const parameters = text => [...text.matchAll(/\{(\w+)\}/g)].map(match => match[1]).sort();
    assert.deepEqual(parameters(translation), parameters(source), source);
  }
});

test("Persian dates stay Gregorian and enum labels keep API values separate", () => {
  const i18n = load("src/i18n/index.ts");
  try {
    i18n.setLocale("fa");
    assert.equal(new Intl.DateTimeFormat(i18n.dateLocale()).resolvedOptions().calendar, "gregory");
    assert.equal(i18n.uiLabel("urgent"), "فوری");
    assert.equal(i18n.uiLabel("viewer"), "مشاهده‌گر");
    assert.equal(i18n.formatNumber(1234), "۱٬۲۳۴");
  } finally { i18n.setLocale("en"); }
});

test("literal interface translation keys always have a Persian catalog entry", () => {
  const { fa } = load("src/i18n/fa.ts");
  const path = require("node:path");
  const missing = [];
  function scan(directory) {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const file = path.join(directory, entry.name);
      if (entry.isDirectory()) { scan(file); continue; }
      if (!/\.tsx?$/.test(file)) continue;
      const source = ts.createSourceFile(file, fs.readFileSync(file, "utf8"), ts.ScriptTarget.Latest, true);
      function visit(node) {
        if (ts.isCallExpression(node) && node.expression.getText(source) === "tr" && node.arguments[0] && ts.isStringLiteral(node.arguments[0]) && !Object.hasOwn(fa, node.arguments[0].text)) missing.push(file + ": " + node.arguments[0].text);
        ts.forEachChild(node, visit);
      }
      visit(source);
    }
  }
  scan("src");
  assert.deepEqual(missing, []);
});

test("Persian search accepts Arabic keyboard letter variants without removing ZWNJ", () => {
  const { normalizeSearch } = load("src/i18n/index.ts");
  const original = "مي‌توانيم كاربرد";
  assert.equal(normalizeSearch(original), "می‌توانیم کاربرد");
  assert.ok(normalizeSearch(original).includes("\u200c"));
  assert.equal(original, "مي‌توانيم كاربرد");
});

test("new timers start at zero despite an eleven-minute browser clock offset or clock adjustment", () => {
  const server = Date.parse("2026-11-01T10:00:00Z");
  for (const offset of [-660000, 660000]) {
    let wallTime = server + offset;
    class BrowserDate extends Date { static now() { return wallTime; } }
    const { anchorTimer, timerElapsedSeconds } = load("src/lib/timerClock.ts", BrowserDate);
    const timer = anchorTimer({ started_at: new Date(server).toISOString(), server_now: new Date(server).toISOString() }, 100);
    assert.equal(timerElapsedSeconds(timer, 90), 0);
    assert.equal(timerElapsedSeconds(timer, 100), 0);
    assert.equal(timerElapsedSeconds(timer, 5100), 5);
    wallTime += 3600000;
    assert.equal(timerElapsedSeconds(timer, 6100), 6);
  }
});
test("timer reloads and polls preserve server elapsed duration with timezone offsets", () => {
  const { anchorTimer, timerElapsedSeconds } = load("src/lib/timerClock.ts");
  const timer = anchorTimer({ started_at: "2026-11-01T13:30:00+03:30", server_now: "2026-11-01T10:11:00Z" }, 900);
  assert.equal(timerElapsedSeconds(timer, 900), 660);
  assert.equal(timerElapsedSeconds(timer, 2900), 662);
  const polled = anchorTimer({ started_at: "2026-11-01T10:00:00Z", server_now: "2026-11-01T10:11:10Z" }, 10900);
  assert.equal(timerElapsedSeconds(polled, 11900), 671);
});
test("timer synchronization rejects missing timestamps and clamps future starts", () => {
  const { anchorTimer, timerElapsedSeconds } = load("src/lib/timerClock.ts");
  assert.throws(() => anchorTimer({ started_at: "invalid", server_now: "invalid" }, 0), /synchronize/);
  assert.throws(() => anchorTimer({ started_at: "2026-11-01T10:00:00Z" }, 0), /synchronize/);
  const timer = anchorTimer({ started_at: "2026-11-01T10:11:00Z", server_now: "2026-11-01T10:00:00Z" }, 0);
  assert.equal(timerElapsedSeconds(timer, 0), 0);
});
const dates = load("src/features/views/boardDates.ts"),
  { Markdown } = load("src/components/common/Markdown.tsx");
test("calendar rescheduling preserves multi-day duration across months", () => {
  const result = dates.reschedule(
    { id: "task", start_date: "2026-09-28", due_date: "2026-10-01" },
    "2026-11-05",
  );
  assert.equal(result.start_date, "2026-11-02");
  assert.equal(result.due_date, "2026-11-05");
});
test("a due-only task stays due-only when rescheduled", () => {
  const result = dates.reschedule(
    { id: "task", due_date: "2026-10-01" },
    "2026-10-20",
  );
  assert.equal(result.start_date, undefined);
  assert.equal(result.due_date, "2026-10-20");
});
test("calendar days remain one day apart across daylight-saving transitions", () => {
  const previous = process.env.TZ;
  try {
    process.env.TZ = "America/New_York";
    assert.equal(
      dates.daysBetween(
        dates.parseDay("2026-03-07"),
        dates.parseDay("2026-03-08"),
      ),
      1,
    );
  } finally {
    if (previous === undefined) delete process.env.TZ;
    else process.env.TZ = previous;
  }
});
test("Markdown renders headings, emphasis, lists, and code", () => {
  const html = render(
    React.createElement(Markdown, {
      text: "# Heading\n**Bold**\n- Item\n```\nconst x = 1;\n```",
    }),
  );
  assert.match(html, /aria-level="1"/);
  assert.match(html, /<strong>Bold<\/strong>/);
  assert.match(html, /<ul/);
  assert.match(html, /<pre/);
});
test("Markdown renders raw HTML as text and rejects script URLs", () => {
  const html = render(
    React.createElement(Markdown, {
      text: "<script>alert(1)</script>\n[unsafe](javascript:alert)",
    }),
  );
  assert.match(html, /&lt;script&gt;/);
  assert.doesNotMatch(html, /<script>/);
  assert.doesNotMatch(html, /href="javascript:/);
});
test("Markdown retains safe HTTPS links and mention badges", () => {
  const html = render(
    React.createElement(Markdown, {
      text: "[Docs](https://example.com/spec) @member",
    }),
  );
  assert.match(html, /href="https:\/\/example.com\/spec"/);
  assert.match(html, /@member/);
  assert.match(html, /rel="noreferrer"/);
});

const desk = load("src/features/localops/deskMetrics.ts");
test("service desk reply SLA stops after a public response while resolution stays active", () => {
  const ticket = {
    status: "open",
    response_due_at: "2026-10-12T01:00:00Z",
    resolution_due_at: "2026-10-12T04:00:00Z",
  };
  const now = Date.parse("2026-10-12T02:00:00Z");
  assert.equal(desk.isSlaBreached(ticket, now), true);
  assert.equal(
    desk.isSlaBreached(
      { ...ticket, responded_at: "2026-10-12T00:30:00Z" },
      now,
    ),
    false,
  );
  assert.equal(
    desk.isSlaBreached(
      { ...ticket, responded_at: "2026-10-12T00:30:00Z" },
      Date.parse("2026-10-12T05:00:00Z"),
    ),
    true,
  );
});
test("resolved and closed requests do not appear in SLA overdue queues", () => {
  for (const status of ["resolved", "closed"])
    assert.equal(
      desk.isSlaBreached(
        {
          status,
          response_due_at: "2020-01-01",
          resolution_due_at: "2020-01-01",
        },
        Date.now(),
      ),
      false,
    );
});

const audit = load("src/components/common/auditPresentation.ts");
test("audit summaries name changes and preserve previous/new values", () => {
  const payload = {
    changes: {
      priority: { before: "low", after: "high" },
      status: { before: "To Do", after: "Done" },
    },
  };
  assert.equal(
    audit.auditSummary("api_mutation", payload),
    "Changed Priority, Status",
  );
  assert.equal(audit.auditChanges(payload)[0].before, "low");
  assert.equal(audit.auditValue(["Alice", "Bob"]), "Alice; Bob");
  assert.equal(audit.auditValue(false), "No");
  assert.equal(audit.labelFor("first_response_at"), "First Response At");
});
test("legacy audit payloads are readable and credentials are redacted", () => {
  assert.equal(
    audit.auditSummary(
      "api_mutation",
      audit.auditPayload('{"route":"comments/123","method":"PUT"}'),
    ),
    "Edited a comment",
  );
  assert.equal(audit.auditPayload("legacy text").note, "legacy text");
  assert.equal(
    audit.redactAudit({
      nested: { token: "private" },
      password: "private",
      title: "Safe",
    }).nested.token,
    "[redacted]",
  );
  assert.equal(audit.redactAudit({ title: "Safe" }).title, "Safe");
});

const calendar = load("src/components/ui/calendarDates.ts");
test("Gregorian date-only picker values stay on the same day across time zones", () => {
  const original = process.env.TZ;
  try {
    for (const zone of ["UTC", "Asia/Tehran", "America/Los_Angeles"]) {
      process.env.TZ = zone;
      const date = calendar.parseCalendarValue("2026-10-12");
      assert.equal(date.getDate(), 12);
      assert.equal(calendar.calendarValue(date), "2026-10-12");
    }
  } finally {
    if (original === undefined) delete process.env.TZ;
    else process.env.TZ = original;
  }
});
test("Gregorian picker handles leap days, invalid days and bounded dates", () => {
  assert.equal(
    calendar.calendarValue(calendar.parseCalendarValue("2028-02-29")),
    "2028-02-29",
  );
  assert.equal(calendar.parseCalendarValue("2026-02-29"), null);
  assert.equal(calendar.parseCalendarValue("invalid"), null);
  assert.equal(
    calendar.withinDateBounds(
      calendar.parseCalendarValue("2026-10-12"),
      "2026-10-12",
      "2026-10-15",
    ),
    true,
  );
  assert.equal(
    calendar.withinDateBounds(
      calendar.parseCalendarValue("2026-10-11"),
      "2026-10-12",
    ),
    false,
  );
  assert.equal(
    calendar.withinDateBounds(
      calendar.parseCalendarValue("2026-10-16"),
      undefined,
      "2026-10-15",
    ),
    false,
  );
});
test("Date-time picker saves local clock time and enforces time limits", () => {
  const date = calendar.parseCalendarValue("2026-10-12T14:35");
  assert.equal(calendar.calendarValue(date, true), "2026-10-12T14:35");
  assert.equal(
    calendar.withinDateBounds(
      date,
      "2026-10-12T14:30",
      "2026-10-12T14:40",
      true,
    ),
    true,
  );
  assert.equal(
    calendar.withinDateBounds(date, "2026-10-12T14:36", undefined, true),
    false,
  );
});

const { cardDropTarget } = load("src/features/board/cardDrop.ts");
const dragCards = [
  {id:"one",column_id:"todo",position:1000},
  {id:"two",column_id:"todo",position:2000},
  {id:"three",column_id:"todo",position:3000},
  {id:"other",column_id:"done",position:1000},
];
test("card drop marker and saved order share before/after insertion math",()=>{
  const before=cardDropTarget(dragCards,"three","todo","two",false,"all");
  const after=cardDropTarget(dragCards,"one","todo","two",true,"all");
  assert.equal(before.beforeId,"two");
  assert.equal(before.position,1500);
  assert.equal(after.beforeId,"three");
  assert.equal(after.position,2500);
  assert.equal(after.laneId,"all");
});
test("cross-column drops insert at either edge or into an empty column",()=>{
  const first=cardDropTarget(dragCards,"one","done","other",false);
  const last=cardDropTarget(dragCards,"one","done","other",true);
  assert.equal(first.beforeId,"other");
  assert.ok(first.position<1000);
  assert.equal(last.beforeId,null);
  assert.ok(last.position>1000);
  const empty=cardDropTarget(dragCards,"one","empty",null,false);
  assert.equal(empty.beforeId,null);
  assert.equal(empty.position,65536);
});
test("moving a task excludes its old position and rejects invalid targets",()=>{
  const end=cardDropTarget(dragCards,"two","todo",null,false);
  assert.ok(end.position>3000);
  assert.equal(cardDropTarget(dragCards,"two","todo","two",false),null);
  assert.equal(cardDropTarget(dragCards,"two","todo","other",false),null);
  const ordered=dragCards.filter(card=>card.id!=="one").concat({...dragCards[0],position:cardDropTarget(dragCards,"one","todo","three",true).position}).filter(card=>card.column_id==="todo").sort((a,b)=>a.position-b.position);
  assert.deepEqual(ordered.map(card=>card.id),["two","three","one"]);
});

test("drop placement preserves the indicated slot when existing positions collide",()=>{
  const {applyCardPlacement}=load("src/features/board/cardDrop.ts");
  const cards=[{id:"a",column_id:"todo",position:1000},{id:"b",column_id:"todo",position:1000},{id:"c",column_id:"todo",position:1000},{id:"moved",column_id:"done",position:1000}];
  const moved=applyCardPlacement(cards,"moved","todo","b").filter(card=>card.column_id==="todo").sort((a,b)=>a.position-b.position);
  assert.deepEqual(moved.map(card=>card.id),["a","moved","b","c"]);
  assert.equal(new Set(moved.map(card=>card.position)).size,4);
});

const workspaceSelection=load("src/lib/workspaceSelection.ts");
test("workspace choice survives generic pages and validates saved membership",()=>{
  const workspaces=[{id:"first"},{id:"chosen"}];
  assert.equal(workspaceSelection.resolveWorkspaceId(workspaces,undefined,"chosen"),"chosen");
  assert.equal(workspaceSelection.resolveWorkspaceId(workspaces,"first","chosen"),"first");
  assert.equal(workspaceSelection.resolveWorkspaceId(workspaces,undefined,"removed"),"first");
  assert.equal(workspaceSelection.resolveWorkspaceId([],undefined,"chosen"),"");
});
test("workspace selections remain account-specific and corrupted storage is ignored",()=>{
  const selections=workspaceSelection.parseWorkspaceSelections('{"alice":"workspace-a","bob":"workspace-b","invalid":7}');
  assert.equal(selections.alice,"workspace-a");
  assert.equal(selections.bob,"workspace-b");
  assert.equal(selections.invalid,undefined);
  assert.deepEqual(Object.keys(workspaceSelection.parseWorkspaceSelections("not-json")),[]);
  assert.deepEqual(Object.keys(workspaceSelection.parseWorkspaceSelections("[]")),[]);
});
