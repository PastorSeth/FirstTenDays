<#
  FIRST 10 DAYS — run the tests from the command line

  Opens tests/ in headless Microsoft Edge (with a throwaway profile, so
  your own browser is never touched), waits for the harness to finish,
  prints any failures and the summary line, and exits 1 if anything
  failed. Edge runs in real time, because the motion tests depend on
  real animation frames.

  The test server has to be running first:
    powershell -NoProfile -ExecutionPolicy Bypass -File tools/serve.ps1 -Port 8778
  Then:
    powershell -NoProfile -ExecutionPolicy Bypass -File tools/run-tests.ps1
#>
param(
  [int]$Port = 8778,
  [int]$TimeoutSec = 60,
  [int]$DebugPort = 9333
)

. (Join-Path $PSScriptRoot 'edge-cdp.ps1')

$edge = Find-Edge
if (-not $edge) { Write-Host 'Microsoft Edge was not found.'; exit 2 }

$url = "http://localhost:$Port/tests/"
try { Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 5 | Out-Null }
catch { Write-Host "The test server isn't reachable at $url. Start tools/serve.ps1 -Port $Port first."; exit 2 }

$profileDir = Join-Path $env:TEMP 'first-10-days-tests\profile'
$code = 3
try {
  $deadline = (Get-Date).AddSeconds($TimeoutSec)
  Start-HeadlessEdge $edge $profileDir $DebugPort 1000 800
  $session = Connect-EdgePage $DebugPort $deadline
  [void](Invoke-Cdp $session 'Page.navigate' @{ url = $url })

  # Wait for the harness to finish, then hand back its results.
  $expression = 'new Promise(done => { const wait = () => window.__testsDone ? window.__testsDone.then(r => done(JSON.stringify(r))) : setTimeout(wait, 50); wait(); })'
  $json = Invoke-EdgeEval $session $expression $deadline
  if (-not $json) { throw "the test page didn't report results" }

  $results = $json | ConvertFrom-Json
  $results.failures | ForEach-Object { Write-Host "FAIL $($_.name) - $($_.message)" }
  Write-Host "$($results.passed) passed, $($results.failed) failed"
  $code = if ($results.failed -eq 0) { 0 } else { 1 }
} catch {
  $reason = $_.Exception.Message
  if ($_.Exception.InnerException) { $reason = $_.Exception.InnerException.Message }
  Write-Host "The test run didn't finish: $reason"
  $code = 3
} finally {
  Stop-HeadlessEdge $profileDir
}
exit $code
