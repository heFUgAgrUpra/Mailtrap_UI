# Security validation: no IDs or identifiable data in git

This doc records what is checked so no account IDs, inbox IDs, API tokens, or mailbox names are committed.

## Files that are never committed

| File / pattern      | Reason |
|---------------------|--------|
| `config.js`         | In `.gitignore`. Contains API token, account ID, inbox ID; may contain mailbox names if set in UI. |
| `.env`, `.env.local`| In `.gitignore`. Used for secrets if you switch to env-based config. |

## What is in the repo (tracked files)

| File              | Content |
|-------------------|---------|
| `config.example.js` | Placeholder only: `defaultAccountId: '123456'`, `defaultInboxId: '1234567'`, `defaultToken: ''`. No real IDs or token. |
| `index.html`      | Placeholder text e.g. "e.g. 123456" for the Account ID field. No real values. |
| `app.js`          | Uses `CONFIG.getToken()`, `CONFIG.getAccountId()`, `CONFIG.getInboxId()` only. No hardcoded IDs, tokens, or mailbox names. |
| `README.md` / docs| Describe placeholders and state that no real data is in the codebase. |

## How to re-check before pushing

From the project root:

```bash
# 1. config.js must be ignored (should print .gitignore:5:config.js)
git check-ignore -v config.js

# 2. config.js must not be in the list of tracked files
git ls-files | grep -E 'config\.js|\.env' && echo "FAIL: secrets would be committed" || echo "OK: no config.js or .env tracked"

# 3. No real IDs/token in any tracked file (should print "No matches")
git ls-files | xargs grep -l '849678\|1184908\|94ddd2f5' 2>/dev/null || echo "No matches in tracked files"
```

Replace `849678`, `1184908`, `94ddd2f5` with any real values you want to ensure are never committed.

## Checklist

- [ ] `config.js` is in `.gitignore`
- [ ] `config.example.js` uses only placeholders (`123456`, `1234567`, empty token)
- [ ] No real account ID, inbox ID, API token, or mailbox names in any tracked file
