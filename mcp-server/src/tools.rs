use serde_json::{json, Value};

pub fn get_tools() -> Value {
    json!([
        {
            "name": "mc_list_workspaces",
            "description": "List all workspaces in NEXA Mission Control accessible with the current API token.",
            "inputSchema": {
                "type": "object",
                "properties": {}
            }
        },
        {
            "name": "mc_list_projects",
            "description": "List projects in Mission Control. You can optionally filter by workspace_id.",
            "inputSchema": {
                "type": "object",
                "properties": {
                    "workspace_id": {
                        "type": "string",
                        "description": "Optional workspace ID to filter projects."
                    }
                }
            }
        },
        {
            "name": "mc_get_board",
            "description": "Get the Kanban board structure and columns (e.g., 'To Do', 'In Progress', 'Done') for a project.",
            "inputSchema": {
                "type": "object",
                "properties": {
                    "project_id": {
                        "type": "string",
                        "description": "The project ID whose board and columns to retrieve."
                    }
                },
                "required": ["project_id"]
            }
        },
        {
            "name": "mc_list_tasks",
            "description": "List tasks (cards) in a project, optionally filtered by column (status) or search query.",
            "inputSchema": {
                "type": "object",
                "properties": {
                    "project_id": {
                        "type": "string",
                        "description": "The project ID containing the tasks."
                    },
                    "column_id": {
                        "type": "string",
                        "description": "Optional column ID to filter tasks (e.g. only To Do or only In Progress)."
                    },
                    "query": {
                        "type": "string",
                        "description": "Optional keyword to search task titles."
                    }
                },
                "required": ["project_id"]
            }
        },
        {
            "name": "mc_get_task",
            "description": "Get comprehensive details of a specific task by its ID, including description, priority, assignees, checklists, and comments.",
            "inputSchema": {
                "type": "object",
                "properties": {
                    "task_id": {
                        "type": "string",
                        "description": "The unique ID of the task/card."
                    }
                },
                "required": ["task_id"]
            }
        },
        {
            "name": "mc_create_task",
            "description": "Create a new task (card) in a project and column.",
            "inputSchema": {
                "type": "object",
                "properties": {
                    "project_id": {
                        "type": "string",
                        "description": "The project ID to create the task in."
                    },
                    "column_id": {
                        "type": "string",
                        "description": "The column ID (status) where the task should be placed."
                    },
                    "title": {
                        "type": "string",
                        "description": "The title of the task."
                    },
                    "description": {
                        "type": "string",
                        "description": "Optional detailed markdown description of the task."
                    },
                    "priority": {
                        "type": "string",
                        "enum": ["urgent", "high", "medium", "low", "no_priority"],
                        "description": "Priority of the task (default: 'no_priority')."
                    },
                    "due_date": {
                        "type": "string",
                        "description": "Optional ISO-8601 due date string (e.g. '2026-11-15')."
                    },
                    "story_points": {
                        "type": "number",
                        "description": "Optional story points or difficulty estimate."
                    }
                },
                "required": ["project_id", "column_id", "title"]
            }
        },
        {
            "name": "mc_update_task",
            "description": "Update task fields like title, description, or priority.",
            "inputSchema": {
                "type": "object",
                "properties": {
                    "task_id": {
                        "type": "string",
                        "description": "The ID of the task to update."
                    },
                    "title": {
                        "type": "string",
                        "description": "Updated title of the task."
                    },
                    "description": {
                        "type": "string",
                        "description": "Updated markdown description of the task."
                    },
                    "priority": {
                        "type": "string",
                        "enum": ["urgent", "high", "medium", "low", "no_priority"],
                        "description": "Updated priority."
                    },
                    "due_date": {
                        "type": "string",
                        "description": "Updated ISO-8601 due date."
                    }
                },
                "required": ["task_id"]
            }
        },
        {
            "name": "mc_move_task",
            "description": "Move a task to a different column (status) on the board (e.g. from 'To Do' to 'In Progress' or 'Done').",
            "inputSchema": {
                "type": "object",
                "properties": {
                    "task_id": {
                        "type": "string",
                        "description": "The ID of the task to move."
                    },
                    "target_column_id": {
                        "type": "string",
                        "description": "The ID of the destination column."
                    }
                },
                "required": ["task_id", "target_column_id"]
            }
        },
        {
            "name": "mc_add_comment",
            "description": "Post a comment or implementation note to a task (ideal for AI reporting progress or summary of completed work).",
            "inputSchema": {
                "type": "object",
                "properties": {
                    "task_id": {
                        "type": "string",
                        "description": "The ID of the task to comment on."
                    },
                    "comment": {
                        "type": "string",
                        "description": "The comment text or markdown to add."
                    }
                },
                "required": ["task_id", "comment"]
            }
        }
    ])
}
