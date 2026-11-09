import { useState } from "react";
import { Modal, Button } from "@/components/ui";
import { Copy, Check, Terminal, Cpu, BookOpen, Layers } from "lucide-react";

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
    "claude" | "antigravity" | "cursor" | "cline" | "tools"
  >("claude");
  const [copied, setCopied] = useState<string | null>(null);

  const tokenPlaceholder = activeToken || "YOUR_API_KEY_HERE";
  const binaryPath =
    "/path/to/mission-control/mcp-server/target/release/nexa-mission-control-mcp";

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
    <Modal isOpen={isOpen} onClose={onClose} title="Model Context Protocol (MCP) Manual">
      <div className="space-y-5 max-h-[75vh] overflow-y-auto pr-1">
        {/* Intro Banner */}
        <div className="p-3.5 rounded-lg bg-blue-50/70 dark:bg-blue-950/20 border border-blue-200/60 dark:border-blue-900/40 text-xs text-blue-900 dark:text-blue-200 flex items-start gap-2.5">
          <Cpu className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-sm text-blue-950 dark:text-blue-100 mb-0.5">
              Connect AI Assistants to Mission Control
            </p>
            The <strong>NEXA Mission Control MCP Server</strong> runs locally via Rust standard I/O (stdio). It lets AI agents (Claude Desktop, Antigravity, Cursor, Cline) read boards, manage tasks, move cards, and post comments directly.
          </div>
        </div>

        {/* Step 1: Binary Build */}
        <div className="space-y-2">
          <h3 className="text-sm font-semibold flex items-center gap-1.5 text-slate-800 dark:text-slate-200">
            <Terminal className="w-4 h-4 text-emerald-500" />
            Step 1: Build the MCP Server Binary
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Compile the lightweight (~2.8 MB) Rust standalone executable from source:
          </p>
          <div className="relative group">
            <pre className="p-2.5 rounded-md bg-slate-900 text-slate-100 font-mono text-xs overflow-x-auto">
              {`cd mission-control/mcp-server\ncargo build --release`}
            </pre>
            <button
              onClick={() => copySnippet("build", "cd mission-control/mcp-server && cargo build --release")}
              className="absolute top-2 right-2 p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs flex items-center gap-1"
              title="Copy command"
            >
              {copied === "build" ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* Step 2: Client Config */}
        <div className="space-y-2.5">
          <h3 className="text-sm font-semibold flex items-center gap-1.5 text-slate-800 dark:text-slate-200">
            <Layers className="w-4 h-4 text-indigo-500" />
            Step 2: Add MCP Configuration to Your Client
          </h3>

          {/* Client Tabs */}
          <div className="flex border-b border-slate-200 dark:border-white/[0.08] text-xs">
            {[
              { id: "claude", label: "Claude Desktop" },
              { id: "antigravity", label: "Antigravity / Gemini" },
              { id: "cursor", label: "Cursor" },
              { id: "cline", label: "Cline / VS Code" },
              { id: "tools", label: "🛠 Available Tools" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                className={`px-3 py-1.5 font-medium border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? "border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400"
                    : "border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {activeTab !== "tools" ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                <span>
                  {activeTab === "claude" && "Config path: ~/.config/Claude/claude_desktop_config.json"}
                  {activeTab === "antigravity" && "Config path: ~/.gemini/antigravity/mcp_config.json"}
                  {activeTab === "cursor" && "Config path: .cursor/mcp.json in workspace"}
                  {activeTab === "cline" && "Config path: ~/Library/Application Support/Code/.../cline_mcp_settings.json"}
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

              <pre className="p-3 rounded-lg bg-slate-900 text-slate-100 font-mono text-xs overflow-x-auto max-h-48">
                {configs[activeTab as keyof typeof configs]}
              </pre>
            </div>
          ) : (
            <div className="border border-slate-200 dark:border-white/[0.08] rounded-lg overflow-hidden text-xs">
              <table className="w-full text-left">
                <thead className="bg-slate-50 dark:bg-[#121318] text-slate-600 dark:text-slate-300 border-b border-slate-200 dark:border-white/[0.08]">
                  <tr>
                    <th className="p-2 font-medium">Tool</th>
                    <th className="p-2 font-medium">Description</th>
                    <th className="p-2 font-medium">Parameters</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-white/[0.04]">
                  {[
                    { tool: "mc_list_workspaces", desc: "List all accessible workspaces", params: "none" },
                    { tool: "mc_list_projects", desc: "List projects in workspace", params: "workspace_id" },
                    { tool: "mc_get_board", desc: "Get board columns & column IDs", params: "project_id" },
                    { tool: "mc_list_tasks", desc: "List tasks with search & column filters", params: "project_id, column_id?, query?" },
                    { tool: "mc_get_task", desc: "Full task details, checklists & comments", params: "task_id" },
                    { tool: "mc_create_task", desc: "Create a task in a board column", params: "project_id, column_id, title, description, priority" },
                    { tool: "mc_update_task", desc: "Edit title, description, priority or due date", params: "task_id, title?, description?, priority?" },
                    { tool: "mc_move_task", desc: "Move task across board columns", params: "task_id, target_column_id" },
                    { tool: "mc_add_comment", desc: "Post comment or dev report to task", params: "task_id, comment" },
                  ].map((row) => (
                    <tr key={row.tool} className="hover:bg-slate-50/50 dark:hover:bg-white/[0.02]">
                      <td className="p-2 font-mono text-blue-600 dark:text-blue-400 font-medium">{row.tool}</td>
                      <td className="p-2 text-slate-600 dark:text-slate-300">{row.desc}</td>
                      <td className="p-2 font-mono text-[11px] text-slate-500">{row.params}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="pt-2 border-t border-slate-100 dark:border-white/[0.06] flex items-center justify-between text-xs text-slate-500">
          <span className="flex items-center gap-1.5">
            <BookOpen className="w-3.5 h-3.5 text-slate-400" />
            API Host: <code className="text-slate-700 dark:text-slate-300">https://tasks.nexasmart.net</code>
          </span>
          <Button size="sm" onClick={onClose}>
            Done
          </Button>
        </div>
      </div>
    </Modal>
  );
}
