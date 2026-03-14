param(
  [switch]$SkipSeed
)

$ErrorActionPreference = "Stop"

function Test-Postgres {
  try {
    $tcp = New-Object System.Net.Sockets.TcpClient
    $iar = $tcp.BeginConnect("localhost", 5432, $null, $null)
    $success = $iar.AsyncWaitHandle.WaitOne(1500, $false)
    if (-not $success) {
      $tcp.Close()
      return $false
    }
    $tcp.EndConnect($iar)
    $tcp.Close()
    return $true
  } catch {
    return $false
  }
}

Write-Host "[1/4] Verificando PostgreSQL en localhost:5432..." -ForegroundColor Cyan
if (-not (Test-Postgres)) {
  Write-Host "PostgreSQL no esta activo en localhost:5432." -ForegroundColor Yellow
  Write-Host "Instala PostgreSQL o Docker Desktop, y vuelve a ejecutar este script." -ForegroundColor Yellow
  exit 1
}

Write-Host "[2/4] Generando Prisma Client..." -ForegroundColor Cyan
node ./node_modules/prisma/build/index.js generate --schema ./prisma/schema.prisma

Write-Host "[3/4] Aplicando migracion local..." -ForegroundColor Cyan
node ./node_modules/prisma/build/index.js migrate dev --name init --schema ./prisma/schema.prisma

if (-not $SkipSeed) {
  Write-Host "[3.5/4] Cargando datos de prueba..." -ForegroundColor Cyan
  $env:TS_NODE_COMPILER_OPTIONS = '{"module":"CommonJS"}'
  node ./node_modules/ts-node/dist/bin.js ./prisma/seed.ts
}

Write-Host "[4/4] Levantando Next.js en http://localhost:3000 ..." -ForegroundColor Cyan
node ./node_modules/next/dist/bin/next dev
