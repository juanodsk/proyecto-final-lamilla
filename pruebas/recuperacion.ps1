$ErrorActionPreference = 'Stop'
$base = if ($env:BASE_URL) { $env:BASE_URL } else { 'http://localhost:8097' }
$headers = @{}
foreach ($alias in 'estudiante','agente') {
    $login = Invoke-RestMethod "$base/api/auth/login" -Method Post -ContentType 'application/json' -Body (@{
        email = "$alias@proyectofinal.test"
        password = 'LamillaDemo2026!'
    } | ConvertTo-Json)
    $headers[$alias] = @{ Authorization = "Bearer $($login.token)" }
}

docker compose stop worker
if ($LASTEXITCODE -ne 0) { throw 'No se pudo detener el worker.' }
try {
    $ticket = Invoke-RestMethod "$base/api/tickets" -Method Post -Headers $headers['estudiante'] -ContentType 'application/json' -Body (@{
        title = 'Prueba de recuperación ' + (Get-Date -Format 'HH:mm:ss')
        category = 'OTHER'
        description = 'Caso sintético para verificar que el worker recupera trabajo pendiente.'
    } | ConvertTo-Json)
    $url = "$base/api/tickets/$($ticket.id)"
    $change = Invoke-RestMethod "$url/status" -Method Patch -Headers $headers['agente'] -ContentType 'application/json' -Body '{"status":"IN_PROGRESS"}'
    $pending = Invoke-RestMethod $url -Headers $headers['estudiante']
    if ($change.status -ne 'IN_PROGRESS' -or $pending.notifications.Count -ne 0) {
        throw 'Se esperaba un cambio confirmado y una notificación pendiente.'
    }
} finally {
    docker compose start worker
    if ($LASTEXITCODE -ne 0) { throw 'No se pudo reiniciar el worker.' }
}

$watch = [Diagnostics.Stopwatch]::StartNew()
do {
    Start-Sleep -Milliseconds 250
    $detail = Invoke-RestMethod $url -Headers $headers['estudiante']
} until ($detail.notifications.Count -gt 0 -or $watch.ElapsedMilliseconds -gt 10000)

if ($detail.notifications.Count -ne 1 -or $detail.notifications[0].status -ne 'IN_PROGRESS') {
    throw 'La notificación no se recuperó dentro de 10 s.'
}
$result = @{
    date = [DateTimeOffset]::UtcNow.ToString('o')
    pass = $true
    transitionDuringOutage = $change.status
    pendingNotificationsVisible = $pending.notifications.Count
    recoveredNotifications = $detail.notifications.Count
    observedAfterStartMs = $watch.ElapsedMilliseconds
}
$result | ConvertTo-Json | Set-Content -Encoding utf8 (Join-Path $PSScriptRoot '../evidencias/recuperacion.json')
$result
