# CLI Account State Map - RUNE Multi-Account Research

**Date**: 2026-08-30  
**Platform**: Windows 11  
**Researcher**: Kiro  
**Evidence Tier**: Mixed (1-7 scale, documented per finding)

---

## Research Mandate

For RUNE to support 4+ concurrent instances of the same CLI with different accounts:

**CRITICAL**: We must map EVERY persistent state location and verify isolation.

---

## CODEX CLI (0.149.1)

### Installation

- **Binary**: `C:\Users\Bitreon\AppData\Local\Programs\OpenAI\Codex\bin\codex.exe`
- **Version**: 0.149.1
- **Package**: OpenAI Codex CLI
- **Installed via**: Direct installer
- **Evidence Tier**: 3 (CLI --version output)

### Primary State Directory

**`~/.codex`** (Canonical: `C:\Users\Bitreon\.codex`)

Evidence:

- Tier 3: Observed at runtime
- Tier 4: Verified contains auth.json, config.toml, sessions

### AUTH Storage

#### File: `~/.codex/auth.json`

```json
{
  "auth_mode": "chatgpt",
  "OPENAI_API_KEY": null,
  "tokens": {
    "id_token": "<JWT>",
    "access_token": "<JWT>",
    "refresh_token": "<RT>",
    "account_id": "330b8085-a97b-4c91-92d8-c4d61e05598d"
  },
  "last_refresh": "2026-08-28T05:02:50.212511900Z"
}
```

**Evidence**:

- Tier 4: Directly read from filesystem
- Tier 3: Codex uses this for ChatGPT subscription auth
- **CRITICAL**: Contains refresh_token (reusable credential)

**Auth Mode**:

- `chatgpt`: Browser OAuth flow, tokens stored in file
- `OPENAI_API_KEY`: Direct API key (if set)

**HYPOTHESIS TO VERIFY**:
Does `CODEX_HOME` env variable control where auth.json is read/written?

#### Windows Credential Manager

**Status**: UNKNOWN - Need to verify if Codex uses CredentialManager

**Test Required**:

```powershell
cmdkey /list | Select-String "codex|openai"
```

### CONFIG Storage

#### File: `~/.codex/config.toml`

**Contains**:

- Model selection
- Service tier
- Desktop preferences
- MCP server definitions
- Plugin enable/disable
- Project trust levels
- **CODEX_HOME reference in MCP env vars**

**Evidence**: Tier 4 (Direct read)

**Key Finding**: Config references `CODEX_HOME='C:\Users\Bitreon\.codex'`

### SESSION Storage

**Locations**:

1. `~/.codex/sessions/` - Individual session directories
2. `~/.codex/thread_history_1.sqlite` - Thread history database
3. `~/.codex/history.jsonl` - Legacy history
4. `~/.codex/session_index.jsonl` - Session index

**Evidence**: Tier 3 (Directory listing)

### STATE Storage

**Files**:

- `.codex-global-state.json` - Global CLI state
- `state_5.sqlite` - Primary state database
- `goals_1.sqlite` - Goals/task tracking
- `logs_2.sqlite` - Log database
- `memories_1.sqlite` - Memory/context
- `queue_1.sqlite` - Message queue

**All located in**: `~/.codex/`

### CACHE Storage

**Directories**:

- `~/.codex/cache/` - General cache
- `~/.codex/models_cache.json` - Model catalog
- `~/.codex/ambient-suggestions/` - Suggestion cache
- `~/.codex/generated_images/` - Image cache

### EXTENSIONS/PLUGINS

**Locations**:

1. `~/.codex/plugins/` - Plugin installations
2. `~/.codex/skills/` - Custom skills
3. `~/.codex/agents/` - Agent definitions
4. `~/.codex/mcp-oauth-locks/` - MCP OAuth state

**MCP Credentials**: Need to verify where MCP OAuth tokens are stored

### RUNTIME State

**Processes**:

- Main CLI process
- MCP server subprocesses
- Node REPL server
- Computer Use server (if enabled)

**Sockets/Ports**:

- MCP servers use named pipes on Windows
- Example: `\\.\pipe\codex-computer-use-<uuid>`

**Lock Files**:

- Need to verify if any global locks exist

### ENVIRONMENT VARIABLES

**Known**:

- `CODEX_HOME` - **PRIMARY ISOLATION CANDIDATE**
- `OPENAI_API_KEY` - Direct API key mode
- `CODEX_CLI_PATH` - CLI binary path

**From config.toml**:

```toml
CODEX_HOME = 'C:\Users\Bitreon\.codex'
```

**CRITICAL RESEARCH QUESTION**:
If we set `CODEX_HOME=D:\rune-instances\codex-work`, will Codex:

1. Read auth from that location?
2. Write new auth there on login?
3. Keep sessions separate?
4. Avoid touching the original ~/.codex?

### Isolation Hypothesis

**Strategy A**: CODEX_HOME Isolation

