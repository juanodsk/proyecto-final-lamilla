$ErrorActionPreference = 'Stop'
$base = if ($env:BASE_URL) { $env:BASE_URL } else { 'http://localhost:8097' }

try {
    docker compose up -d --no-deps --scale api=2 --wait api
    if ($LASTEXITCODE -ne 0) { throw 'No se pudieron iniciar dos réplicas.' }
    $replicas = @(docker compose ps -q api)
    if ($LASTEXITCODE -ne 0 -or $replicas.Count -ne 2) { throw 'Se esperaban dos réplicas activas.' }
    for ($i = 0; $i -lt 3; $i++) {
        $before = Invoke-RestMethod "$base/api/health" -TimeoutSec 3
        if ($before.status -ne 'ok') { throw 'La comprobación previa falló.' }
    }
    docker stop $replicas[1]
    if ($LASTEXITCODE -ne 0) { throw 'No se pudo detener la segunda réplica.' }

    $success = 0
    for ($i = 0; $i -lt 30; $i++) {
        try {
            $health = Invoke-RestMethod "$base/api/health" -TimeoutSec 3
            if ($health.status -eq 'ok') { $success++ }
        } catch {
            Write-Host "La solicitud $i no llegó a una réplica disponible."
        }
        Start-Sleep -Milliseconds 200
    }
    @{
        date = [DateTimeOffset]::UtcNow.ToString('o')
        total = 30
        success = $success
        pass = $success -eq 30
    } | ConvertTo-Json | Set-Content -Encoding utf8 (Join-Path $PSScriptRoot '../evidencias/replicas.json')
    Write-Host "$success de 30 comprobaciones con una réplica detenida."
    if ($success -ne 30) { throw 'Se observó una interrupción en el periodo medido.' }
} finally {
    docker compose up -d --no-deps --scale api=1 --wait api
    if ($LASTEXITCODE -ne 0) { throw 'No se pudo volver a una sola réplica.' }
}
