const test = require("node:test"),
  assert = require("node:assert/strict"),
  fs = require("node:fs"),
  vm = require("node:vm"),
  ts = require("typescript"),
  React = require("react"),
  render = require("react-dom/server").renderToStaticMarkup;
function load(path) {
  const module = { exports: {} };
  const code = ts.transpileModule(fs.readFileSync(path, "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      jsx: ts.JsxEmit.ReactJSX,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  vm.runInNewContext(code, {
    require,
    module,
    exports: module.exports,
    URL,
    Date,
    window: { location: { origin: "http://localhost:3000" } },
  });
  return module.exports;
}
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
