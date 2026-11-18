import { useState } from "react";
import { Modal, Button } from "@/components/ui";
import { Copy, Check, Terminal, Cpu, BookOpen, Layers, Globe, Sparkles } from "lucide-react";

interface McpManualModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeToken?: string;
}

export function McpManualModal({
  isOpen,
  onClose,
  activeToken,
}: McpManualModalProps) {
  const [activeTab, setActiveTab] = useState<
    "gemini_web" | "claude" | "antigravity" | "cursor" | "cline" | "tools"
  >("gemini_web");
  const [copied, setCopied] = useState<string | null>(null);

  const tokenPlaceholder = activeToken || "YOUR_PERSONAL_TOKEN_HERE";
  const binaryPath =
    "/path/to/mission-control/mcp-server/target/release/nexa-mission-control-mcp";
  const geminiSseUrl = `https://tasks.nexasmart.net/mcp/sse?token=${tokenPlaceholder}`;

  const configs = {
    claude: JSON.stringify(
      {
        mcpServers: {
          "nexa-mission-control": {
            command: binaryPath,
            env: {
              MISSION_CONTROL_URL: "https://tasks.nexasmart.net",
              MISSION_CONTROL_API_KEY: tokenPlaceholder,
            },
          },
        },
      },
      null,
      2,
    ),
    antigravity: JSON.stringify(
      {
        mcpServers: {
          "nexa-mission-control": {
            command: binaryPath,
            env: {
              MISSION_CONTROL_URL: "https://tasks.nexasmart.net",
              MISSION_CONTROL_API_KEY: tokenPlaceholder,
            },
          },
        },
      },
      null,
      2,
    ),
    cursor: JSON.stringify(
      {
        mcpServers: {
          "nexa-mission-control": {
            command: binaryPath,
            env: {
              MISSION_CONTROL_URL: "https://tasks.nexasmart.net",
              MISSION_CONTROL_API_KEY: tokenPlaceholder,
            },
          },
        },
      },
      null,
      2,
    ),
    cline: JSON.stringify(
      {
        mcpServers: {
          "nexa-mission-control": {
            command: binaryPath,
            env: {
              MISSION_CONTROL_URL: "https://tasks.nexasmart.net",
              MISSION_CONTROL_API_KEY: tokenPlaceholder,
            },
          },
        },
      },
      null,
      2,
    ),
  };

  const copySnippet = (key: string, text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(key);
      setTimeout(() => setCopied(null), 2000);
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="NEXA Mission Control — MCP Integration Guide"
      size="3xl"
    >
      <div className="space-y-6 max-h-[78vh] overflow-y-auto pr-1 text-slate-800 dark:text-slate-100">
        {/* Architecture Banner */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="p-3.5 rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50/60 dark:from-blue-950/20 dark:to-indigo-950/20 border border-blue-200/70 dark:border-blue-900/40 text-xs flex items-start gap-3">
            <Globe className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-sm text-blue-950 dark:text-blue-100 flex items-center gap-1.5 mb-1">
                <span>Cloud Remote MCP (SSE)</span>
                <span className="px-1.5 py-0.5 text-[10px] rounded-full bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 font-normal">
                  Zero Install
                </span>
              </p>
              Connect directly from <strong>Gemini Web</strong> (<code>gemini.google.com</code>) or any web-based AI client via live Server-Sent Events.
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-gradient-to-br from-emerald-50 to-teal-50/60 dark:from-emerald-950/20 dark:to-teal-950/20 border border-emerald-200/70 dark:border-emerald-900/40 text-xs flex items-start gap-3">
            <Cpu className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-sm text-emerald-950 dark:text-emerald-100 flex items-center gap-1.5 mb-1">
                <span>Local Desktop MCP (stdio)</span>
                <span className="px-1.5 py-0.5 text-[10px] rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 font-normal">
                  ~2.8 MB Rust
                </span>
              </p>
              Run high-performance stdio agent loop for <strong>Claude Desktop</strong>, <strong>Antigravity</strong>, <strong>Cursor</strong>, or <strong>Cline</strong>.
            </div>
          </div>
        </div>

        {/* Client Tabs */}
        <div className="space-y-4">
          <div className="flex border-b border-slate-200 dark:border-white/[0.08] text-xs gap-1 overflow-x-auto">
            {[
              { id: "gemini_web", label: "🌐 Gemini Web (Connectors)" },
              { id: "antigravity", label: "⚡ Antigravity / Gemini CLI" },
              { id: "claude", label: "💬 Claude Desktop" },
              { id: "cursor", label: "💻 Cursor" },
              { id: "cline", label: "🧩 Cline / VS Code" },
              { id: "tools", label: "🛠 Available Tools (9)" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                className={`px-3.5 py-2 font-medium border-b-2 whitespace-nowrap transition-colors ${
                  activeTab === tab.id
                    ? "border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400"
                    : "border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {activeTab === "gemini_web" ? (
            <div className="space-y-4 rounded-xl border border-blue-200/80 dark:border-blue-900/50 bg-blue-50/20 dark:bg-blue-950/10 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-blue-500" />
                    How to Connect Gemini Web (gemini.google.com)
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    No installation or local binary needed. Connects directly over HTTPS Server-Sent Events.
                  </p>
                </div>
              </div>

              {/* URL Box */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Step 1: Copy your MCP Server URL
                </label>
                <div className="relative group">
                  <pre className="p-3 rounded-lg bg-slate-900 text-emerald-400 font-mono text-xs overflow-x-auto pr-24 border border-slate-800">
                    {geminiSseUrl}
                  </pre>
                  <button
                    onClick={() => copySnippet("gemini_url", geminiSseUrl)}
                    className="absolute top-2.5 right-2.5 px-2.5 py-1.5 rounded-md bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium flex items-center gap-1.5 transition-colors shadow-sm"
                    title="Copy URL"
                  >
                    {copied === "gemini_url" ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-200" /> Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" /> Copy URL
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Step by Step Instructions */}
              <div className="space-y-2 text-xs text-slate-600 dark:text-slate-300">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Step 2: Add Connector in Gemini Web
                </label>
                <ol className="list-decimal list-inside space-y-1.5 pl-1 leading-relaxed">
                  <li>
                    Open <strong><a href="https://gemini.google.com" target="_blank" rel="noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline">gemini.google.com</a></strong> and click on <strong>Settings</strong> ➔ <strong>Connectors</strong> (or <strong>Custom</strong>).
                  </li>
                  <li>
                    Click the <strong>+ Custom</strong> / <strong>Connect to an MCP server</strong> button.
                  </li>
                  <li>
                    Paste the copied URL above into the <strong>MCP server URL</strong> input.
                  </li>
                  <li>
                    Leave <strong>Additional settings</strong> (Client ID and Client secret) <em>empty</em>.
                  </li>
                  <li>
                    Click <strong>Next</strong>. Gemini Web will instantly handshake and register all 9 Mission Control tools!
                  </li>
                </ol>
              </div>
            </div>
          ) : activeTab !== "tools" ? (
            <div className="space-y-4">
              {/* Build Step */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <Terminal className="w-4 h-4 text-emerald-500" />
                    Step 1: Build the Rust Standalone Binary
                  </h4>
                  <button
                    onClick={() =>
                      copySnippet(
                        "build_cmd",
                        "cd mission-control/mcp-server && cargo build --release",
                      )
                    }
                    className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                  >
                    {copied === "build_cmd" ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                    Copy command
                  </button>
                </div>
                <pre className="p-2.5 rounded-lg bg-slate-900 text-slate-100 font-mono text-xs overflow-x-auto">
                  {`cd mission-control/mcp-server\ncargo build --release`}
                </pre>
              </div>

              {/* Config Step */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                  <span className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <Layers className="w-4 h-4 text-indigo-500" />
                    Step 2: Add to Client Configuration File:
                    <code className="text-slate-800 dark:text-slate-200 font-normal">
                      {activeTab === "claude" && "~/.config/Claude/claude_desktop_config.json"}
                      {activeTab === "antigravity" && "~/.gemini/antigravity/mcp_config.json"}
                      {activeTab === "cursor" && ".cursor/mcp.json in workspace"}
                      {activeTab === "cline" && "cline_mcp_settings.json"}
                    </code>
                  </span>
                  <button
                    onClick={() => copySnippet(activeTab, configs[activeTab as keyof typeof configs])}
                    className="inline-flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    {copied === activeTab ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-500" /> Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" /> Copy JSON
                      </>
                    )}
                  </button>
                </div>

                <pre className="p-3 rounded-lg bg-slate-900 text-slate-100 font-mono text-xs overflow-x-auto max-h-56">
                  {configs[activeTab as keyof typeof configs]}
                </pre>
              </div>
            </div>
          ) : (
            <div className="border border-slate-200 dark:border-white/[0.08] rounded-xl overflow-hidden text-xs shadow-sm">
              <table className="w-full text-left">
                <thead className="bg-slate-50 dark:bg-[#121318] text-slate-600 dark:text-slate-300 border-b border-slate-200 dark:border-white/[0.08]">
                  <tr>
                    <th className="p-2.5 font-semibold">Tool Name</th>
                    <th className="p-2.5 font-semibold">Capability & Purpose</th>
                    <th className="p-2.5 font-semibold">Required & Optional Parameters</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-white/[0.04]">
                  {[
                    { tool: "mc_list_workspaces", desc: "List all accessible workspaces", params: "none" },
                    { tool: "mc_list_projects", desc: "List projects inside workspace", params: "workspace_id (optional)" },
                    { tool: "mc_get_board", desc: "Get board layout, stages and column IDs", params: "project_id" },
                    { tool: "mc_list_tasks", desc: "Query, search and filter cards on board", params: "project_id, column_id?, query?" },
                    { tool: "mc_get_task", desc: "Full task metadata, checklists and comments", params: "task_id" },
                    { tool: "mc_create_task", desc: "Create a new task in any board column", params: "project_id, column_id, title, description?, priority?, due_date?, story_points?" },
                    { tool: "mc_update_task", desc: "Modify title, description, priority or deadline", params: "task_id, title?, description?, priority?, due_date?" },
                    { tool: "mc_move_task", desc: "Transition cards across Kanban stages", params: "task_id, target_column_id" },
                    { tool: "mc_add_comment", desc: "Post dev progress reports or execution logs", params: "task_id, comment" },
                  ].map((row) => (
                    <tr key={row.tool} className="hover:bg-slate-50/50 dark:hover:bg-white/[0.02]">
                      <td className="p-2.5 font-mono text-blue-600 dark:text-blue-400 font-medium whitespace-nowrap">
                        {row.tool}
                      </td>
                      <td className="p-2.5 text-slate-700 dark:text-slate-200 leading-normal">
                        {row.desc}
                      </td>
                      <td className="p-2.5 font-mono text-[11px] text-slate-500 dark:text-slate-400">
                        {row.params}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="pt-3 border-t border-slate-100 dark:border-white/[0.06] flex items-center justify-between text-xs text-slate-500">
          <span className="flex items-center gap-1.5">
            <BookOpen className="w-3.5 h-3.5 text-slate-400" />
            Live Production Host: <code className="text-slate-700 dark:text-slate-300 font-semibold">https://tasks.nexasmart.net</code>
          </span>
          <Button size="sm" onClick={onClose}>
            Done
          </Button>
        </div>
      </div>
    </Modal>
  );
}
