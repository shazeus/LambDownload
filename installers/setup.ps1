$ErrorActionPreference = "Stop"
Set-Location (Join-Path $PSScriptRoot "..")
node scripts/setup.mjs
