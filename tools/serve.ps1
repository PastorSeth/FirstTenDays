<#
  FIRST 10 DAYS — local static server

  Serves this project folder over plain HTTP so the app and its tests can
  run in a browser. It only answers this computer by default. With -Lan it
  also answers on your network address, so a phone on the same Wi-Fi can
  open the app — Windows may ask whether to allow that through the
  firewall, and that's your call.

  Usage (from the project folder):
    powershell -NoProfile -ExecutionPolicy Bypass -File tools/serve.ps1             # the app:   http://localhost:8777/
    powershell -NoProfile -ExecutionPolicy Bypass -File tools/serve.ps1 -Port 8778  # the tests: http://localhost:8778/tests/
    powershell -NoProfile -ExecutionPolicy Bypass -File tools/serve.ps1 -Lan        # phone testing on the same Wi-Fi

  Stop it with Ctrl+C (or by closing the window).
#>
param(
  [int]$Port = 8777,
  [switch]$Lan
)

$root = [System.IO.Path]::GetFullPath((Split-Path -Parent $PSScriptRoot))
$rootPrefix = $root.TrimEnd('\') + '\'

$types = @{
  '.html' = 'text/html; charset=utf-8'
  '.js'   = 'application/javascript; charset=utf-8'
  '.css'  = 'text/css; charset=utf-8'
  '.json' = 'application/json; charset=utf-8'
  '.png'  = 'image/png'
  '.svg'  = 'image/svg+xml'
  '.pdf'  = 'application/pdf'
  '.md'   = 'text/plain; charset=utf-8'
}

# "localhost" means ::1 (IPv6) before 127.0.0.1 on Windows. Page loads quietly
# fall back to IPv4, but the browser's service worker fetch doesn't — so
# listen on both.
$listeners = New-Object System.Collections.ArrayList
function Add-Listener([System.Net.IPAddress]$address, [bool]$dualMode) {
  try {
    $l = New-Object System.Net.Sockets.TcpListener($address, $Port)
    if ($dualMode) { $l.Server.DualMode = $true }
    $l.Start()
    [void]$listeners.Add($l)
  } catch {
    # This address family isn't available on this machine; the other one is enough.
  }
}
if ($Lan) {
  Add-Listener ([System.Net.IPAddress]::IPv6Any) $true
  if ($listeners.Count -eq 0) { Add-Listener ([System.Net.IPAddress]::Any) $false }
} else {
  Add-Listener ([System.Net.IPAddress]::Loopback) $false
  Add-Listener ([System.Net.IPAddress]::IPv6Loopback) $false
}
if ($listeners.Count -eq 0) { Write-Host "Couldn't listen on port $Port (is it already in use?)"; exit 1 }

Write-Host "Serving $root"
Write-Host "  http://localhost:$Port/"
if ($Lan) {
  [System.Net.Dns]::GetHostAddresses([System.Net.Dns]::GetHostName()) |
    Where-Object { $_.AddressFamily -eq 'InterNetwork' -and -not [System.Net.IPAddress]::IsLoopback($_) } |
    ForEach-Object { Write-Host "  http://$($_.IPAddressToString):$Port/   (on your phone, same Wi-Fi)" }
}

# Each connection is handled on its own worker, so a browser's spare
# connection that sends its request late (or never) just waits there
# instead of holding up everything else.
$handleConnection = {
  param($client, $root, $rootPrefix, $types)

  function Send-Response($stream, [int]$status, [string]$reason, [string]$contentType, [byte[]]$body, [bool]$headOnly) {
    $header = "HTTP/1.1 $status $reason`r`n" +
              "Content-Type: $contentType`r`n" +
              "Content-Length: $($body.Length)`r`n" +
              "Cache-Control: no-store`r`n" +
              "Connection: close`r`n`r`n"
    $headerBytes = [System.Text.Encoding]::ASCII.GetBytes($header)
    $stream.Write($headerBytes, 0, $headerBytes.Length)
    if (-not $headOnly -and $body.Length -gt 0) { $stream.Write($body, 0, $body.Length) }
  }

  try {
    $client.ReceiveTimeout = 15000
    $stream = $client.GetStream()
    $reader = New-Object System.IO.StreamReader($stream, [System.Text.Encoding]::ASCII, $false, 4096, $true)
    $requestLine = $reader.ReadLine()
    if (-not $requestLine) { return }
    while ($true) { $line = $reader.ReadLine(); if ([string]::IsNullOrEmpty($line)) { break } }

    $parts = $requestLine.Split(' ')
    $method = $parts[0]
    $target = if ($parts.Length -gt 1) { $parts[1] } else { '/' }
    $headOnly = $method -eq 'HEAD'

    if ($method -ne 'GET' -and -not $headOnly) {
      Send-Response $stream 405 'Method Not Allowed' 'text/plain; charset=utf-8' ([System.Text.Encoding]::UTF8.GetBytes('405')) $false
      return
    }

    # Only plain names inside the project are served, and every part of the
    # path is checked before the disk is looked at. Hidden folders (.git,
    # .claude), "..", short names like GIT~1, drive letters and network
    # paths (\\server\share) are all refused — Windows would otherwise try
    # to reach a network path, offering it this computer's sign-in. Device
    # names (CON, NUL) come back from GetFullPath outside the project, so
    # the inside-the-project check turns those away.
    $pathPart = $target.Split('?')[0].Split('#')[0]
    $segments = @([System.Uri]::UnescapeDataString($pathPart) -split '[\\/]' | Where-Object { $_ -ne '' })
    $plain = $true
    foreach ($segment in $segments) {
      if ($segment -notmatch '^[A-Za-z0-9][A-Za-z0-9 ._()-]*$') { $plain = $false }
    }

    $full = $null
    if ($plain) {
      $candidate = [System.IO.Path]::GetFullPath($root + '\' + ($segments -join '\'))
      $insideRoot = $candidate.StartsWith($rootPrefix, [System.StringComparison]::OrdinalIgnoreCase)
      if ($insideRoot -and (Test-Path -LiteralPath $candidate -PathType Container)) {
        $candidate = [System.IO.Path]::Combine($candidate, 'index.html')
      }
      $insideRoot = $candidate.StartsWith($rootPrefix, [System.StringComparison]::OrdinalIgnoreCase)
      if ($insideRoot -and (Test-Path -LiteralPath $candidate -PathType Leaf)) { $full = $candidate }
    }

    if ($full) {
      $contentType = $types[[System.IO.Path]::GetExtension($full).ToLower()]
      if (-not $contentType) { $contentType = 'application/octet-stream' }
      Send-Response $stream 200 'OK' $contentType ([System.IO.File]::ReadAllBytes($full)) $headOnly
    } else {
      Send-Response $stream 404 'Not Found' 'text/plain; charset=utf-8' ([System.Text.Encoding]::UTF8.GetBytes("404 $pathPart")) $headOnly
    }
  } catch {
    # A connection that timed out or hung up — nothing to answer.
  } finally {
    $client.Close()
  }
}

$workers = [System.Management.Automation.Runspaces.RunspaceFactory]::CreateRunspacePool(1, 16)
$workers.Open()
$inFlight = New-Object System.Collections.ArrayList

while ($true) {
  $accepted = $false
  foreach ($l in $listeners) {
    while ($l.Pending()) {
      $client = $l.AcceptTcpClient()
      $shell = [PowerShell]::Create()
      $shell.RunspacePool = $workers
      [void]$shell.AddScript($handleConnection).AddArgument($client).AddArgument($root).AddArgument($rootPrefix).AddArgument($types)
      [void]$inFlight.Add([pscustomobject]@{ Shell = $shell; Handle = $shell.BeginInvoke() })
      $accepted = $true
    }
  }
  if (-not $accepted) { Start-Sleep -Milliseconds 5 }

  foreach ($job in @($inFlight)) {
    if ($job.Handle.IsCompleted) {
      try { [void]$job.Shell.EndInvoke($job.Handle) } catch { }
      $job.Shell.Dispose()
      [void]$inFlight.Remove($job)
    }
  }
}
