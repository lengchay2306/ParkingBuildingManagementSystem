# Prepares Android native builds on Windows (MAX_PATH / old Ninja workaround).
# Run from Mobile/:  npm run setup:android:windows

$ErrorActionPreference = "Stop"

$MobileRoot = Split-Path -Parent $PSScriptRoot
$NinjaDir = Join-Path $MobileRoot "tools\ninja"
$NinjaExe = Join-Path $NinjaDir "ninja.exe"
$NinjaVersion = "1.12.1"
$NinjaZipUrl = "https://github.com/ninja-build/ninja/releases/download/v$NinjaVersion/ninja-win.zip"
$TempZip = Join-Path $env:TEMP "ninja-win-$NinjaVersion.zip"
$AndroidSdk = $env:ANDROID_HOME
if (-not $AndroidSdk) {
  $AndroidSdk = Join-Path $env:LOCALAPPDATA "Android\Sdk"
}

Write-Host "==> Mobile root: $MobileRoot"

$CmakeStagingDir = "C:\rn-cmake"
if (-not (Test-Path $CmakeStagingDir)) {
  New-Item -ItemType Directory -Path $CmakeStagingDir | Out-Null
  Write-Host "==> Created short CMake staging dir: $CmakeStagingDir"
} else {
  Write-Host "==> CMake staging dir: $CmakeStagingDir"
}

if (-not (Test-Path $NinjaDir)) {
  New-Item -ItemType Directory -Path $NinjaDir | Out-Null
}

if (Test-Path $NinjaExe) {
  $currentVersion = & $NinjaExe --version
  Write-Host "==> Found ninja $currentVersion at $NinjaExe"
  if ($currentVersion -lt "1.12.0") {
    Write-Host "==> Ninja is too old. Updating..."
    Remove-Item $NinjaExe -Force
  }
}

if (-not (Test-Path $NinjaExe)) {
  Write-Host "==> Downloading Ninja $NinjaVersion..."
  Invoke-WebRequest -Uri $NinjaZipUrl -OutFile $TempZip
  Expand-Archive -Path $TempZip -DestinationPath $NinjaDir -Force
  Remove-Item $TempZip -Force
  Write-Host "==> Installed: $NinjaExe ($(& $NinjaExe --version))"
}

$sdkCmakeDirs = @()
if (Test-Path $AndroidSdk) {
  $sdkCmakeDirs = Get-ChildItem -Path (Join-Path $AndroidSdk "cmake") -Directory -ErrorAction SilentlyContinue
}

foreach ($cmakeDir in $sdkCmakeDirs) {
  $sdkNinja = Join-Path $cmakeDir.FullName "bin\ninja.exe"
  if (Test-Path (Split-Path $sdkNinja -Parent)) {
    Copy-Item $NinjaExe $sdkNinja -Force
    Write-Host "==> Updated Android SDK ninja: $sdkNinja"
  }
}

$longPaths = Get-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Control\FileSystem" -Name "LongPathsEnabled" -ErrorAction SilentlyContinue
if ($longPaths.LongPathsEnabled -ne 1) {
  Write-Host ""
  Write-Host "REQUIRED: Enable Windows long paths (Administrator PowerShell), then reboot:"
  Write-Host '  New-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Control\FileSystem" -Name "LongPathsEnabled" -Value 1 -PropertyType DWORD -Force'
  Write-Host ""
  Write-Host "Without this, deep paths like Desktop\Coded_Proj\... often fail with:"
  Write-Host "  ninja: Filename longer than 260 characters"
  Write-Host ""
  Write-Host "Alternative: clone/move the repo to a short path, e.g. C:\PBMS"
  Write-Host ""
} else {
  Write-Host "==> Windows long paths: enabled"
}

$desktopCopy = Join-Path $env:USERPROFILE "Desktop\Coding_Proj\ParkingBuildingManagementSystem\Mobile"
if (Test-Path $desktopCopy) {
  Write-Host ""
  Write-Host "WARNING: Found another copy at:"
  Write-Host "  $desktopCopy"
  Write-Host "If you moved the repo, delete that old folder and run:"
  Write-Host "  npx expo prebuild --clean --platform android"
  Write-Host "Otherwise Gradle may still point native modules to the old path."
  Write-Host ""
}

Write-Host "Next steps:"
Write-Host "  1. cd $MobileRoot"
Write-Host "  2. npx expo prebuild --clean --platform android"
Write-Host "  3. cd android; .\gradlew.bat --stop; cd .."
Write-Host "  4. npx expo run:android"
