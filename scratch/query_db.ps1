$connStr = "Server=tcp:cg-preprod-sql-vvekhbufuteq2.database.windows.net,1433;Initial Catalog=claimsguru;Persist Security Info=False;User ID=claimsgurupreprodadmin;Password=ClaimsGuruPreProdPass!2026;MultipleActiveResultSets=False;Encrypt=True;TrustServerCertificate=True;Connection Timeout=30;"
$conn = New-Object System.Data.SqlClient.SqlConnection($connStr)
$conn.Open()

Write-Host "=== ALL RECENT CLAIMS WITH PATIENT_ID AND DOCUMENTS ==="
$cmd = $conn.CreateCommand()
$cmd.CommandText = @"
SELECT c.id, c.patient_id, c.policy_id, c.status, c.created_at, d.file_name, pj.set_hash
FROM claims c
LEFT JOIN documents d ON d.claim_id = c.id
LEFT JOIN parse_jobs pj ON pj.claim_id = c.id
ORDER BY c.created_at DESC
"@
$reader = $cmd.ExecuteReader()
$dt = New-Object System.Data.DataTable
$dt.Load($reader)
$dt | Format-Table -AutoSize | Out-String | Write-Host

$conn.Close()
