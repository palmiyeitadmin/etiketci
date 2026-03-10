---
name: repo-research
description: Analyze the repository incrementally and maintain a current project context summary.
---
# Skill: Repo Research
## Purpose
To analyze the existing PLMS repository without overwhelming context windows, identify the current architectural state, and maintain an up-to-date context summary.

## When to Use
- At the start of a session or when first joining a task.
- Before proposing major architectural changes.
- To detect drift from the documented MVP constraints.

## Expected Actions
1. Read `agent.md` and `docs/project-context.md`.
2. Inspect the latest commits or recently changed files.
3. Identify discrepancies between documentation and implementation.
4. Update `docs/project-context.md` if the state has evolved, ensuring alignment with MVP constraints (e.g., Epson-only, PDF print flow).

## Constraints
- Do not blindly assume the code matches design docs without verifying.
- When updating context docs, keep them concise and actionable.
