# NEXA Mission Control — MCP Server (Rust)

High-performance, resource-efficient [Model Context Protocol (MCP)](https://modelcontextprotocol.io/) server for **NEXA Mission Control** (`https://tasks.nexasmart.net`).

Engineered in **Rust** to provide:
- **Ultra-low memory footprint**: ~4.6 MB RSS (vs ~70 MB with Node.js, >90% reduction).
- **Zero runtime overhead**: Single standalone native binary with zero external runtime dependencies.
- **Instant startup**: Sub-millisecond cold start over standard I/O (stdio).
- **Robust concurrency**: Built on Tokio asynchronous I/O and TLS via rustls.

---

## 🛠 Features & Supported Tools

The MCP server connects to Mission Control via API token (`Bearer mc_...`) and exposes 9 tools:

| Tool | Description | Key Parameters |
|---|---|---|
| `mc_list_workspaces` | List accessible workspaces | none |
| `mc_list_projects` | List projects in a workspace | `workspace_id` (optional) |
| `mc_get_board` | Get board structure & column IDs (To Do, In Progress, Done, etc.) | `project_id` |
| `mc_list_tasks` | List tasks/cards (optional filter by column or text search) | `project_id`, `column_id` (optional), `query` (optional) |
| `mc_get_task` | Get full task details, description, checklists, and comments | `task_id` |
| `mc_create_task` | Create a new task/card in a column | `project_id`, `column_id`, `title`, `description`, `priority` |
| `mc_update_task` | Update title, description, priority, or due date | `task_id`, `title`, `description`, `priority`, `due_date` |
| `mc_move_task` | Move task to another column (e.g. To Do ➔ In Progress ➔ Done) | `task_id`, `target_column_id` |
| `mc_add_comment` | Post a progress note or report to a task | `task_id`, `comment` |

---

## 🚀 Building from Source

```bash
cd mission-control/mcp-server
cargo build --release
```

The optimized binary is located at:
```bash
mission-control/mcp-server/target/release/nexa-mission-control-mcp
```

Binary size: **~2.8 MB** (stripped).

---

## ⚙️ Configuration Guides

### 1. Claude Desktop (`claude_desktop_config.json`)

On Linux: `~/.config/Claude/claude_desktop_config.json`  
On macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`  
On Windows: `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "nexa-mission-control": {
      "command": "/home/alirezaabd/Desktop/Projects/crm-projects/mission-control/mcp-server/target/release/nexa-mission-control-mcp",
      "env": {
        "MISSION_CONTROL_URL": "https://tasks.nexasmart.net",
        "MISSION_CONTROL_API_KEY": "mc_3c0ab8595991582a17e6f4d4b7dac8d440ffb716ebd07c3051644ab81a6eb76b"
      }
    }
  }
}
```

---

### 2. Claude Code CLI

Add via the CLI:
```bash
claude mcp add nexa-mission-control /home/alirezaabd/Desktop/Projects/crm-projects/mission-control/mcp-server/target/release/nexa-mission-control-mcp \
  -e MISSION_CONTROL_URL="https://tasks.nexasmart.net" \
  -e MISSION_CONTROL_API_KEY="mc_3c0ab8595991582a17e6f4d4b7dac8d440ffb716ebd07c3051644ab81a6eb76b"
```

---

### 3. Cursor (`~/.cursor/mcp.json` or Settings ➔ Features ➔ MCP)

Add new MCP server:
- **Type**: `command` (stdio)
- **Command**: `/home/alirezaabd/Desktop/Projects/crm-projects/mission-control/mcp-server/target/release/nexa-mission-control-mcp`
- **Environment variables**:
  - `MISSION_CONTROL_URL`: `https://tasks.nexasmart.net`
  - `MISSION_CONTROL_API_KEY`: `mc_3c0ab8595991582a17e6f4d4b7dac8d440ffb716ebd07c3051644ab81a6eb76b`

Or in `mcp.json`:
```json
{
  "mcpServers": {
    "nexa-mission-control": {
      "command": "/home/alirezaabd/Desktop/Projects/crm-projects/mission-control/mcp-server/target/release/nexa-mission-control-mcp",
      "env": {
        "MISSION_CONTROL_URL": "https://tasks.nexasmart.net",
        "MISSION_CONTROL_API_KEY": "mc_3c0ab8595991582a17e6f4d4b7dac8d440ffb716ebd07c3051644ab81a6eb76b"
      }
    }
  }
}
```

---

### 4. Antigravity / Gemini CLI (`~/.gemini/antigravity/mcp/` or project settings)

In your MCP configuration:
```json
{
  "mcpServers": {
    "nexa-mission-control": {
      "command": "/home/alirezaabd/Desktop/Projects/crm-projects/mission-control/mcp-server/target/release/nexa-mission-control-mcp",
      "args": [],
      "env": {
        "MISSION_CONTROL_URL": "https://tasks.nexasmart.net",
        "MISSION_CONTROL_API_KEY": "mc_3c0ab8595991582a17e6f4d4b7dac8d440ffb716ebd07c3051644ab81a6eb76b"
      }
    }
  }
}
```

---

### 5. Windsurf / Codex

Add under MCP servers configuration:
```json
{
  "mcpServers": {
    "nexa-mission-control": {
      "command": "/home/alirezaabd/Desktop/Projects/crm-projects/mission-control/mcp-server/target/release/nexa-mission-control-mcp",
      "env": {
        "MISSION_CONTROL_URL": "https://tasks.nexasmart.net",
        "MISSION_CONTROL_API_KEY": "mc_3c0ab8595991582a17e6f4d4b7dac8d440ffb716ebd07c3051644ab81a6eb76b"
      }
    }
  }
}
```

---

## 💡 Example Prompt Workflow for AI Assistants

Once configured in any of the above assistants:

1. **"List all my tasks in NEXA project that are in To Do"**  
    Assistant calls `mc_list_projects` ➔ `mc_get_board` ➔ `mc_list_tasks(column_id: <todo_column_id>)`.
2. **"I am starting task 'Refactor Auth middleware'. Move it to In Progress"**  
    Assistant calls `mc_move_task(task_id: "...", target_column_id: <in_progress_id>)`.
3. **"I have finished implementing the task. Add comment with tests summary and move it to Done"**  
    Assistant calls `mc_add_comment` with completion notes, then `mc_move_task` to Done.
