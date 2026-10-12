<#
  FIRST 10 DAYS — checks for tools/serve.ps1

  Starts the local server on a spare port, asks it for files it should
  and shouldn't hand out, prints a line per check, and stops it again.
  Exits 0 when every check passes, 1 otherwise.

  Usage (from the project folder):
    powershell -NoProfile -ExecutionPolicy Bypass -File tests/serve.test.ps1
#>
param([int]$Port = 8790)

$projectRoot = Split-Path -Parent $PSScriptRoot
$server = Start-Process powershell -PassThru -WindowStyle Hidden -WorkingDirectory $projectRoot `
  -ArgumentList '-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', 'tools/serve.ps1', '-Port', $Port

# Sends the request line exactly as written (a browser or Invoke-WebRequest
# would tidy the path first) and returns the status and how long it took.
function Request([string]$target) {
  $timer = [System.Diagnostics.Stopwatch]::StartNew()
  $client = New-Object System.Net.Sockets.TcpClient
  try {
    $client.Connect('127.0.0.1', $Port)
    $client.ReceiveTimeout = 60000
    $stream = $client.GetStream()
    $bytes = [System.Text.Encoding]::ASCII.GetBytes("GET $target HTTP/1.1`r`nHost: localhost`r`n`r`n")
    $stream.Write($bytes, 0, $bytes.Length)
    $statusLine = (New-Object System.IO.StreamReader($stream)).ReadLine()
    $status = [int]($statusLine.Split(' ')[1])
  } catch {
    $status = 0
  } finally {
    $client.Close()
  }
  [pscustomobject]@{ Status = $status; Seconds = $timer.Elapsed.TotalSeconds }
}

$ready = $false
for ($i = 0; $i -lt 100 -and -not $ready; $i++) {
  try { $probe = New-Object System.Net.Sockets.TcpClient('127.0.0.1', $Port); $probe.Close(); $ready = $true }
  catch { Start-Sleep -Milliseconds 100 }
}

$checks = @(
  # Files the app and the tests need
  @{ Target = '/';                                Status = 200 },
  @{ Target = '/index.html';                      Status = 200 },
  @{ Target = '/tests/';                          Status = 200 },
  @{ Target = '/Test%20Icons/bible%20Gradient.png'; Status = 200 },
  @{ Target = '/data.js?v=2';                     Status = 200 },
  # Hidden folders stay hidden, however they're spelled
  @{ Target = '/.git/config';                     Status = 404 },
  @{ Target = '/%2Egit/config';                   Status = 404 },
  @{ Target = '/GIT~1/config';                    Status = 404 },
  @{ Target = '/tests/..%2F.git/config';          Status = 404 },
  @{ Target = '/tests%5C..%5C.git%5Cconfig';      Status = 404 },
  # Nothing outside the project folder
  @{ Target = '/../README.md';                    Status = 404 },
  @{ Target = '/C:/Windows/win.ini';              Status = 404 },
  @{ Target = '/CON';                             Status = 404; Fast = $true },
  @{ Target = '/tests/nul.js';                    Status = 404; Fast = $true },
  @{ Target = '/COM1.html';                       Status = 404; Fast = $true },
  # A network path is refused without Windows ever trying to reach it
  @{ Target = '/%5C%5C192.0.2.1%5Cshare%5Cfile';  Status = 404; Fast = $true },
  @{ Target = '/%5C%5C%3F%5CUNC%5C192.0.2.1%5Cshare'; Status = 404; Fast = $true }
)

$failed = 0
if (-not $ready) {
  Write-Host "FAIL the server never started on port $Port"
  $failed = 1
} else {
  foreach ($check in $checks) {
    $result = Request $check.Target
    $ok = $result.Status -eq $check.Status -and (-not $check.Fast -or $result.Seconds -lt 1)
    $line = '{0} {1} -> {2} in {3:N2}s (expected {4})' -f $(if ($ok) { 'PASS' } else { 'FAIL' }), $check.Target, $result.Status, $result.Seconds, $check.Status
    Write-Host $line
    if (-not $ok) { $failed++ }
  }
}

Stop-Process -Id $server.Id -Force -ErrorAction SilentlyContinue
Write-Host ("{0} passed, {1} failed" -f ($checks.Count - $failed), $failed)
if ($failed -gt 0) { exit 1 }
exit 0
