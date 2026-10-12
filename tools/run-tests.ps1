<#
  FIRST 10 DAYS — run the tests from the command line

  Loads tests/ in headless Microsoft Edge (with a throwaway profile, so
  your own browser is never touched), prints any failures and the
  summary line, and exits 1 if anything failed.

  The test server has to be running first:
    powershell -NoProfile -ExecutionPolicy Bypass -File tools/serve.ps1 -Port 8778
  Then:
    powershell -NoProfile -ExecutionPolicy Bypass -File tools/run-tests.ps1
#>
param(
  [int]$Port = 8778,
  [int]$TimeoutSec = 60
)

$edge = @(
  "${env:ProgramFiles(x86)}\Microsoft\Edge\Application\msedge.exe",
  "$env:ProgramFiles\Microsoft\Edge\Application\msedge.exe"
) | Where-Object { Test-Path -LiteralPath $_ } | Select-Object -First 1
if (-not $edge) { Write-Host 'Microsoft Edge was not found.'; exit 2 }

$url = "http://localhost:$Port/tests/"
try { Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 5 | Out-Null }
catch { Write-Host "The test server isn't reachable at $url. Start tools/serve.ps1 -Port $Port first."; exit 2 }

$work = Join-Path $env:TEMP 'first-10-days-tests'
New-Item -ItemType Directory -Force -Path $work | Out-Null
$domFile = Join-Path $work 'dom.html'
$errFile = Join-Path $work 'edge-err.txt'

$profileDir = Join-Path $work 'profile'

# A headless Edge left over from an earlier run holds the profile and can
# stall this one, so clear any that are using it.
function Stop-TestEdge {
  Get-CimInstance Win32_Process -Filter "Name='msedge.exe'" |
    Where-Object { $_.CommandLine -like "*$profileDir*" } |
    ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }
}
Stop-TestEdge
Remove-Item -LiteralPath $domFile -ErrorAction SilentlyContinue

$edgeArgs = @(
  '--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
  '--disable-extensions', '--disable-component-update', '--disable-background-networking',
  '--disable-sync', '--no-pings', "--user-data-dir=$profileDir",
  '--virtual-time-budget=20000', '--dump-dom', $url
)
$run = Start-Process -FilePath $edge -ArgumentList $edgeArgs -NoNewWindow -PassThru `
  -RedirectStandardOutput $domFile -RedirectStandardError $errFile
if (-not $run.WaitForExit($TimeoutSec * 1000)) {
  Stop-TestEdge
  Write-Host "Edge didn't finish the test page within $TimeoutSec seconds."
  exit 3
}

$dom = Get-Content -LiteralPath $domFile -Raw -Encoding UTF8
if (-not $dom) { Write-Host 'Edge produced no output.'; exit 1 }

$text = [System.Net.WebUtility]::HtmlDecode(($dom -replace '<[^>]+>', "`n"))
$lines = $text -split "`n" | ForEach-Object { $_.Trim() } | Where-Object { $_ }

$lines | Where-Object { $_ -like 'FAIL *' } | ForEach-Object { Write-Host $_ }
$summary = $lines | Where-Object { $_ -match '^\d+ passed, \d+ failed$' } | Select-Object -Last 1
if (-not $summary) { Write-Host "No results found: the test page didn't finish."; exit 1 }

Write-Host $summary
if ($summary -match ', 0 failed$') { exit 0 } else { exit 1 }
