# Rebuilds css/tailwind.css (the compiled Tailwind styles the site loads).
# Run from the project root whenever you add or change Tailwind classes in *.html or js/*.js:
#   powershell -File scripts/build-css.ps1
# Needs Node (npx downloads Tailwind 3.4 on first use). Commit the resulting css/tailwind.css.
Set-Location (Split-Path -Parent $PSScriptRoot)
npx --yes tailwindcss@3.4.17 -c tailwind.config.js -i css/tailwind.input.css -o css/tailwind.css --minify
if ($LASTEXITCODE -ne 0) { Write-Error "Tailwind build failed"; exit 1 }
(Get-Item css/tailwind.css).Length | ForEach-Object { "css/tailwind.css built: $_ bytes" }
