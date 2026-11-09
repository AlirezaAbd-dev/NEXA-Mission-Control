# NEXA Mission Control — MCP Server Manual & Activation Guide

This guide explains how to connect and activate the **NEXA Mission Control Model Context Protocol (MCP)** server with your AI coding assistants (Claude Desktop, Antigravity, Cursor, Cline, Windsurf).

---

## 1. What is the Mission Control MCP?

The Mission Control MCP server allows AI developer agents to interact with your Mission Control workspaces, boards, and task backlogs in real time.

### Supported Capabilities
- 📂 **Workspaces & Projects**: Discover active workspaces and project identifiers.
- 📋 **Boards & Columns**: Inspect board layouts, stages (`To Do`, `In Progress`, `Ready`, `Testing`, `Done`).
- 📝 **Task Management**: Read task details, checklists, priorities, and descriptions.
- 🔄 **Status Transitions**: Move cards across columns as development progresses.
- 💬 **Dev Comments**: Post progress reports, test run outputs, and Git commit references.

---

## 2. Generating an API Access Token

1. Open Mission Control at `https://tasks.nexasmart.net`.
2. Navigate to **Workspace Settings** ➔ **Security & Access** (or **Personal API Tokens**).
3. Under **Personal API tokens**, enter a name (e.g., `Claude Desktop Agent`) and expiration days.
4. Click **Create token** and copy the secret token (`mc_...`).

---

## 3. Building the Standalone Binary

The server is built in **Rust** for maximum performance and minimum memory footprint (~4.6 MB RSS).

```bash
cd mission-control/mcp-server
cargo build --release
```

The compiled binary will be placed at:
```bash
mission-control/mcp-server/target/release/nexa-mission-control-mcp
```

---

## 4. Client Configurations

### A. Claude Desktop
Add to your `claude_desktop_config.json`:
- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Linux**: `~/.config/Claude/claude_desktop_config.json`
- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "nexa-mission-control": {
      "command": "/ABSOLUTE/PATH/TO/mission-control/mcp-server/target/release/nexa-mission-control-mcp",
      "env": {
        "MISSION_CONTROL_URL": "https://tasks.nexasmart.net",
        "MISSION_CONTROL_API_KEY": "YOUR_PERSONAL_TOKEN_HERE"
      }
    }
  }
}
```

---

### B. Google Antigravity & Gemini
Add to `~/.gemini/antigravity/mcp_config.json`:

```json
{
  "mcpServers": {
    "nexa-mission-control": {
      "command": "/ABSOLUTE/PATH/TO/mission-control/mcp-server/target/release/nexa-mission-control-mcp",
      "env": {
        "MISSION_CONTROL_URL": "https://tasks.nexasmart.net",
        "MISSION_CONTROL_API_KEY": "YOUR_PERSONAL_TOKEN_HERE"
      }
    }
  }
}
```

---

### C. Cursor IDE
Create or edit `.cursor/mcp.json` in your project root:

```json
{
  "mcpServers": {
    "nexa-mission-control": {
      "command": "/ABSOLUTE/PATH/TO/mission-control/mcp-server/target/release/nexa-mission-control-mcp",
      "env": {
        "MISSION_CONTROL_URL": "https://tasks.nexasmart.net",
        "MISSION_CONTROL_API_KEY": "YOUR_PERSONAL_TOKEN_HERE"
      }
    }
  }
}
```

---

### D. VS Code / Cline / Roo Code
Configure under your Extension MCP Settings:

```json
{
  "mcpServers": {
    "nexa-mission-control": {
      "command": "/ABSOLUTE/PATH/TO/mission-control/mcp-server/target/release/nexa-mission-control-mcp",
      "env": {
        "MISSION_CONTROL_URL": "https://tasks.nexasmart.net",
        "MISSION_CONTROL_API_KEY": "YOUR_PERSONAL_TOKEN_HERE"
      }
    }
  }
}
```

---

## 5. Tool Reference & Signatures

| Tool | Purpose | Key Parameters |
|---|---|---|
| `mc_list_workspaces` | Lists all workspaces accessible by the token | *none* |
| `mc_list_projects` | Lists projects within a workspace | `workspace_id` |
| `mc_get_board` | Returns columns, IDs, and positions for a board | `project_id` |
| `mc_list_tasks` | Searches and filters tasks | `project_id`, `column_id` *(optional)*, `query` *(optional)* |
| `mc_get_task` | Fetches full task details, checklists, and comments | `task_id` |
| `mc_create_task` | Creates a new task in a specified column | `project_id`, `column_id`, `title`, `description` *(optional)*, `priority` *(optional)* |
| `mc_update_task` | Updates task title, description, priority, or due date | `task_id`, `title` *(optional)*, `description` *(optional)*, `priority` *(optional)* |
| `mc_move_task` | Transitions task to another column | `task_id`, `target_column_id` |
| `mc_add_comment` | Appends a comment/report to a task | `task_id`, `comment` |
