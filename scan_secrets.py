import os
import re

PATTERNS = [
    (r"[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+", "Email Address"),
    (r"(?:admin[_-]?pass|password|secret|jwt_secret)\s*[:=]\s*['\"][^'\"]{3,}['\"]", "Password/Secret"),
    (r"AIza[0-9A-Za-z_-]{35}", "Google API Key"),
    (r"gsk_[0-9A-Za-z_-]{20,}", "Groq Key"),
    (r"sk-[0-9A-Za-z_-]{20,}", "OpenAI Key"),
    (r"ghp_[0-9A-Za-z]{36}", "GitHub PAT"),
    (r"github_pat_[0-9A-Za-z_]{20,}", "GitHub Token"),
    (r"ya29\.[0-9A-Za-z_-]+", "OAuth token"),
    (r"1//0[0-9A-Za-z_-]{40,}", "Refresh token"),
    (r"AQ\.[0-9A-Za-z_-]{40,}", "Gemini Token"),
]

EXCLUDE = {"node_modules", ".git", "dist", ".vite"}

for root, dirs, files in os.walk("."):
    dirs[:] = [d for d in dirs if d not in EXCLUDE]
    for file in files:
        if file in ("scan_secrets.py", "package-lock.json", "bun.lock"):
            continue
        if file.endswith((".png", ".jpg", ".ico", ".svg", ".map", ".woff", ".woff2")):
            continue
        filepath = os.path.join(root, file)
        try:
            with open(filepath, "r", encoding="utf-8", errors="ignore") as f:
                for line_idx, line in enumerate(f, 1):
                    for pat, label in PATTERNS:
                        for match in re.finditer(pat, line, re.IGNORECASE):
                            val = match.group(0)
                            # ignore schema.org, example.com, generic placeholders
                            if any(x in val.lower() for x in ["schema.org", "w3.org", "example.com", "your-", "xxx", "placeholder"]):
                                continue
                            print(f"{filepath}:{line_idx} [{label}] -> {val[:70]}")
        except Exception:
            pass
