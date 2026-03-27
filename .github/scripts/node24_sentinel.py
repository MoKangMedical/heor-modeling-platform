#!/usr/bin/env python3
from __future__ import annotations

import json
import os
import re
import subprocess
import sys
import tempfile
import time
from datetime import datetime, timezone
from pathlib import Path

ISSUE_TITLE = "Pages Node24 Compatibility Sentinel"
ISSUE_MARKER = "<!-- pages-node24-compatibility-sentinel -->"
PREVIEW_WORKFLOW_PATH = ".github/workflows/pages-node24-preview.yml"
STABLE_WORKFLOW_PATH = ".github/workflows/pages.yml"


def run_cmd(*args: str, check: bool = True) -> str:
    result = subprocess.run(
        args,
        check=check,
        capture_output=True,
        text=True,
    )
    if check and result.returncode != 0:
        raise RuntimeError(result.stderr.strip() or result.stdout.strip())
    return result.stdout


def fetch_run_view(run_id: str) -> str:
    last_error: Exception | None = None
    for _ in range(5):
        try:
            output = run_cmd("gh", "run", "view", run_id)
            if output.strip():
                return output
        except Exception as exc:  # pragma: no cover - defensive retry
            last_error = exc
        time.sleep(3)
    if last_error:
        raise last_error
    raise RuntimeError(f"Unable to load workflow run {run_id}")


def extract_section(text: str, heading: str) -> str:
    pattern = rf"(?:^|\n){re.escape(heading)}\n(.*?)(?=\n[A-Z][A-Z ]+\n|\Z)"
    match = re.search(pattern, text, flags=re.DOTALL)
    return match.group(1).strip() if match else ""


def parse_annotations(run_view: str) -> tuple[list[str], str]:
    section = extract_section(run_view, "ANNOTATIONS")
    if not section:
        return [], ""

    warnings: list[str] = []
    raw_lines: list[str] = []
    for raw_line in section.splitlines():
        line = raw_line.strip()
        if not line:
            continue
        raw_lines.append(line)
        if line.startswith("! "):
            warnings.append(line[2:].strip())
    return warnings, "\n".join(raw_lines)


def build_summary(run_id: str, branch: str, conclusion: str, warnings: list[str], raw_annotations: str) -> str:
    run_url = f"{os.environ.get('GITHUB_SERVER_URL', 'https://github.com')}/{os.environ['GITHUB_REPOSITORY']}/actions/runs/{run_id}"
    updated_at = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")

    lines = [
        "## Pages Node24 Compatibility Sentinel",
        "",
        f"- Run: [{run_id}]({run_url})",
        f"- Branch: `{branch}`",
        f"- Preview result: `{conclusion}`",
        f"- Preview workflow: `{PREVIEW_WORKFLOW_PATH}`",
        f"- Stable production workflow: `{STABLE_WORKFLOW_PATH}`",
        f"- Updated: `{updated_at}`",
        "",
    ]

    if warnings:
        lines.append("### Detected warnings")
        lines.append("")
        for warning in warnings:
            lines.append(f"- {warning}")
        lines.append("")
    else:
        lines.extend(
            [
                "### Detected warnings",
                "",
                "- No compatibility warnings were detected in this preview run.",
                "",
            ]
        )

    if raw_annotations:
        lines.extend(
            [
                "### Raw annotation block",
                "",
                "```text",
                raw_annotations,
                "```",
                "",
            ]
        )

    lines.extend(
        [
            "### Current policy",
            "",
            "- Keep `main` on the stable Pages action chain.",
            "- Use `preview` to re-test Node 24 compatibility without touching production deployment.",
            "- Upgrade production only after GitHub ships a newer Pages action chain.",
        ]
    )

    return "\n".join(lines)


def find_issue_number() -> tuple[str | None, str | None]:
    output = run_cmd(
        "gh",
        "issue",
        "list",
        "--state",
        "all",
        "--limit",
        "100",
        "--json",
        "number,title,state,body",
    )
    issues = json.loads(output)
    for issue in issues:
        if ISSUE_MARKER in (issue.get("body") or "") or issue.get("title") == ISSUE_TITLE:
            return str(issue["number"]), issue.get("state")
    return None, None


def sync_issue(body: str) -> str:
    issue_number, state = find_issue_number()
    with tempfile.NamedTemporaryFile("w", delete=False, suffix=".md", encoding="utf-8") as handle:
        handle.write(body)
        temp_path = handle.name

    try:
        if issue_number:
            if state and state.upper() == "CLOSED":
                run_cmd("gh", "issue", "reopen", issue_number)
            run_cmd("gh", "issue", "edit", issue_number, "--title", ISSUE_TITLE, "--body-file", temp_path)
            return issue_number

        output = run_cmd("gh", "issue", "create", "--title", ISSUE_TITLE, "--body-file", temp_path)
        match = re.search(r"/issues/(\d+)", output)
        return match.group(1) if match else output.strip()
    finally:
        Path(temp_path).unlink(missing_ok=True)


def main() -> int:
    run_id = os.environ.get("GITHUB_RUN_ID")
    repo = os.environ.get("GITHUB_REPOSITORY")
    branch = os.environ.get("GITHUB_REF_NAME", "preview")
    conclusion = os.environ.get("PREVIEW_CONCLUSION", "unknown")

    if not run_id or not repo:
        raise RuntimeError("GITHUB_RUN_ID and GITHUB_REPOSITORY are required")

    run_view = fetch_run_view(run_id)
    warnings, raw_annotations = parse_annotations(run_view)

    summary = build_summary(run_id, branch, conclusion, warnings, raw_annotations)

    step_summary_path = os.environ.get("GITHUB_STEP_SUMMARY")
    if step_summary_path:
        Path(step_summary_path).write_text(summary + "\n", encoding="utf-8")
    else:
        print(summary)

    if os.environ.get("NODE24_SENTINEL_DRY_RUN") == "1":
        print("Dry run enabled; skipping issue sync.")
        return 0

    issue_body = "\n".join(
        [
            ISSUE_MARKER,
            "",
            summary,
        ]
    )
    issue_number = sync_issue(issue_body)
    print(f"Synced compatibility sentinel issue: #{issue_number}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
