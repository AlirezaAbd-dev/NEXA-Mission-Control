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
