# Exporta una copia lógica de PostgreSQL sin mostrar ni guardar la contraseña.
$ErrorActionPreference = 'Stop'

# Guarda la copia fuera del repositorio y marca el archivo como incompleto hasta validarlo.
$backupRoot = Join-Path $env:LOCALAPPDATA 'PataWallet\backups'
[System.IO.Directory]::CreateDirectory($backupRoot) | Out-Null
$backupName = 'patawallet-' + (Get-Date -Format 'yyyyMMdd-HHmmss') + '.dump'
$partialPath = Join-Path $backupRoot ($backupName + '.partial')
$backupPath = Join-Path $backupRoot $backupName

# La contraseña se solicita con entrada oculta y solo vive en este proceso y en pg_dump.
$securePassword = Read-Host -Prompt 'Contraseña PostgreSQL de Supabase (entrada oculta)' -AsSecureString
if ($securePassword.Length -eq 0) { throw 'No se introdujo ninguna contraseña.' }
$passwordPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($securePassword)
try {
  $env:PGPASSWORD = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($passwordPointer)
} finally {
  [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($passwordPointer)
  $securePassword.Dispose()
}

try {
  # Docker recibe la variable de entorno sin incluir el secreto en los argumentos del comando.
  docker run --rm --env PGPASSWORD --env PGSSLMODE=require --mount "type=bind,source=$backupRoot,target=/backup" postgres:17-alpine pg_dump -h aws-0-us-east-1.pooler.supabase.com -p 5432 -U postgres.gzsuhlkvaiinphlcqelt -d postgres --format=custom --no-owner --no-acl -f "/backup/$backupName.partial"
  if ($LASTEXITCODE -ne 0) { throw "pg_dump falló con código $LASTEXITCODE. No se creó un respaldo válido." }

  # Comprueba que PostgreSQL puede leer el archivo antes de declararlo respaldo.
  docker run --rm --mount "type=bind,source=$backupRoot,target=/backup" postgres:17-alpine pg_restore --list "/backup/$backupName.partial" | Out-Null
  if ($LASTEXITCODE -ne 0) { throw 'pg_restore no pudo leer el respaldo.' }
  if ((Get-Item -LiteralPath $partialPath).Length -lt 1024) { throw 'El respaldo está vacío o incompleto.' }
  Move-Item -LiteralPath $partialPath -Destination $backupPath
  Write-Host "RESPALDO_CREADO: $backupPath"
  Write-Host "TAMANO_BYTES: $((Get-Item -LiteralPath $backupPath).Length)"
} finally {
  # Evita dejar la contraseña disponible para comandos posteriores del terminal.
  Remove-Item Env:PGPASSWORD -ErrorAction SilentlyContinue
}
