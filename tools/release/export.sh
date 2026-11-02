#!/bin/zsh
set -eu

root=${0:A:h:h:h}
dest=${1:?usage: export.sh <empty directory>}

mkdir -p $dest
git -C $root archive HEAD | tar -x -C $dest
rm -rf $dest/source $dest/ref $dest/.claude \
  $dest/docs/dstu-8302-2015.md $dest/docs/dstu-gost-7.1-7.80.md \
  $dest/docs/gost-7.12-93.md $dest/docs/dstu-3582-2013-abbreviations.md \
  $dest/docs/csl-primer.md $dest/docs/csl-specification.md \
  $dest/docs/csl-styles-repo-style-development.md $dest/docs/zotero-citation_styles.md
