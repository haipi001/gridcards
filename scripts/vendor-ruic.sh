#!/usr/bin/env bash
set -euo pipefail

if [ -d vendor/ruic-card-skill ]; then
  echo "vendor/ruic-card-skill already exists"
  exit 0
fi

git subtree add \
  --prefix vendor/ruic-card-skill \
  https://github.com/HRuiCcc/RuiC-card-skill.git main --squash

echo "RuiC-card-skill vendored. Keep vendor/ruic-card-skill/LICENSE in the repository."
