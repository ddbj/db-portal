#!/usr/bin/env bash
set -euo pipefail

# Clone (if absent) or hard-reset to the remote tip (if present) the upstream Jekyll repositories
# that back the news mirror. Runs the two sources in parallel.
#
# Layout:
#   ./repos/ddbj-www       (ddbj/www, main)
#   ./repos/dbcls-website  (dbcls/website, master)
#
# Override via env if needed. Note: the repos-dir default below (./repos) differs from
# compose.yml / env.dev (./cache/repos); the repo URLs and branches match.

repos_dir="${DB_PORTAL_NEWS_REPOS_DIR:-./repos}"

ddbj_url="${DB_PORTAL_NEWS_DDBJ_REPO_URL:-https://github.com/ddbj/www.git}"
ddbj_branch="${DB_PORTAL_NEWS_MIRROR_DDBJ_BRANCH:-main}"
ddbj_dir="${repos_dir}/ddbj-www"

dbcls_url="${DB_PORTAL_NEWS_DBCLS_REPO_URL:-https://github.com/dbcls/website.git}"
dbcls_branch="${DB_PORTAL_NEWS_MIRROR_DBCLS_BRANCH:-master}"
dbcls_dir="${repos_dir}/dbcls-website"

mkdir -p "$repos_dir"

sync_one() {
  local name="$1"
  local url="$2"
  local branch="$3"
  local dir="$4"

  if [ -d "$dir/.git" ]; then
    echo "[$name] fetch + reset --hard origin/$branch ($dir)"
    git -C "$dir" fetch --depth 1 origin "$branch"
    git -C "$dir" reset --hard "origin/$branch"
  else
    if [ -e "$dir" ]; then
      echo "[$name] error: $dir exists but is not a git repository; aborting" >&2
      exit 1
    fi
    echo "[$name] clone --depth 1 --branch $branch $url -> $dir"
    git clone --depth 1 --branch "$branch" "$url" "$dir"
  fi
}

sync_one ddbj-www      "$ddbj_url"  "$ddbj_branch"  "$ddbj_dir" &
pid_ddbj=$!
sync_one dbcls-website "$dbcls_url" "$dbcls_branch" "$dbcls_dir" &
pid_dbcls=$!

# `set -e` + sequential `wait` だと先に終わった子が非ゼロ終了した瞬間に script
# が abort し、 もう片方の git child は孤児として走り続けて .git/index.lock を
# 残す可能性がある。 両方の終了を必ず待ち、 終了 code を集約してから exit する。
set +e
wait "$pid_ddbj"
rc_ddbj=$?
wait "$pid_dbcls"
rc_dbcls=$?
set -e
if [ "$rc_ddbj" -ne 0 ] || [ "$rc_dbcls" -ne 0 ]; then
  echo "news repos sync failed (ddbj=$rc_ddbj, dbcls=$rc_dbcls)" >&2
  exit 1
fi
echo "news repos synced"
