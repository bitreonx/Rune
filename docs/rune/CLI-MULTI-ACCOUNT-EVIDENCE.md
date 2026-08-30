# CLI Multi-Account Evidence - RUNE Research

**Research Date**: 2026-08-30  
**Platform**: Windows 11  
**Researcher**: Kiro

---

## Evidence Format

Every claim follows this structure:

```
CLAIM: <statement>
CLI: <name and version>
OS: <platform>
SOURCE: <evidence tier 1-7>
EXPERIMENT: <description>
RESULT: <outcome>
CONFIDENCE: <High/Medium/Low>
```

---

## CODEX CLI (v0.149.1)

### Finding 1: CODEX_HOME Controls Auth Location

**CLAIM**: Setting `CODEX_HOME` environment variable controls where Codex reads/writes auth.json

**CLI**: Codex CLI 0.149.1  
**OS**: Windows 11  
**SOURCE**:

- Tier 1: Official OpenAI documentation (https://developers.openai.com/codex/environment-variables)
- Tier 4: Controlled runtime experiment

**OFFICIAL DOCUMENTATION QUOTE**:

> "CODEX_HOME: Sets the root for Codex state, including config, auth, logs, sessions, skills, and standalone package metadata."

**EXPERIMENT 1: Auth Status with Default Location**

```powershell
# Using default ~/.codex
codex login status
```

**RESULT 1**:

```
Logged in using ChatGPT
```

**EXPERIMENT 2: Auth Status with Custom CODEX_HOME**

```powershell
$env:CODEX_HOME = "D:\rune-research-lab\codex-test-isolated"
codex login status
```

**RESULT 2**:

```
Not logged in
```

**CONCLUSION**: CODEX_HOME successfully isolates auth state. When set to a different directory, Codex:

- Does NOT read auth from ~/.codex
- Reports "Not logged in" for the custom location
- Does not contaminate the default location

**CONFIDENCE**: **HIGH** (Tier 1 + Tier 4 evidence)

---

### Finding 2: CODEX_HOME Isolation Scope

**CLAIM**: CODEX_HOME controls ALL persistent state, not just config

**CLI**: Codex CLI 0.149.1  
**OS**: Windows 11  
**SOURCE**: Tier 1 (Official docs)

**OFFICIAL DOCUMENTATION QUOTE**:

> "Sets the root for Codex state, including config, auth, logs, sessions, skills, and standalone package metadata."

**STATE DOMAINS ISOLATED BY CODEX_HOME**:

1. ✅ Config (`config.toml`)
2. ✅ Auth (`auth.json`)
3. ✅ Logs
4. ✅ Sessions
5. ✅ Skills
6. ✅ Package metadata

**CONFIDENCE**: **HIGH** (Official documentation explicit)

**VERIFICATION NEEDED**: Runtime test to confirm sessions and skills actually use CODEX_HOME

---

### Finding 3: Auth Storage Format

**CLAIM**: Codex stores ChatGPT subscription auth in plaintext JSON file

**CLI**: Codex CLI 0.149.1  
**OS**: Windows 11  
**SOURCE**: Tier 4 (Filesystem inspection)

**EXPERIMENT**: Read auth.json from active installation

```powershell
Get-Content ~/.codex/auth.json | ConvertFrom-Json
```

**OBSERVED STRUCTURE**:

```json
{
  "auth_mode": "chatgpt",
  "OPENAI_API_KEY": null,
  "tokens": {
    "id_token": "<JWT>",
    "access_token": "<JWT>",
    "refresh_token": "<refresh_token>",
    "account_id": "330b8085-a97b-4c91-92d8-c4d61e05598d"
  },
  "last_refresh": "2026-08-28T05:02:50.212511900Z"
}
```

**KEY OBSERVATIONS**:

1. **auth_mode**: "chatgpt" for subscription, likely "api" for API key mode
2. **Refresh token**: Present (allows long-term auth without re-login)
3. **Account ID**: UUID identifying the ChatGPT account
4. **Last refresh**: Timestamp of token refresh

**SECURITY IMPLICATIONS**:

- ⚠️ Tokens stored in plaintext file
- ⚠️ Refresh token enables account access without password
- ✅ File location controlled by CODEX_HOME (enables isolation)

**CONFIDENCE**: **HIGH** (Direct filesystem evidence)

---

### Finding 4: Windows Credential Manager Usage

**CLAIM**: Codex does NOT use Windows Credential Manager for ChatGPT subscription auth

**CLI**: Codex CLI 0.149.1  
**OS**: Windows 11  
**SOURCE**: Tier 4 (System inspection)

**EXPERIMENT**:

```powershell
cmdkey /list | Select-String "codex|openai|chatgpt"
```

**RESULT**: No credential entries found

**CONCLUSION**: On Windows, Codex stores ChatGPT subscription credentials in auth.json file, NOT in Credential Manager

**CONFIDENCE**: **HIGH** (Direct system inspection)

**NOTE**: API key mode may behave differently (needs verification)

---

### Finding 5: Multiple CODEX_HOME Instances Can Coexist

**CLAIM**: Multiple processes with different CODEX_HOME values can run concurrently without interfering

**CLI**: Codex CLI 0.149.1  
**OS**: Windows 11  
**SOURCE**: Tier 4 (Controlled experiment - partial)

**EXPERIMENT**:

```powershell
# Terminal 1 (default)
codex login status
# Result: "Logged in using ChatGPT"

# Terminal 2 (isolated)
$env:CODEX_HOME = "D:\rune-research-lab\codex-test-isolated"
codex login status
# Result: "Not logged in"
```

**RESULT**: Different terminals show different auth status based on CODEX_HOME

**CONFIDENCE**: **MEDIUM** (Partial test - full concurrent session test pending)

**VERIFICATION NEEDED**:

- [ ] Test 4 concurrent interactive sessions
- [ ] Test session isolation
- [ ] Test logout isolation
- [ ] Test token refresh isolation

---

## Experiments Pending

### Codex - High Priority

1. **4-Concurrent-Instance Test**
   - Create 4 separate CODEX_HOME directories
   - Simulate login in each (or copy auth for testing)
   - Launch 4 concurrent codex processes
   - Verify complete isolation

2. **Session Isolation Test**
   - Start session in Instance A
   - Start session in Instance B
   - Verify sessions are separate
   - Check `thread_history_1.sqlite` in each CODEX_HOME

3. **Logout Isolation Test**
   - Login Instance A and B
   - Logout Instance A
   - Verify Instance B remains logged in

4. **Token Refresh Test**
   - Force token refresh in Instance A
   - Verify Instance B auth.json unchanged

5. **Plugin/Skill Isolation Test**
   - Install plugin in Instance A
   - Verify Instance B doesn't see it

### Codex - Medium Priority

6. **MCP Server Isolation**
   - Determine if MCP servers run per-instance
   - Check named pipe isolation

7. **API Key Mode Test**
   - Test `--with-api-key` login
   - Verify file-based storage
   - Test concurrent API key instances

---

## Claude CLI - Research Not Started

**Status**: Pending

**Required**:

1. Map state locations
2. Identify auth mechanism (file vs keychain)
3. Test CLAUDE_CONFIG_DIR (if exists)
4. Verify isolation capability

---

## Cursor CLI - Research Not Started

**Status**: Pending

**Required**:

1. Determine if CLI is separate from IDE
2. Map state locations
3. Identify auth mechanism
4. Test isolation capability

---

## Evidence Hierarchy Reference

```
Tier 1: Official current documentation
Tier 2: Official current source repository
Tier 3: Current CLI --help / diagnostics
Tier 4: Controlled runtime experiment
Tier 5: Official GitHub issue / maintainer comment
Tier 6: Third-party tools / discussions
Tier 7: Previous RUNE research notes
```

---

**Next Steps**: Complete Codex 4-concurrent-instance test, then move to Claude CLI research.
