#!/bin/zsh
set -eu

root=${0:A:h:h:h}
app=${ZOTERO_APP:-/Applications/Zotero.app}
timeout=${DSTU_TIMEOUT:-120}
out=$root/.cache/zotero/result-install.json

node $root/tools/plugin/pack.mjs >/dev/null
xpi=$(ls $root/build/dstu-8302-*.xpi | head -1)

work=$(mktemp -d "${TMPDIR:-/tmp}/dstu-zotero.XXXXXX")
profile=$work/profile
data=$work/data
mkdir -p $profile/extensions $data $(dirname $out)
print -rn -- $root/tools/zotero/install-check/ > $profile/extensions/dstu-install-check@local
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
user_pref("datareporting.policy.dataSubmissionEnabled", false);
user_pref("extensions.zotero.lastSelectedPrefPane", "zotero-prefpane-cite");
PREFS

rm -f $out
DSTU_OUT=$out DSTU_XPI_PATH=$xpi $app/Contents/MacOS/zotero -profile $profile -datadir $data -no-remote -purgecaches -ZoteroDebugText >$work/stdout.log 2>&1 &
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
  exit 1
fi
[[ -n ${DSTU_KEEP:-} ]] && print -u2 -- "logs kept in $work" || rm -rf $work
