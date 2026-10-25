#requires -Version 7.0
<#
.SYNOPSIS
  Build the Muse native shells locally.

.DESCRIPTION
  Capacitor wrapper build. capacitor.config.ts points server.url at the
  production site, so no web bundle is embedded; out/ is only needed because
  `cap sync` requires the configured webDir to exist.

  Android needs JDK 21 plus the Android SDK (platform 36, build-tools 36.0.0)
  and ANDROID_HOME. iOS needs macOS with Xcode and CocoaPods.

.EXAMPLE
  pwsh -File scripts/mobile-build.ps1 -Platform android
  pwsh -File scripts/mobile-build.ps1 -Platform ios
#>
param(
  [ValidateSet("android", "ios")]
  [string]$Platform = "android",
  [switch]$SkipSync
)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

# cap sync requires webDir to exist even when the WebView loads a remote URL.
if (-not (Test-Path "out")) { New-Item -ItemType Directory -Path "out" | Out-Null }
if (-not (Test-Path "out/index.html")) {
  Set-Content -LiteralPath "out/index.html" -Value '<!doctype html><meta charset="utf-8"><title>Muse</title>' -Encoding utf8
}

if ($Platform -eq "android") {
  if (-not (Get-Command java -ErrorAction SilentlyContinue)) {
    throw "java not found. Install JDK 21 (Temurin) and put it on PATH."
  }
  if (-not $env:ANDROID_HOME -and -not $env:ANDROID_SDK_ROOT) {
    throw "ANDROID_HOME or ANDROID_SDK_ROOT must point at the Android SDK."
  }
  $sdk = if ($env:ANDROID_HOME) { $env:ANDROID_HOME } else { $env:ANDROID_SDK_ROOT }
  if (-not (Test-Path (Join-Path $sdk "platforms\android-36"))) {
    throw "Android platform 36 not installed in $sdk (compileSdk is 36)."
  }
}

if (-not $SkipSync) {
  & npx cap sync $Platform
  if ($LASTEXITCODE -ne 0) { throw "npx cap sync $Platform failed" }
}

if ($Platform -eq "android") {
  Push-Location "android"
  try {
    & .\gradlew.bat assembleDebug --no-daemon --stacktrace
    if ($LASTEXITCODE -ne 0) { throw "gradlew assembleDebug failed" }
    $apk = Join-Path (Get-Location) "app\build\outputs\apk\debug\app-debug.apk"
    if (-not (Test-Path $apk)) { throw "APK not produced at $apk" }
    Write-Output "APK: $apk"
  }
  finally { Pop-Location }
}
else {
  if ($IsWindows) { throw "iOS builds require macOS with Xcode." }
  Push-Location "ios/App"
  try {
    & xcodebuild -project App.xcodeproj -scheme App -sdk iphonesimulator -configuration Debug -derivedDataPath build CODE_SIGNING_ALLOWED=NO build
    if ($LASTEXITCODE -ne 0) { throw "xcodebuild failed" }
    Write-Output "App: ios/App/build/Build/Products/Debug-iphonesimulator/App.app"
  }
  finally { Pop-Location }
}
