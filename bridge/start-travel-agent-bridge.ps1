$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$script = Join-Path $repoRoot 'bridge\travel-agent-bridge.mjs'
$logDir = Join-Path $repoRoot 'tmp'
$tokenPath = 'C:\Users\sac73\.openclaw\state\secrets\traveldash-openclaw-bridge-token.txt'

New-Item -ItemType Directory -Force -Path $logDir | Out-Null

$running = Get-CimInstance Win32_Process |
  Where-Object {
    $_.Name -eq 'node.exe' -and
    $_.CommandLine -like '*travel-agent-bridge.mjs*'
  }

if ($running) {
  exit 0
}

$env:OPENCLAW_TRAVEL_AGENT_TOKEN = Get-Content -LiteralPath $tokenPath
$env:TRAVEL_AGENT_BRIDGE_PORT = '8787'

Start-Process `
  -FilePath 'node.exe' `
  -ArgumentList @($script) `
  -WorkingDirectory $repoRoot `
  -WindowStyle Hidden `
  -RedirectStandardOutput (Join-Path $logDir 'travel-agent-bridge.out.log') `
  -RedirectStandardError (Join-Path $logDir 'travel-agent-bridge.err.log')