```
Instance A: CODEX_HOME=D:\rune\instances\codex-personal
Instance B: CODEX_HOME=D:\rune\instances\codex-work
Instance C: CODEX_HOME=D:\rune\instances\codex-school
Instance D: CODEX_HOME=D:\rune\instances\codex-client
```

**Confidence**: MEDIUM (needs verification)

**Evidence Needed**:

1. Tier 1: Official docs on CODEX_HOME
2. Tier 4: Controlled experiment with separate CODEX_HOME
3. Verify auth.json is read from CODEX_HOME
4. Verify login writes to CODEX_HOME
5. Verify token refresh updates correct location
6. Verify logout affects only that instance

### UNVERIFIED CLAIMS (From Prior Research)

❌ **Do NOT trust these until verified**:

- "Codex supports --profile flag" (NOT found in --help)
- "cli_auth_credentials_store modes" (needs verification)
- "Keyring storage" (not confirmed on Windows)

---

## CLAUDE CLI (2.1.251)

### Installation

- **Binary**: `C:\Users\Bitreon\.local\bin\claude.exe`
- **Version**: 2.1.251 (Claude Code)
- **Package**: Anthropic Claude Code
- **Evidence Tier**: 3 (CLI --version output)

### Primary State Directories

**Multiple potential locations**:

1. `~/.claude/` - Likely primary
2. `~/.claude.json` - Legacy single file?
3. `%LOCALAPPDATA%\Claude\` - Windows app data
4. `%APPDATA%\Claude\` - Roaming app data

**Need to verify which is active**

### AUTH Storage

**UNKNOWN** - Requires investigation:

- File-based?
- Windows Credential Manager?
- Keychain on macOS?

**Test Required**:

```powershell
# Check for files
Get-ChildItem ~/.claude -Recurse -Filter "*auth*"
Get-ChildItem ~/.claude -Recurse -Filter "*token*"
Get-ChildItem ~/.claude -Recurse -Filter "*credential*"

# Check Windows Credential Manager
cmdkey /list | Select-String "claude|anthropic"
```

### ENVIRONMENT VARIABLES

**Known from --help**:

- `CLAUDE_CODE_SIMPLE` - Bare mode flag
- `ANTHROPIC_API_KEY` - Direct API key

**HYPOTHESIS**:

- `CLAUDE_CONFIG_DIR` - Config root override (needs verification)
- `CLAUDE_HOME` - Home directory override (needs verification)

**Evidence Tier**: 7 (Previous RUNE research notes - UNVERIFIED)

### Isolation Research Status

**Status**: NOT STARTED

**Required**:

1. Map actual state locations
2. Identify auth storage mechanism
3. Test environment variable isolation
4. Verify Windows Credential Manager usage
5. Check for daemon/background processes

---

## CURSOR CLI

### Installation

- **Binary**: `C:\Users\Bitreon\AppData\Local\Programs\cursor\resources\app\bin\cursor.cmd`
- **Evidence Tier**: 3 (Found via Get-Command)

### State Research Status

**Status**: NOT STARTED

**Critical Questions**:

1. Where is auth stored?
2. Browser login vs API key?
3. Config directory location?
4. Session storage?
5. Environment variable support?

---

## RESEARCH METHODOLOGY

### Evidence Hierarchy (Per Research Mandate)

```
Tier 1: Official current documentation
Tier 2: Official current source repository
Tier 3: Current CLI --help / diagnostics
Tier 4: Controlled runtime experiment
Tier 5: Official GitHub issue / maintainer comment
Tier 6: Third-party tools / discussions
Tier 7: Previous RUNE research notes
```

**Rule**: Do not treat Tier 6/7 as final proof when Tier 1-4 can answer.

### Next Research Steps

#### Immediate (Codex)

1. Search for official Codex docs on CODEX_HOME
2. Test CODEX_HOME isolation with disposable instance
3. Verify auth.json read/write behavior
4. Test concurrent instances
5. Verify token refresh isolation
6. Test logout isolation

#### Medium Priority (Claude)

1. Find official Claude Code documentation
2. Map actual state directories
3. Identify auth mechanism
4. Test environment variable isolation

#### Lower Priority (Cursor)

1. Determine if agent CLI is separate from IDE
2. Map state directories
3. Research auth mechanism

---

## CRITICAL WARNINGS

### DO NOT ASSUME

❌ Setting one config variable isolates auth  
❌ Config profiles = Auth profiles  
❌ Prior research is accurate without verification  
❌ macOS behavior = Windows behavior  
❌ Latest version = documented version

### VERIFY EVERYTHING

✅ Every claim needs evidence tier  
✅ Every path needs filesystem verification  
✅ Every env var needs runtime test  
✅ Every isolation claim needs 4-instance test

---

**Status**: PHASE 2 IN PROGRESS - Codex state mapping 50% complete

**Next Document**: CLI-MULTI-ACCOUNT-EVIDENCE.md (will contain experimental results)
