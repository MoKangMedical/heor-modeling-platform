#!/usr/bin/env python3
from __future__ import annotations

import hashlib
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
STATUS_MARKER = "pages-node24-status"
WARNING_JSON_MARKER = "pages-node24-warning-json"
WARNING_HASH_MARKER = "pages-node24-warning-hash"
RUN_COMMENT_MARKER = "pages-node24-run"
PREVIEW_WORKFLOW_PATH = ".github/workflows/pages-node24-preview.yml"
STABLE_WORKFLOW_PATH = ".github/workflows/pages.yml"
STATUS_ACTIVE = "active"
STATUS_CLEAR = "clear"


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
    pattern = rf"(?:^|\n){re.escape(heading)}\n(.*?)(?=\n(?:##|###) |\n[A-Z][A-Z ]+\n|\Z)"
    match = re.search(pattern, text, flags=re.DOTALL)
    return match.group(1).strip() if match else ""


def normalize_warnings(warnings: list[str]) -> list[str]:
    deduped = {warning.strip() for warning in warnings if warning.strip()}
    return sorted(deduped)


def warning_payload(warnings: list[str]) -> str:
    return json.dumps(normalize_warnings(warnings), ensure_ascii=False, separators=(",", ":"))


def warning_hash(warnings: list[str]) -> str:
    return hashlib.sha256(warning_payload(warnings).encode("utf-8")).hexdigest()[:12]


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
    return normalize_warnings(warnings), "\n".join(raw_lines)


def build_snapshot(run_id: str, branch: str, conclusion: str, warnings: list[str], raw_annotations: str) -> str:
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
        f"- Warning fingerprint: `{warning_hash(warnings)}`",
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


def build_step_summary(snapshot: str, outcome: dict[str, object]) -> str:
    lines = [snapshot, "", "### Sentinel issue sync", ""]

    issue_number = outcome.get("issue_number")
    issue_url = outcome.get("issue_url")
    final_state = outcome.get("final_state") or "not-created"
    if issue_number and issue_url:
        lines.append(f"- Issue: [#{issue_number}]({issue_url})")
    else:
        lines.append("- Issue: not created")
    lines.append(f"- Final issue state: `{final_state}`")

    actions = outcome.get("actions") or []
    if actions:
        lines.append("- Actions:")
        for action in actions:
            lines.append(f"  - {action}")
    else:
        lines.append("- Actions: no issue update required")

    return "\n".join(lines)


def parse_warning_list_from_body(body: str) -> list[str]:
    section = extract_section(body, "### Detected warnings")
    if not section:
        return []

    warnings: list[str] = []
    for raw_line in section.splitlines():
        line = raw_line.strip()
        if not line.startswith("- "):
            continue
        value = line[2:].strip()
        if value.startswith("No compatibility warnings were detected"):
            continue
        warnings.append(value)
    return normalize_warnings(warnings)


def extract_marker_value(body: str, marker: str) -> str | None:
    match = re.search(rf"<!-- {re.escape(marker)}:(.*?) -->", body)
    return match.group(1).strip() if match else None


def parse_issue_metadata(body: str) -> dict[str, object]:
    warning_json = extract_marker_value(body, WARNING_JSON_MARKER)
    if warning_json:
        try:
            warnings = normalize_warnings(json.loads(warning_json))
        except json.JSONDecodeError:
            warnings = parse_warning_list_from_body(body)
    else:
        warnings = parse_warning_list_from_body(body)

    status = extract_marker_value(body, STATUS_MARKER)
    if status not in {STATUS_ACTIVE, STATUS_CLEAR}:
        status = STATUS_ACTIVE if warnings else STATUS_CLEAR

    return {
        "status": status,
        "warnings": warnings,
        "warning_hash": extract_marker_value(body, WARNING_HASH_MARKER) or warning_hash(warnings),
    }


def find_issue() -> dict[str, str] | None:
    output = run_cmd(
        "gh",
        "issue",
        "list",
        "--state",
        "all",
        "--limit",
        "100",
        "--json",
        "number,title,state,body,url",
    )
    issues = json.loads(output)
    for issue in issues:
        if ISSUE_MARKER in (issue.get("body") or "") or issue.get("title") == ISSUE_TITLE:
            return {
                "number": str(issue["number"]),
                "state": issue.get("state", "OPEN"),
                "body": issue.get("body") or "",
                "url": issue.get("url") or "",
            }
    return None


