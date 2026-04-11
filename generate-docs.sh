#!/bin/bash
# Regenerate SDK reference docs from JSDoc annotations.
# Run this after changing any public class/method JSDoc comments.
#
# Requires: npm install -g jsdoc-to-markdown
# Output: docs/server.md, docs/events.md
#
# These generated docs are consumed by the Docusaurus build script
# (content/IP-camera-API/docusaurus/build-docs.sh) which adds
# frontmatter and copies them into the API docs tree.

cd "$(dirname "$0")"
mkdir -p docs

echo "Generating Node.js SDK reference docs..."

jsdoc2md src/server.js > docs/server.md
echo "  docs/server.md"

jsdoc2md src/events.js > docs/events.md
echo "  docs/events.md"

echo "Done. Commit and push, then rebuild Docusaurus."
