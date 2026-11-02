#!/bin/zsh
set -eu

here=${0:A:h}
plugin=$here/zotero-plugin
work=$(mktemp -d "${TMPDIR:-/tmp}/dstu-spike.XXXXXX")
profile=$work/profile
data=$work/data
out=${1:-$here/zotero-spike-result.json}

mkdir -p $profile/extensions $data
(cd $plugin && zip -qr $profile/extensions/dstu-spike@local.xpi manifest.json bootstrap.js spike.js)
cat > $profile/user.js <<PREFS
user_pref("extensions.autoDisableScopes", 0);
user_pref("extensions.startupScanScopes", 1);
user_pref("xpinstall.signatures.required", false);
user_pref("app.update.enabled", false);
user_pref("app.update.auto", false);
user_pref("extensions.zotero.automaticScraperUpdates", false);
user_pref("extensions.zotero.firstRun2", false);
user_pref("extensions.zotero.sync.server.username", "");
user_pref("extensions.zotero.checkForUpdates", false);
user_pref("extensions.logging.enabled", true);
user_pref("browser.dom.window.dump.enabled", true);
user_pref("datareporting.policy.dataSubmissionEnabled", false);
PREFS

rm -f $out
DSTU_SPIKE_OUT=$out /Applications/Zotero.app/Contents/MacOS/zotero \
  -profile $profile -datadir $data -no-remote -ZoteroDebugText >$work/stdout.log 2>&1 &
pid=$!

for _ in {1..90}; do
  [[ -s $out ]] && break
  kill -0 $pid 2>/dev/null || break
  sleep 1
done

if [[ -s $out ]]; then
  wait $pid 2>/dev/null || true
  print -- "result: $out"
else
  kill $pid 2>/dev/null || true
  print -u2 -- "no result; logs in $work"
  exit 1
fi
print -- "work dir: $work"