def issue_body(snapshot: str, status: str, warnings: list[str]) -> str:
    return "\n".join(
        [
            ISSUE_MARKER,
            f"<!-- {STATUS_MARKER}:{status} -->",
            f"<!-- {WARNING_HASH_MARKER}:{warning_hash(warnings)} -->",
            f"<!-- {WARNING_JSON_MARKER}:{warning_payload(warnings)} -->",
            "",
            snapshot,
        ]
    )


def diff_warnings(previous: list[str], current: list[str]) -> tuple[list[str], list[str]]:
    previous_set = set(previous)
    current_set = set(current)
    added = [warning for warning in current if warning not in previous_set]
    removed = [warning for warning in previous if warning not in current_set]
    return added, removed


def build_history_comment(
    run_id: str,
    branch: str,
    previous_status: str,
    current_status: str,
    added: list[str],
    removed: list[str],
) -> str:
    run_url = f"{os.environ.get('GITHUB_SERVER_URL', 'https://github.com')}/{os.environ['GITHUB_REPOSITORY']}/actions/runs/{run_id}"
    comment_lines = [
        f"<!-- {RUN_COMMENT_MARKER}:{run_id} -->",
        "",
        "## Node24 compatibility change",
        "",
        f"- Run: [{run_id}]({run_url})",
        f"- Branch: `{branch}`",
        f"- Previous sentinel status: `{previous_status}`",
        f"- Current sentinel status: `{current_status}`",
        "",
    ]

    if added:
        comment_lines.append("### Added warnings")
        comment_lines.append("")
        for warning in added:
            comment_lines.append(f"- {warning}")
        comment_lines.append("")

    if removed:
        comment_lines.append("### Removed warnings")
        comment_lines.append("")
        for warning in removed:
            comment_lines.append(f"- {warning}")
        comment_lines.append("")

    if not added and not removed:
        comment_lines.extend(
            [
                "### Warning diff",
                "",
                "- Warning set stayed the same, but sentinel status changed.",
                "",
            ]
        )

    return "\n".join(comment_lines).strip()


def upsert_issue_body(issue_number: str, body: str) -> None:
    with tempfile.NamedTemporaryFile("w", delete=False, suffix=".md", encoding="utf-8") as handle:
        handle.write(body)
        temp_path = handle.name

    try:
        run_cmd("gh", "issue", "edit", issue_number, "--title", ISSUE_TITLE, "--body-file", temp_path)
    finally:
        Path(temp_path).unlink(missing_ok=True)


def create_issue(body: str) -> tuple[str, str]:
    with tempfile.NamedTemporaryFile("w", delete=False, suffix=".md", encoding="utf-8") as handle:
        handle.write(body)
        temp_path = handle.name

    try:
        output = run_cmd("gh", "issue", "create", "--title", ISSUE_TITLE, "--body-file", temp_path)
    finally:
        Path(temp_path).unlink(missing_ok=True)

    issue_url = output.strip().splitlines()[-1].strip()
    match = re.search(r"/issues/(\d+)", issue_url)
    return (match.group(1) if match else issue_url, issue_url)


def reopen_issue(issue_number: str) -> None:
    run_cmd("gh", "issue", "reopen", issue_number)


def close_issue(issue_number: str) -> None:
    run_cmd("gh", "issue", "close", issue_number)


def list_issue_comments(issue_number: str) -> list[dict[str, object]]:
    output = run_cmd("gh", "api", f"repos/{os.environ['GITHUB_REPOSITORY']}/issues/{issue_number}/comments?per_page=100")
    return json.loads(output)


def post_comment(issue_number: str, body: str) -> None:
    with tempfile.NamedTemporaryFile("w", delete=False, suffix=".md", encoding="utf-8") as handle:
        handle.write(body)
        temp_path = handle.name

    try:
        run_cmd("gh", "issue", "comment", issue_number, "--body-file", temp_path)
    finally:
        Path(temp_path).unlink(missing_ok=True)


def comment_exists_for_run(issue_number: str, run_id: str) -> bool:
    marker = f"<!-- {RUN_COMMENT_MARKER}:{run_id} -->"
    for comment in list_issue_comments(issue_number):
        if marker in (comment.get("body") or ""):
            return True
    return False


