# DDL Feature 1 - Sistema de Equipes
# Cria tabelas e altera tarefas no Supabase via Management API

param()

$PROJECT_ID = 'ubgazsabtzdutgibrxbs'
$API_URL    = "https://api.supabase.com/v1/projects/$PROJECT_ID/database/query"
$KEY        = $env:SUPABASE_SERVICE_KEY

if (-not $KEY) { Write-Error "SUPABASE_SERVICE_KEY nao definida"; exit 1 }

function Invoke-SQL {
    param([string]$Sql, [string]$Label = '')
    if (-not $Label) { $Label = $Sql.Substring(0, [Math]::Min(60, $Sql.Length)) }
    try {
        $body = @{ query = $Sql } | ConvertTo-Json -Compress
        $resp = Invoke-RestMethod -Uri $API_URL -Method POST `
            -Headers @{ Authorization = "Bearer $KEY"; 'Content-Type' = 'application/json' } `
            -Body $body -ErrorAction Stop
        Write-Host "[OK] $Label"
        return $resp
    } catch {
        $msg = $_.ErrorDetails.Message
        if (-not $msg) { $msg = $_.Exception.Message }
        Write-Host "[ERRO] $Label => $msg"
        exit 1
    }
}

function Table-Exists([string]$name) {
    $r = Invoke-SQL "SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='$name') AS ex" "verificar tabela $name"
    return $r[0].ex -eq $true
}

function Column-Exists([string]$table, [string]$col) {
    $r = Invoke-SQL "SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='$table' AND column_name='$col') AS ex" "verificar $table.$col"
    return $r[0].ex -eq $true
}

Write-Host "`n=== DDL Feature 1: Sistema de Equipes ===`n"

# 1. equipes
if (Table-Exists 'equipes') {
    Write-Host "[SKIP] equipes ja existe"
} else {
    Invoke-SQL @"
CREATE TABLE equipes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  cor text DEFAULT '#185FA5',
  criado_em timestamptz DEFAULT now()
)
"@ "criar equipes" | Out-Null
}

# 2. equipe_membros
if (Table-Exists 'equipe_membros') {
    Write-Host "[SKIP] equipe_membros ja existe"
} else {
    Invoke-SQL @"
CREATE TABLE equipe_membros (
  equipe_id uuid REFERENCES equipes(id) ON DELETE CASCADE,
  usuario_id uuid REFERENCES usuarios(id) ON DELETE CASCADE,
  PRIMARY KEY (equipe_id, usuario_id)
)
"@ "criar equipe_membros" | Out-Null
}

# 3. demanda_equipes
if (Table-Exists 'demanda_equipes') {
    Write-Host "[SKIP] demanda_equipes ja existe"
} else {
    Invoke-SQL @"
CREATE TABLE demanda_equipes (
  demanda_id text,
  equipe_id uuid REFERENCES equipes(id) ON DELETE CASCADE,
  PRIMARY KEY (demanda_id, equipe_id)
)
"@ "criar demanda_equipes" | Out-Null
}

# 4. tarefas.equipe_id
if (Column-Exists 'tarefas' 'equipe_id') {
    Write-Host "[SKIP] tarefas.equipe_id ja existe"
} else {
    Invoke-SQL "ALTER TABLE tarefas ADD COLUMN equipe_id uuid REFERENCES equipes(id)" "tarefas ADD COLUMN equipe_id" | Out-Null
}

Write-Host "`n=== Feature 1: DDL concluido com sucesso ==="
