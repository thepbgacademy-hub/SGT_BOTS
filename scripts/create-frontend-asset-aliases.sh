#!/bin/sh
set -eu

DIST_DIR="${1:?distribution directory is required}"
ASSET_DIR="$DIST_DIR/assets"
ENTRY_JS="$ASSET_DIR/app.js"
ENTRY_CSS="$ASSET_DIR/app.css"
LEGACY_JS_ALIASES="${LEGACY_FRONTEND_JS_ALIASES:-}"
LEGACY_CSS_ALIASES="${LEGACY_FRONTEND_CSS_ALIASES:-}"

if [ ! -f "$ENTRY_JS" ] || [ ! -f "$ENTRY_CSS" ]; then
  echo "Expected stable frontend entry assets in $ASSET_DIR" >&2
  exit 1
fi

create_legacy_aliases() {
  source_file="$1"
  shift

  for alias_name in "$@"; do
    cp "$source_file" "$ASSET_DIR/$alias_name"
  done
}

if [ -n "$LEGACY_JS_ALIASES" ]; then
  # shellcheck disable=SC2086
  create_legacy_aliases "$ENTRY_JS" $LEGACY_JS_ALIASES
fi

if [ -n "$LEGACY_CSS_ALIASES" ]; then
  # shellcheck disable=SC2086
  create_legacy_aliases "$ENTRY_CSS" $LEGACY_CSS_ALIASES
fi
