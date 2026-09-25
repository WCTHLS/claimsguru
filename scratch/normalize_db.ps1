$connStr = "Server=tcp:cg-preprod-sql-vvekhbufuteq2.database.windows.net,1433;Initial Catalog=claimsguru;Persist Security Info=False;User ID=claimsgurupreprodadmin;Password=ClaimsGuruPreProdPass!2026;MultipleActiveResultSets=False;Encrypt=True;TrustServerCertificate=True;Connection Timeout=30;"
$conn = New-Object System.Data.SqlClient.SqlConnection($connStr)
$conn.Open()

Write-Host "=== NORMALIZING CLAIMS IN DB ==="
$cmd = $conn.CreateCommand()
$cmd.CommandText = @"
-- Map Entra token subject hash QEiMRghZ34Sz... to canonical user UUID 89557b9f-a651-4200-953f-07831285405f
UPDATE claims 
SET patient_id = '89557b9f-a651-4200-953f-07831285405f' 
WHERE patient_id = 'QEiMRghZ34SzHybQEj8ppFZrVD9t7lRN1I_2KTytWEg'
   OR patient_id = '89557B9F-A651-4200-953F-07831285405F'
   OR patient_id = 'swagathreddykasula@gmail.com'
   OR policy_id = '89557B9F-A651-4200-953F-07831285405F';

-- Map swagathreddy00@gmail.com claims to 576b07c3-e6d5-4316-b59c-87ce76debc19
UPDATE claims
SET patient_id = '576b07c3-e6d5-4316-b59c-87ce76debc19'
WHERE patient_id = '576B07C3-E6D5-4316-B59C-87CE76DEBC19'
   OR patient_id = 'swagathreddy00@gmail.com';
"@
$rows = $cmd.ExecuteNonQuery()
Write-Host "Normalized $rows claim rows."

$cmd2 = $conn.CreateCommand()
$cmd2.CommandText = "SELECT id, patient_id, policy_id, status, created_at FROM claims WHERE patient_id = '89557b9f-a651-4200-953f-07831285405f' ORDER BY created_at DESC"
$reader = $cmd2.ExecuteReader()
$dt = New-Object System.Data.DataTable
$dt.Load($reader)
Write-Host "=== CLAIMS FOR swagathreddykasula@gmail.com NOW ==="
$dt | Format-Table -AutoSize | Out-String | Write-Host

$conn.Close()
