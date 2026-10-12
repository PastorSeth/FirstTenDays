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

$address = if ($Lan) { [System.Net.IPAddress]::Any } else { [System.Net.IPAddress]::Loopback }
$listener = New-Object System.Net.Sockets.TcpListener($address, $Port)
$listener.Start()

Write-Host "Serving $root"
Write-Host "  http://localhost:$Port/"
if ($Lan) {
  [System.Net.Dns]::GetHostAddresses([System.Net.Dns]::GetHostName()) |
    Where-Object { $_.AddressFamily -eq 'InterNetwork' -and -not [System.Net.IPAddress]::IsLoopback($_) } |
    ForEach-Object { Write-Host "  http://$($_.IPAddressToString):$Port/   (on your phone, same Wi-Fi)" }
}

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

while ($true) {
  $client = $listener.AcceptTcpClient()
  try {
    # Browsers open spare connections they may never use. Requests arrive
    # right after connecting, so drop a connection that stays silent
    # rather than letting it hold up the one-at-a-time loop.
    if (-not $client.Client.Poll(500000, [System.Net.Sockets.SelectMode]::SelectRead) -or $client.Available -eq 0) { continue }

    $stream = $client.GetStream()
    $reader = New-Object System.IO.StreamReader($stream, [System.Text.Encoding]::ASCII, $false, 4096, $true)
    $requestLine = $reader.ReadLine()
    while ($true) { $line = $reader.ReadLine(); if ([string]::IsNullOrEmpty($line)) { break } }
    if (-not $requestLine) { continue }

    $parts = $requestLine.Split(' ')
    $method = $parts[0]
    $target = if ($parts.Length -gt 1) { $parts[1] } else { '/' }
    $headOnly = $method -eq 'HEAD'

    if ($method -ne 'GET' -and -not $headOnly) {
      Send-Response $stream 405 'Method Not Allowed' 'text/plain; charset=utf-8' ([System.Text.Encoding]::UTF8.GetBytes('405')) $false
      continue
    }

    $pathPart = $target.Split('?')[0].Split('#')[0]
    $relative = [System.Uri]::UnescapeDataString($pathPart).TrimStart('/')
    $full = [System.IO.Path]::GetFullPath([System.IO.Path]::Combine($root, $relative))
    if (Test-Path -LiteralPath $full -PathType Container) { $full = [System.IO.Path]::Combine($full, 'index.html') }

    $insideRoot = $full.StartsWith($rootPrefix, [System.StringComparison]::OrdinalIgnoreCase)
    if ($insideRoot -and (Test-Path -LiteralPath $full -PathType Leaf)) {
      $contentType = $types[[System.IO.Path]::GetExtension($full).ToLower()]
      if (-not $contentType) { $contentType = 'application/octet-stream' }
      Send-Response $stream 200 'OK' $contentType ([System.IO.File]::ReadAllBytes($full)) $headOnly
    } else {
      Send-Response $stream 404 'Not Found' 'text/plain; charset=utf-8' ([System.Text.Encoding]::UTF8.GetBytes("404 $pathPart")) $headOnly
    }
  } catch {
    Write-Host "request error: $($_.Exception.Message)"
  } finally {
    $client.Close()
  }
}
