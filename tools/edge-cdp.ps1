<#
  FIRST 10 DAYS — shared helpers for driving headless Microsoft Edge

  Dot-sourced by run-tests.ps1 and eval-page.ps1. Edge runs with a
  throwaway profile (never your own browser data) and is controlled
  over its local debugging connection in real time, so animations and
  scroll effects behave the way they do on a phone.
#>

function Find-Edge {
  @(
    "${env:ProgramFiles(x86)}\Microsoft\Edge\Application\msedge.exe",
    "$env:ProgramFiles\Microsoft\Edge\Application\msedge.exe"
  ) | Where-Object { Test-Path -LiteralPath $_ } | Select-Object -First 1
}

# A headless Edge left over from an earlier run holds its profile and can
# stall the next one, so clear any that are using it.
function Stop-HeadlessEdge([string]$ProfileDir) {
  Get-CimInstance Win32_Process -Filter "Name='msedge.exe'" |
    Where-Object { $_.CommandLine -like "*$ProfileDir*" } |
    ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }
}

function Start-HeadlessEdge([string]$Edge, [string]$ProfileDir, [int]$DebugPort, [int]$Width, [int]$Height) {
  Stop-HeadlessEdge $ProfileDir
  $edgeArgs = @(
    '--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
    '--disable-extensions', '--disable-component-update', '--disable-background-networking',
    '--disable-sync', '--no-pings', "--window-size=$Width,$Height",
    "--user-data-dir=$ProfileDir", "--remote-debugging-port=$DebugPort", 'about:blank'
  )
  Start-Process -FilePath $Edge -ArgumentList $edgeArgs -WindowStyle Hidden | Out-Null
}

function Connect-EdgePage([int]$DebugPort, [datetime]$Deadline) {
  $socketUrl = $null
  while (-not $socketUrl -and (Get-Date) -lt $Deadline) {
    try {
      $targets = Invoke-RestMethod -Uri "http://127.0.0.1:$DebugPort/json/list" -TimeoutSec 2
      $page = $targets | Where-Object { $_.type -eq 'page' } | Select-Object -First 1
      if ($page) { $socketUrl = $page.webSocketDebuggerUrl }
    } catch { }
    if (-not $socketUrl) { Start-Sleep -Milliseconds 200 }
  }
  if (-not $socketUrl) { throw "headless Edge didn't start" }

  $cancel = New-Object System.Threading.CancellationTokenSource
  $cancel.CancelAfter([TimeSpan]::FromSeconds([Math]::Max(1, ($Deadline - (Get-Date)).TotalSeconds)))
  $socket = New-Object System.Net.WebSockets.ClientWebSocket
  $socket.ConnectAsync([Uri]$socketUrl, $cancel.Token).Wait()
  return @{ Socket = $socket; Token = $cancel.Token; NextId = 0 }
}

# Send one debugging command and wait for its reply.
function Invoke-Cdp($Session, [string]$Method, $Params) {
  $Session.NextId++
  $id = $Session.NextId
  $text = @{ id = $id; method = $Method; params = $Params } | ConvertTo-Json -Compress -Depth 8
  $bytes = [System.Text.Encoding]::UTF8.GetBytes($text)
  $out = New-Object System.ArraySegment[byte] -ArgumentList @(,$bytes)
  $Session.Socket.SendAsync($out, [System.Net.WebSockets.WebSocketMessageType]::Text, $true, $Session.Token).Wait()

  $buffer = New-Object byte[] 65536
  while ($true) {
    $message = New-Object System.Text.StringBuilder
    do {
      $segment = New-Object System.ArraySegment[byte] -ArgumentList @(,$buffer)
      $result = $Session.Socket.ReceiveAsync($segment, $Session.Token).Result
      [void]$message.Append([System.Text.Encoding]::UTF8.GetString($buffer, 0, $result.Count))
    } while (-not $result.EndOfMessage)
    $reply = $message.ToString() | ConvertFrom-Json
    if ($reply.id -eq $id) { return $reply }
  }
}

# Evaluate an expression in the page and return its value. If we ask while
# the page is still swapping in a new document, Edge answers "execution
# context was destroyed" — so ask again until the real page answers.
function Invoke-EdgeEval($Session, [string]$Expression, [datetime]$Deadline) {
  while ((Get-Date) -lt $Deadline) {
    $reply = Invoke-Cdp $Session 'Runtime.evaluate' @{ expression = $Expression; awaitPromise = $true; returnByValue = $true }
    if ($reply.error -and $reply.error.message -like '*context*destroyed*') { Start-Sleep -Milliseconds 200; continue }
    if ($reply.error) { throw "Edge refused the request: $($reply.error.message)" }
    if ($reply.result.exceptionDetails) {
      $detail = $reply.result.exceptionDetails.exception.description
      if (-not $detail) { $detail = $reply.result.exceptionDetails.text }
      throw "the page threw: $detail"
    }
    return $reply.result.result.value
  }
  throw 'the page never settled'
}
