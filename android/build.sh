#!/usr/bin/env bash
# Buduje aplikację IMPOSTOR na Androida: dist/IMPOSTOR.apk
# Wymaga (Ubuntu/Debian): android-sdk-platform-23 aapt apksigner dalvik-exchange zipalign oraz JDK.
set -euo pipefail
cd "$(dirname "$0")"
ROOT="$(cd .. && pwd)"
SDK_JAR=/usr/lib/android-sdk/platforms/android-23/android.jar
OUT="$ROOT/dist"
B=build
KEYSTORE="${IMPOSTOR_KEYSTORE:-$PWD/impostor-release.jks}"
KEYPASS="${IMPOSTOR_KEYPASS:-impostor-gra}"

rm -rf "$B" && mkdir -p "$B/classes" "$B/assets/fonts" "$OUT"

echo "1/6 Gra (HTML + JS + czcionki)"
node "$ROOT/scripts/build-standalone.js" --app "$B/assets/index.html"
cp "$ROOT"/public/fonts/*.woff2 "$B/assets/fonts/"

echo "2/6 Ikony"
[ -f res/mipmap-xxxhdpi/ic_launcher.png ] || node make-icons.js

echo "3/6 Kompilacja Java"
javac --release 8 -nowarn -classpath "$SDK_JAR" -d "$B/classes" $(find src -name '*.java') 2>&1 | grep -v "^warning\|^Note" || true

echo "4/6 Dalvik (classes.dex)"
dalvik-exchange --dex --min-sdk-version=21 --output="$B/classes.dex" "$B/classes"

echo "5/6 Pakowanie APK"
aapt package -f -M AndroidManifest.xml -S res -A "$B/assets" -I "$SDK_JAR" -F "$B/unsigned.apk"
(cd "$B" && aapt add unsigned.apk classes.dex >/dev/null)
zipalign -f -p 4 "$B/unsigned.apk" "$B/aligned.apk"

echo "6/6 Podpisywanie"
if [ ! -f "$KEYSTORE" ]; then
  keytool -genkeypair -keystore "$KEYSTORE" -storepass "$KEYPASS" -keypass "$KEYPASS" -alias impostor \
    -keyalg RSA -keysize 2048 -validity 10000 -dname "CN=IMPOSTOR, O=IMPOSTOR, C=PL" >/dev/null 2>&1
fi
apksigner sign --ks "$KEYSTORE" --ks-pass "pass:$KEYPASS" --ks-key-alias impostor --out "$OUT/IMPOSTOR.apk" "$B/aligned.apk"
apksigner verify "$OUT/IMPOSTOR.apk"
echo "Gotowe: $OUT/IMPOSTOR.apk ($(du -h "$OUT/IMPOSTOR.apk" | cut -f1))"
