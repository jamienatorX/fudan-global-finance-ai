# Issue tracker: GitHub

Issues and specs live in GitHub Issues for `jamienatorX/fudan-global-finance-ai`. Use the `gh` CLI from this repository, or pass `--repo jamienatorX/fudan-global-finance-ai` explicitly.

- Create: `gh issue create --title "..." --body-file <file>`.
- Read: `gh issue view <number> --json number,title,body,labels,comments`.
- List: `gh issue list --state open --json number,title,body,labels`.
- Comment: `gh issue comment <number> --body-file <file>`.
- Label: `gh issue edit <number> --add-label "..."` or `--remove-label "..."`.
- Close: `gh issue close <number> --comment "..."`.

When a skill says publish to the issue tracker, create a GitHub issue. When it says fetch the relevant ticket, read the GitHub issue. Use native sub-issues and dependencies when available; otherwise record parent and blocker links in the issue body.

**PRs as a request surface: no.**

GitHub shares issue and pull-request numbers. Resolve the resource type before operating on it. Keep literal multiline text in a file rather than constructing shell command strings.
