# Guru MCP Server - Test Challenges for Claude Desktop

These challenges will help you test all 24 MCP tools available in Guru. Work through them sequentially with Claude Desktop after connecting the Guru MCP server.

## Prerequisites

1. Build the project: `npm run build`
2. Connect Guru to Claude Desktop (see MCP_INTEGRATION.md)
3. Restart Claude Desktop
4. Verify connection by asking: "What MCP servers are connected?"

---

## Challenge 1: Basic Read Operations

**Goal:** Verify Claude can read existing data from Guru.

**Tasks:**
1. "List all my knowledge bases"
2. "What projects do I have?"
3. "Show me memory system statistics"
4. "What's the current active project?"

**Expected:** Claude should use `list_knowledge_bases`, `list_projects`, `get_memory_stats`, and `get_current_project` tools.

---

## Challenge 2: Create a Knowledge Base

**Goal:** Test knowledge base creation.

**Tasks:**
1. "Create a new knowledge base called 'Test API Documentation' with description 'Testing API endpoints and authentication'"
2. "List my knowledge bases to verify it was created"
3. "Show me the details of the Test API Documentation knowledge base"

**Expected:** Claude should:
- Use `create_knowledge_base` with name and description
- Return a success message with the new KB ID
- Use `list_knowledge_bases` to show it exists
- Use `get_knowledge_base` to show details

---

## Challenge 3: Add Documents to Knowledge Base

**Goal:** Test document upload functionality.

**Tasks:**
1. "Add the file at `/Users/boss/Documents/guru-electron/README.md` to my Test API Documentation knowledge base"
2. "List all documents in the Test API Documentation knowledge base"
3. "Show me the content of the document we just added"

**Expected:** Claude should:
- Use `add_document` with knowledge_base_id and file_path
- Use `list_documents` to show the added document
- Use `get_document` to display its content

**Note:** You can use any text file on your system - just provide the full path.

---

## Challenge 4: Search and Memory

**Goal:** Test search functionality and memory system.

**Tasks:**
1. "Search my documents for the word 'electron'"
2. "Remember that we're testing the Guru MCP integration today"
3. "Search your memories for 'MCP'"
4. "What memories do you have about testing?"

**Expected:** Claude should:
- Use `search_documents` with query="electron"
- Use `add_memory` to store the insight
- Use `search_memories` with query="MCP"
- Use `search_memories` with query="testing"

---

## Challenge 5: Update Operations

**Goal:** Test metadata update capabilities.

**Tasks:**
1. "Update the Test API Documentation knowledge base description to 'Comprehensive API testing documentation and examples'"
2. "Show me the updated knowledge base details"
3. "Update the README document we added - change its category to 'documentation' and add tags: ['readme', 'project-info']"
4. "Show me the updated document"

**Expected:** Claude should:
- Use `update_knowledge_base` with new description
- Use `get_knowledge_base` to verify changes
- Use `update_document` with category and tags
- Use `get_document` to verify changes

---

## Challenge 6: Document Organization

**Goal:** Test document grouping features.

**Tasks:**
1. "Create two document groups in the Test API Documentation knowledge base: 'Getting Started' and 'Advanced Topics'"
2. "List all document groups in that knowledge base"
3. "Move the README document to the 'Getting Started' group"
4. "Show me the groups again to verify the document was moved"

**Expected:** Claude should:
- Use `create_document_group` twice with different names
- Use `list_document_groups` to show both groups
- Use `move_document_to_group` with document_id and group_id
- Use `list_document_groups` to show the document in the group

---

## Challenge 7: Project Management

**Goal:** Test project creation and switching.

**Tasks:**
1. "Create a new project called 'MCP Testing Project' with description 'Testing all MCP functionality'"
2. "List all projects"
3. "Switch to the MCP Testing Project"
4. "What's the current active project now?"

**Expected:** Claude should:
- Use `create_project` with name and description
- Use `list_projects` to show all projects
- Use `switch_project` with the project_id
- Use `get_current_project` to confirm the switch

---

## Challenge 8: File System Operations

**Goal:** Test file system read capabilities.

**Tasks:**
1. "Read the package.json file in /Users/boss/Documents/guru-electron/"
2. "List all files in /Users/boss/Documents/guru-electron/src/main/"
3. "Get file info for /Users/boss/Documents/guru-electron/README.md"

**Expected:** Claude should:
- Use `read_file` to show package.json content
- Use `list_directory` to show files in src/main/
- Use `get_file_info` to show file metadata (size, extension, etc.)

---

## Challenge 9: Complex Workflow

**Goal:** Test multiple operations in sequence.

**Tasks:**
"I want to organize my documentation. Please:
1. Create a new knowledge base called 'Developer Guides'
2. Add the MCP_INTEGRATION.md file to it
3. Create a document group called 'Integration Guides'
4. Move that document into the Integration Guides group
5. Add a memory that we organized documentation for developer guides
6. Show me a summary of what you did"

**Expected:** Claude should use multiple tools in sequence and provide a comprehensive summary.

---

## Challenge 10: Cleanup and Delete

**Goal:** Test deletion operations.

**Tasks:**
1. "Delete the document we added to the Test API Documentation knowledge base"
2. "Verify the document was deleted by listing documents in that knowledge base"
3. "Delete the entire Test API Documentation knowledge base"
4. "List all knowledge bases to confirm it's gone"

**Expected:** Claude should:
- Use `delete_document` with document_id
- Use `list_documents` to show it's gone
- Use `delete_knowledge_base` with kb_id
- Use `list_knowledge_bases` to confirm deletion
- Mention that all documents in the KB were also deleted

---

## Advanced Challenge: Natural Language Workflow

**Goal:** Test Claude's ability to interpret complex requests without explicit instructions.

**Task:**
"I'm starting a new project to document our authentication system. Can you help me set it up? I need a proper structure with knowledge bases, groups, and I want you to remember the key decisions we make."

**Expected:** Claude should:
- Ask clarifying questions about the project structure
- Create appropriate knowledge bases and groups
- Use memory system to track decisions
- Provide recommendations based on best practices
- Handle the entire workflow naturally without step-by-step guidance

---

## Troubleshooting

If any challenges fail:

1. **Check Claude Desktop logs:**
   - macOS: `~/Library/Logs/Claude/`
   - Look for MCP-related errors

2. **Verify MCP server works standalone:**
   ```bash
   npm run mcp
   ```

3. **Check file paths:**
   - All file paths must be absolute
   - Verify files exist before adding them

4. **Rebuild if needed:**
   ```bash
   npm run build
   ```

5. **Check data directory:**
   - macOS: `~/Library/Application Support/guru-electron/`
   - Ensure proper permissions

---

## Success Criteria

All 24 tools working correctly:
- ✓ 5 Knowledge Base tools (2 read + 3 write)
- ✓ 6 Document tools (3 read + 3 write)
- ✓ 3 File System tools (read-only)
- ✓ 3 Memory tools (2 read + 1 write)
- ✓ 4 Project Management tools
- ✓ 3 Document Organization tools

---

## Notes

- Some tools may ask for confirmation before destructive operations (delete)
- File paths must be absolute, not relative
- The MCP server shares the same data directory as the Electron app
- All operations persist to disk immediately
- Knowledge base deletion cascades to all its documents

---

## Next Steps After Testing

Once all challenges pass:
1. Use Guru naturally with Claude Desktop
2. Build your own knowledge bases
3. Let Claude help organize and search your documents
4. Leverage the memory system for project context
5. Create custom workflows combining multiple tools
