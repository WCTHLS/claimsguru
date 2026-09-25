$connStr = "Server=tcp:cg-preprod-sql-vvekhbufuteq2.database.windows.net,1433;Initial Catalog=claimsguru;Persist Security Info=False;User ID=claimsgurupreprodadmin;Password=ClaimsGuruPreProdPass!2026;MultipleActiveResultSets=False;Encrypt=True;TrustServerCertificate=True;Connection Timeout=120;"
$conn = New-Object System.Data.SqlClient.SqlConnection($connStr)
$conn.Open()

Write-Host "=== PURGING ALL REMAINING DOCUMENTS AND CLAIMS ==="
$tablesToClear = @(
    "document_validations",
    "claim_field_feedback",
    "chat_messages",
    "scan_analyses",
    "workflow_jobs",
    "workflow_state",
    "fraud_assessments",
    "validations",
    "predictions",
    "features",
    "medical_entities",
    "parsed_fields",
    "parse_jobs",
    "ocr_jobs",
    "submissions",
    "documents",
    "audit_logs",
    "claims"
)

foreach ($tbl in $tablesToClear) {
    try {
        $cmd = $conn.CreateCommand()
        $cmd.CommandTimeout = 300
        $cmd.CommandText = "DELETE FROM " + $tbl
        $count = $cmd.ExecuteNonQuery()
        Write-Host ("Cleared table: " + $tbl + " (" + $count + " rows deleted)")
    } catch {
        Write-Host ("Could not clear table " + $tbl + ": " + $_.Exception.Message)
    }
}

Write-Host "`n=== VERIFYING CLEAN STATE ==="
$cmdClaims = $conn.CreateCommand()
$cmdClaims.CommandTimeout = 60
$cmdClaims.CommandText = "SELECT COUNT(*) FROM claims"
$claimCount = $cmdClaims.ExecuteScalar()
Write-Host "Total Claims in DB: $claimCount"

$cmdDocs = $conn.CreateCommand()
$cmdDocs.CommandTimeout = 60
$cmdDocs.CommandText = "SELECT COUNT(*) FROM documents"
$docCount = $cmdDocs.ExecuteScalar()
Write-Host "Total Documents in DB: $docCount"

$conn.Close()
