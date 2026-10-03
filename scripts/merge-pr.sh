#!/usr/bin/env bash
# Wait for a PR's checks to settle, then merge only if every one of them passed.
#
# Why this exists: on 2026-10-03 two PRs (#150, #151) were merged with the `quality`
# job FAILING. The merge loop waited for `pending == 0` and counted the `pass` lines,
# but never looked for `fail`. A settled check set containing a failure looks exactly
# like a finished one if you only test for "nothing left running".
#
# That is the same shape as every silent-failure trap in docs/AGENT-CONTEXT.md: the
# gate appeared to work, the build went green locally, and the branch protection was
# bypassed with --admin. Nothing caught it except reading the table afterwards.
#
# Usage: scripts/merge-pr.sh <pr-number> [base]
set -euo pipefail

pr="${1:?usage: merge-pr.sh <pr-number> [base]}"
base="${2:-main}"

# Overridable so the test suite can exercise the timeout path in milliseconds
# instead of waiting out the real 20-minute budget.
max_polls="${MERGE_PR_MAX_POLLS:-60}"
poll_seconds="${MERGE_PR_POLL_SECONDS:-20}"

red=$'\033[31m'
grn=$'\033[32m'
dim=$'\033[2m'
off=$'\033[0m'

echo "Waiting for checks on #${pr} ..."

settled=0
for _ in $(seq 1 "$max_polls"); do
	# `gh pr checks` exits non-zero when checks fail, so do not let that kill the loop.
	out="$(gh pr checks "$pr" 2>&1 || true)"
	if ! printf '%s' "$out" | grep -qiE 'pending|in progress|queued'; then
		settled=1
		break
	fi
	sleep "$poll_seconds"
done

if [ "$settled" -ne 1 ]; then
	echo "${red}Checks never settled on #${pr}. Not merging.${off}"
	exit 1
fi

# Re-read after settling: the table can change between the poll and the merge.
out="$(gh pr checks "$pr" 2>&1 || true)"

# Require EVERY check to be `pass`. Treating only `fail` as disqualifying let
# `cancelled` and `skipped` through -- a skipped required check is an unverified
# PR wearing a green tick.
not_passed="$(printf '%s\n' "$out" | awk -F'\t' '$2!="pass" && NF>1 {print $1" ("$2")"}' || true)"
if [ -n "$not_passed" ]; then
	echo "${red}Refusing to merge #${pr}: these checks did not pass:${off}"
	printf '%s\n' "$not_passed" | sed 's/^/  - /'
	echo
	echo "Inspect with: gh pr checks ${pr}"
	exit 1
fi

# A PR with no checks at all is not "all green" -- it is an unverified PR.
total="$(printf '%s\n' "$out" | grep -cE $'\t' || true)"
if [ "$total" -eq 0 ]; then
	echo "${red}Refusing to merge #${pr}: no checks reported at all.${off}"
	exit 1
fi

echo "${grn}All ${total} checks passed on #${pr}.${off}"

# Required review cannot be granted here, so branch protection is bypassed
# deliberately. That is only acceptable because the check gate above is real.
gh pr merge "$pr" --merge --admin --delete-branch

sleep 3
git fetch origin --quiet
git checkout "$base" --quiet
git merge --ff-only "origin/${base}" --quiet
git branch -D "$(gh pr view "$pr" --json headRefName -q .headRefName)" 2>/dev/null || true

echo "${dim}main is now $(git log --oneline -1)${off}"
