#!/bin/zsh
set -eu

root=${0:A:h:h:h}
app=${ZOTERO_APP:-/Applications/Zotero.app}
mode=${DSTU_MODE:-hooked}
timeout=${DSTU_TIMEOUT:-180}
out=${DSTU_OUT:-$root/.cache/zotero/result-$mode.json}

node $root/tools/plugin/bundle.mjs >/dev/null
node $root/tools/zotero/prepare.mjs >/dev/null

work=$(mktemp -d "${TMPDIR:-/tmp}/dstu-zotero.XXXXXX")
profile=$work/profile
data=$work/data
mkdir -p $profile/extensions $data $(dirname $out)
if [[ -n ${DSTU_XPI:-} ]]; then
  node $root/tools/plugin/pack.mjs >/dev/null
  cp $root/build/dstu-8302-*.xpi $profile/extensions/dstu-8302@local.xpi
  (cd $root/plugin && zip -q -r $profile/extensions/dstu-8302@local.xpi tests)
else
  print -rn -- $root/plugin/ > $profile/extensions/dstu-8302@local
fi
cat > $profile/user.js <<PREFS
user_pref("extensions.autoDisableScopes", 0);
user_pref("extensions.startupScanScopes", 1);
user_pref("extensions.enabledScopes", 15);
user_pref("extensions.update.enabled", false);
user_pref("xpinstall.signatures.required", false);
user_pref("app.update.enabled", false);
user_pref("app.update.auto", false);
user_pref("extensions.zotero.automaticScraperUpdates", false);
user_pref("extensions.zotero.firstRun2", false);
user_pref("extensions.zotero.checkForUpdates", false);
user_pref("extensions.logging.enabled", true);
user_pref("browser.dom.window.dump.enabled", true);
user_pref("datareporting.policy.dataSubmissionEnabled", false);
PREFS

rm -f $out
DSTU_OUT=$out DSTU_MODE=$mode DSTU_VIA=${DSTU_VIA:-direct} DSTU_TEST_SCRIPT=${DSTU_TEST_SCRIPT:-tests/corpus.js,tests/word.js} DSTU_CASES=$root/.cache/zotero/cases.json DSTU_ONLY=${DSTU_ONLY:-} \
  $app/Contents/MacOS/zotero -profile $profile -datadir $data -no-remote -purgecaches -ZoteroDebugText >$work/stdout.log 2>&1 &
pid=$!

for _ in $(seq 1 $timeout); do
  [[ -s $out ]] && break
  kill -0 $pid 2>/dev/null || break
  sleep 1
done

if [[ -s $out ]]; then
  wait $pid 2>/dev/null || kill $pid 2>/dev/null || true
  node $root/tools/zotero/summarize.mjs $out "$@"
else
  kill $pid 2>/dev/null || true
  print -u2 -- "no result; logs in $work"
  tail -20 $work/stdout.log >&2 || true
  exit 1
fi
[[ -n ${DSTU_KEEP:-} ]] && print -u2 -- "logs kept in $work" || rm -rf $work