def sync_issue(
    run_id: str,
    branch: str,
    current_status: str,
    warnings: list[str],
    snapshot: str,
) -> dict[str, object]:
    existing = find_issue()
    outcome: dict[str, object] = {
        "issue_number": None,
        "issue_url": None,
        "final_state": "not-created",
        "actions": [],
    }

    if not existing:
        if current_status == STATUS_CLEAR:
            outcome["actions"] = ["Warnings are clear. No sentinel issue created."]
            return outcome

        number, url = create_issue(issue_body(snapshot, current_status, warnings))
        outcome["issue_number"] = number
        outcome["issue_url"] = url
        outcome["final_state"] = "OPEN"
        outcome["actions"] = [f"Created issue #{number} for active Node24 compatibility warnings."]
        return outcome

    issue_number = existing["number"]
    issue_url = existing["url"]
    issue_state = existing["state"].upper()
    previous = parse_issue_metadata(existing["body"])
    previous_status = str(previous["status"])
    previous_warnings = list(previous["warnings"])
    added, removed = diff_warnings(previous_warnings, warnings)
    warning_changed = bool(added or removed)
    status_changed = previous_status != current_status
    body_changed = warning_changed or status_changed
    actions: list[str] = []

    if current_status == STATUS_ACTIVE and issue_state == "CLOSED":
        reopen_issue(issue_number)
        issue_state = "OPEN"
        actions.append(f"Reopened issue #{issue_number} because warnings are active again.")

    if body_changed:
        upsert_issue_body(issue_number, issue_body(snapshot, current_status, warnings))
        if current_status == STATUS_CLEAR:
            actions.append(f"Updated issue #{issue_number} snapshot to reflect a clear warning state.")
        else:
            actions.append(f"Updated issue #{issue_number} snapshot to reflect the latest warning set.")

    if (warning_changed or status_changed) and not comment_exists_for_run(issue_number, run_id):
        post_comment(
            issue_number,
            build_history_comment(run_id, branch, previous_status, current_status, added, removed),
        )
        actions.append(f"Posted a warning diff comment to issue #{issue_number}.")

    if current_status == STATUS_CLEAR:
        if issue_state != "CLOSED":
            close_issue(issue_number)
            issue_state = "CLOSED"
            actions.append(f"Closed issue #{issue_number} because the warning set is empty.")
        elif not actions:
            actions.append(f"Warnings remain clear. Issue #{issue_number} stays closed.")
    elif not actions:
        actions.append(f"Warnings are unchanged. Issue #{issue_number} remains open.")

    outcome["issue_number"] = issue_number
    outcome["issue_url"] = issue_url
    outcome["final_state"] = issue_state
    outcome["actions"] = actions
    return outcome


def main() -> int:
    run_id = os.environ.get("GITHUB_RUN_ID")
    repo = os.environ.get("GITHUB_REPOSITORY")
    branch = os.environ.get("GITHUB_REF_NAME", "preview")
    conclusion = os.environ.get("PREVIEW_CONCLUSION", "unknown")

    if not run_id or not repo:
        raise RuntimeError("GITHUB_RUN_ID and GITHUB_REPOSITORY are required")

    run_view = fetch_run_view(run_id)
    warnings, raw_annotations = parse_annotations(run_view)
    current_status = STATUS_ACTIVE if warnings else STATUS_CLEAR
    snapshot = build_snapshot(run_id, branch, conclusion, warnings, raw_annotations)

    if os.environ.get("NODE24_SENTINEL_DRY_RUN") == "1":
        outcome: dict[str, object] = {
            "issue_number": None,
            "issue_url": None,
            "final_state": "dry-run",
            "actions": ["Dry run enabled; skipping issue sync."],
        }
    else:
        outcome = sync_issue(run_id, branch, current_status, warnings, snapshot)

    summary = build_step_summary(snapshot, outcome)
    step_summary_path = os.environ.get("GITHUB_STEP_SUMMARY")
    if step_summary_path:
        Path(step_summary_path).write_text(summary + "\n", encoding="utf-8")
    else:
        print(summary)

    issue_number = outcome.get("issue_number")
    if issue_number:
        print(f"Synced compatibility sentinel issue: #{issue_number}")
    else:
        print("No sentinel issue sync was required.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
