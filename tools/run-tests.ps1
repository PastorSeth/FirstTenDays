<#
  FIRST 10 DAYS — run the tests from the command line

  Opens tests/ in headless Microsoft Edge (with a throwaway profile, so
  your own browser is never touched), waits for the harness to finish,
  prints any failures and the summary line, and exits 1 if anything
  failed.

  It talks to Edge over its local debugging connection and lets the page
  run in real time, because the motion tests depend on real animation
  frames.

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
$profileDir = Join-Path $work 'profile'

# A headless Edge left over from an earlier run holds the profile and can
# stall this one, so clear any that are using it.
function Stop-TestEdge {
  Get-CimInstance Win32_Process -Filter "Name='msedge.exe'" |
    Where-Object { $_.CommandLine -like "*$profileDir*" } |
    ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }
}

function Send-Text($socket, [string]$text, $token) {
  $bytes = [System.Text.Encoding]::UTF8.GetBytes($text)
  $segment = New-Object System.ArraySegment[byte] -ArgumentList @(,$bytes)
  $socket.SendAsync($segment, [System.Net.WebSockets.WebSocketMessageType]::Text, $true, $token).Wait()
}

function Receive-Text($socket, $token) {
  $buffer = New-Object byte[] 65536
  $text = New-Object System.Text.StringBuilder
  do {
    $segment = New-Object System.ArraySegment[byte] -ArgumentList @(,$buffer)
    $result = $socket.ReceiveAsync($segment, $token).Result
    [void]$text.Append([System.Text.Encoding]::UTF8.GetString($buffer, 0, $result.Count))
  } while (-not $result.EndOfMessage)
  return $text.ToString()
}

Stop-TestEdge
$edgeArgs = @(
  '--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
  '--disable-extensions', '--disable-component-update', '--disable-background-networking',
  '--disable-sync', '--no-pings', "--user-data-dir=$profileDir",
  "--remote-debugging-port=$DebugPort", $url
)
Start-Process -FilePath $edge -ArgumentList $edgeArgs -WindowStyle Hidden | Out-Null

$code = 3
try {
  $deadline = (Get-Date).AddSeconds($TimeoutSec)

  # Find the test page's debugging connection.
  $socketUrl = $null
  while (-not $socketUrl -and (Get-Date) -lt $deadline) {
    try {
      $targets = Invoke-RestMethod -Uri "http://127.0.0.1:$DebugPort/json/list" -TimeoutSec 2
      $page = $targets | Where-Object { $_.type -eq 'page' -and $_.url -like "$url*" } | Select-Object -First 1
      if ($page) { $socketUrl = $page.webSocketDebuggerUrl }
    } catch { }
    if (-not $socketUrl) { Start-Sleep -Milliseconds 200 }
  }
  if (-not $socketUrl) { throw "headless Edge didn't open the test page within $TimeoutSec seconds" }

  $remaining = [Math]::Max(1, ($deadline - (Get-Date)).TotalSeconds)
  $cancel = New-Object System.Threading.CancellationTokenSource
  $cancel.CancelAfter([TimeSpan]::FromSeconds($remaining))
  $socket = New-Object System.Net.WebSockets.ClientWebSocket
  $socket.ConnectAsync([Uri]$socketUrl, $cancel.Token).Wait()

  # Ask the page for its results once the harness has finished.
  $expression = 'new Promise(done => { const wait = () => window.__testsDone ? window.__testsDone.then(r => done(JSON.stringify(r))) : setTimeout(wait, 50); wait(); })'
  $request = @{ id = 1; method = 'Runtime.evaluate'; params = @{ expression = $expression; awaitPromise = $true; returnByValue = $true } }
  Send-Text $socket ($request | ConvertTo-Json -Compress -Depth 5) $cancel.Token

  $reply = $null
  while (-not $reply) {
    $message = Receive-Text $socket $cancel.Token | ConvertFrom-Json
    if ($message.id -eq 1) { $reply = $message }
  }

  $json = $reply.result.result.value
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
  Stop-TestEdge
}
exit $code
