<#
  FIRST 10 DAYS — run one check against a page in headless Edge

  Loads a page at a phone-sized window in headless Microsoft Edge (a
  fresh throwaway profile each time), waits for it to finish loading,
  evaluates a JavaScript expression in it, and prints the result —
  strings as they are, anything else as JSON.

  -Setup (or -SetupFile) runs before the page's own scripts on every
  load, e.g. to put something in localStorage first.

  Usage:
    powershell -NoProfile -ExecutionPolicy Bypass -File tools/eval-page.ps1 `
      -Url http://localhost:8777/ -ExpressionFile check.js [-SetupFile setup.js] [-Width 375 -Height 812]
#>
param(
  [Parameter(Mandatory = $true)][string]$Url,
  [string]$Expression = '',
  [string]$ExpressionFile = '',
  [string]$Setup = '',
  [string]$SetupFile = '',
  [int]$Width = 375,
  [int]$Height = 812,
  [string]$Screenshot = '',
  [int]$TimeoutSec = 60,
  [int]$DebugPort = 9335
)

. (Join-Path $PSScriptRoot 'edge-cdp.ps1')

if ($ExpressionFile) { $Expression = Get-Content -LiteralPath $ExpressionFile -Raw }
if ($SetupFile) { $Setup = Get-Content -LiteralPath $SetupFile -Raw }
if (-not $Expression) { Write-Host 'Give a check with -Expression or -ExpressionFile.'; exit 2 }

$edge = Find-Edge
if (-not $edge) { Write-Host 'Microsoft Edge was not found.'; exit 2 }

$profileDir = Join-Path $env:TEMP ("first-10-days-eval\profile-" + (Get-Random))
$code = 3
try {
  $deadline = (Get-Date).AddSeconds($TimeoutSec)
  Start-HeadlessEdge $edge $profileDir $DebugPort $Width $Height
  $session = Connect-EdgePage $DebugPort $deadline
  [void](Invoke-Cdp $session 'Page.enable' @{})
  # Headless windows won't go narrower than about 500px, so emulate the
  # phone's screen directly (this also honors the page's viewport tag).
  [void](Invoke-Cdp $session 'Emulation.setDeviceMetricsOverride' @{ width = $Width; height = $Height; deviceScaleFactor = 2; mobile = $true })
  if ($Setup) {
    $added = Invoke-Cdp $session 'Page.addScriptToEvaluateOnNewDocument' @{ source = $Setup }
    if ($added.error) { throw "Edge wouldn't take the setup script: $($added.error.message)" }
  }
  [void](Invoke-Cdp $session 'Page.navigate' @{ url = $Url })

  # Only run the check once the requested page (not the blank start page)
  # has finished loading.
  $target = ($Url -split '#')[0]
  $wrapped = "(async () => { while (!(location.href.startsWith($(ConvertTo-Json $target)) && document.readyState === 'complete')) await new Promise(r => setTimeout(r, 50)); return await ($Expression); })()"
  $value = Invoke-EdgeEval $session $wrapped $deadline
  if ($value -is [string]) { Write-Output $value } else { $value | ConvertTo-Json -Compress -Depth 8 }

  # Optionally save what the phone screen shows once the check is done.
  if ($Screenshot) {
    $shot = Invoke-Cdp $session 'Page.captureScreenshot' @{ format = 'png' }
    if ($shot.error) { throw "Edge couldn't take the screenshot: $($shot.error.message)" }
    [System.IO.File]::WriteAllBytes($Screenshot, [Convert]::FromBase64String($shot.result.data))
  }
  $code = 0
} catch {
  $reason = $_.Exception.Message
  if ($_.Exception.InnerException) { $reason = $_.Exception.InnerException.Message }
  Write-Host "The check didn't finish: $reason"
  $code = 3
} finally {
  Stop-HeadlessEdge $profileDir
  Remove-Item -LiteralPath $profileDir -Recurse -Force -ErrorAction SilentlyContinue
}
exit $code
