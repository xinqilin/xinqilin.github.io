#!/usr/bin/env bash
# Validates required front-matter fields in all post markdown files.
# Exits 0 if all pass, 1 if any file fails.

set -euo pipefail

POSTS_DIR="content/post"
ERRORS=0

check_file() {
  local file="$1"
  local in_fm=0
  local title="" description="" categories="" tags="" date=""

  while IFS= read -r line; do
    if [[ "$line" == "---" ]]; then
      if (( in_fm == 0 )); then
        in_fm=1
        continue
      else
        break  # end of front-matter
      fi
    fi
    if (( in_fm == 1 )); then
      [[ "$line" =~ ^title: ]]       && title="$line"
      [[ "$line" =~ ^description:|^Description: ]] && description="$line"
      [[ "$line" =~ ^[Cc]ategories: ]] && categories="$line"
      [[ "$line" =~ ^tags:|^Tags: ]]  && tags="$line"
      [[ "$line" =~ ^date: ]]        && date="$line"
    fi
  done < "$file"

  local missing=()
  [[ -z "$title" ]]       && missing+=("title")
  [[ -z "$description" ]] && missing+=("description")
  [[ -z "$categories" ]]  && missing+=("categories")
  [[ -z "$tags" ]]        && missing+=("tags")
  [[ -z "$date" ]]        && missing+=("date")

  # Check for empty description/tags
  if [[ "$description" =~ Description:[[:space:]]*\"\"$ ]] || \
     [[ "$description" =~ description:[[:space:]]*\"\"$ ]] || \
     [[ "$description" =~ Description:[[:space:]]*$ ]] || \
     [[ "$description" =~ description:[[:space:]]*$ ]]; then
    missing+=("description(empty)")
  fi

  if [[ "$tags" =~ tags:[[:space:]]*\[\]$ ]] || \
     [[ "$tags" =~ Tags:[[:space:]]*\[\]$ ]]; then
    missing+=("tags(empty)")
  fi

  if (( ${#missing[@]} > 0 )); then
    echo "FAIL: $file — missing: ${missing[*]}"
    ERRORS=$(( ERRORS + 1 ))
  fi
}

# Find all post markdown files (exclude _index.md)
while IFS= read -r -d '' file; do
  check_file "$file"
done < <(find "$POSTS_DIR" -name "*.md" ! -name "_index.md" -print0 | sort -z)

echo ""
echo "==========================="
if (( ERRORS == 0 )); then
  echo "All front-matter checks passed."
  exit 0
else
  echo "$ERRORS file(s) failed front-matter validation."
  exit 1
fi
