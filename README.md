# Loom MCP

Figma to React code converter via compact DSL. Available as an MCP server and CLI.

Converts Figma design JSON into React components using a hybrid approach (programmatic + LLM). A custom DSL intermediate representation achieves **96.6% token reduction** compared to raw Figma JSON.

## MCP Server

### Setup (Claude Code)

```bash
claude mcp add loom --scope user -- npx @keisuke-na/loom-mcp
```

Or manually add to your MCP config (`.mcp.json` for per-project, `~/.claude/settings.json` for global):

```json
{
  "mcpServers": {
    "loom": {
      "command": "npx",
      "args": ["@keisuke-na/loom-mcp"]
    }
  }
}
```

Requires `FIGMA_PERSONAL_ACCESS_TOKEN` environment variable.

### Tools

| Tool | Description |
|------|-------------|
| `generate-dsl` | Convert a Figma component URL to compact DSL |
| `generate-react` | Convert annotated semantic DSL to React components |
| `list-components` | List cached component names |
| `get-component` | Retrieve a specific component's code |

### Workflow

1. `generate-dsl` with a Figma URL — returns DSL body
2. LLM annotates the DSL with `.as()`, `.tag()`, `.repeat()`
3. `generate-react` with annotated DSL — generates and caches React components
4. `get-component` to retrieve individual components as needed

## CLI

```bash
# React code generation
npx @keisuke-na/loom-mcp <input.json> [--file-key=FILE_KEY]

# DSL generation
npx @keisuke-na/loom-mcp <input.json> --format=dsl

# DSL body only (for LLM input)
npx @keisuke-na/loom-mcp <input.json> --format=dsl --body-only

# Semantic DSL to React
npx @keisuke-na/loom-mcp <semantic.dsl> --format=semantic-react --vars=<vars.dsl>
```

## How It Works

```
Figma REST API (JSON)
    |
[Stage 1]   JSON -> pixel-perfect React code
[Stage 1.5] JSON -> compact DSL (96.6% token reduction)
[Stage 2]   LLM annotates DSL with .as, .tag, .repeat
[Stage 2.5] Semantic DSL + variables -> componentized React code
```

## License

MIT
