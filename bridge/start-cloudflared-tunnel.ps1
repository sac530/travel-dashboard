$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$configPath = Join-Path $repoRoot 'bridge\cloudflared-traveldash-openclaw.yml'
$logDir = Join-Path $repoRoot 'tmp'
$cloudflared = 'C:\Users\sac73\.openclaw\tools\cloudflared.exe'

New-Item -ItemType Directory -Force -Path $logDir | Out-Null

$running = Get-CimInstance Win32_Process |
  Where-Object {
    $_.Name -eq 'cloudflared.exe' -and
    $_.CommandLine -like '*cloudflared-traveldash-openclaw.yml*'
  }

if ($running) {
  exit 0
}

Start-Process `
  -FilePath $cloudflared `
  -ArgumentList @('tunnel', '--config', $configPath, 'run') `
  -WorkingDirectory $repoRoot `
  -WindowStyle Hidden `
  -RedirectStandardOutput (Join-Path $logDir 'cloudflared-traveldash-openclaw.out.log') `
  -RedirectStandardError (Join-Path $logDir 'cloudflared-traveldash-openclaw.err.log')
