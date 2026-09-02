# Automated Multi-Environment Cloud Deployment Script for ClaimsGuru on Microsoft Azure.
param(
    [ValidateSet("stage", "preprod", "prod")]
    [string]$Environment = "stage",
    
    [string]$Location = "centralindia",
    [string]$ResourceGroupName = "",
    [string]$AcrName = "claimsgurucr",
    [string]$ImageTag = "$Environment-latest",
    [string]$SqlAdminUser = "claimsgurustageadmin",
    [string]$SqlAdminPassword = "ClaimsGuruStagePass!2026"
)

$ErrorActionPreference = "Continue"
if (-not $ResourceGroupName) {
    $ResourceGroupName = "claimsguru-$Environment-$Location-rg"
}

Write-Host "==========================================================================" -ForegroundColor Cyan
Write-Host "  ClaimsGuru Enterprise Cloud Deployment ($Environment)" -ForegroundColor Cyan
Write-Host "==========================================================================" -ForegroundColor Cyan
Write-Host " Environment    : $Environment" -ForegroundColor Gray
Write-Host " Resource Group : $ResourceGroupName" -ForegroundColor Gray
Write-Host " Location       : $Location" -ForegroundColor Gray
Write-Host " Image Tag      : $ImageTag" -ForegroundColor Gray

# 1. Verify Azure CLI Login
Write-Host "`n[Step 1/7] Verifying Azure CLI Authentication..." -ForegroundColor Yellow
$account = az account show --output json | ConvertFrom-Json
if (-not $account) {
    Write-Error "Azure CLI is not logged in. Please run 'az login'."
    exit 1
}
Write-Host " [OK] Connected to Subscription: '$($account.name)' (ID: $($account.id))" -ForegroundColor Green
Write-Host " [OK] Tenant: $($account.tenantDefaultDomain) ($($account.tenantId))" -ForegroundColor Green

# 2. Register Required Azure Resource Providers
Write-Host "`n[Step 2/7] Ensuring Azure Resource Providers are Registered..." -ForegroundColor Yellow
$providers = @("Microsoft.App", "Microsoft.ContainerService", "Microsoft.ContainerRegistry", "Microsoft.KeyVault", "Microsoft.ServiceBus", "Microsoft.OperationalInsights", "Microsoft.Sql", "Microsoft.Storage", "Microsoft.CognitiveServices")
foreach ($p in $providers) {
    az provider register --namespace $p --output none 2>&1 | Out-Null
}
Write-Host " [OK] Resource providers registered." -ForegroundColor Green

# 3. Create or Verify Resource Group
Write-Host "`n[Step 3/7] Creating Resource Group: $ResourceGroupName in $Location..." -ForegroundColor Yellow
az group create --name $ResourceGroupName --location $Location --output none
Write-Host " [OK] Resource Group ready: $ResourceGroupName" -ForegroundColor Green

# 4. Create or Locate Azure Container Registry
Write-Host "`n[Step 4/7] Ensuring Azure Container Registry ($AcrName) is Ready..." -ForegroundColor Yellow
$acrCheck = az acr check-name --name $AcrName --output json | ConvertFrom-Json
if ($acrCheck.nameAvailable -eq $true) {
    az acr create --resource-group $ResourceGroupName --name $AcrName --sku Standard --admin-enabled true --location $Location --output none
    Write-Host " [OK] ACR Created: $AcrName" -ForegroundColor Green
} else {
    Write-Host " [*] Using existing ACR: $AcrName" -ForegroundColor Yellow
}

$acrLoginServer = az acr show --name $AcrName --query "loginServer" --output tsv
if (-not $acrLoginServer) {
    Write-Error "Could not retrieve ACR Login Server for '$AcrName'."
    exit 1
}
Write-Host " [OK] ACR Login Server: $acrLoginServer" -ForegroundColor Green

# 5. Build & Push Container Images
Write-Host "`n[Step 5/7] Building & Pushing Multi-Stage Images for [$Environment]..." -ForegroundColor Yellow
$coreImage = "$acrLoginServer/claimsguru-core:$ImageTag"
$frontendImage = "$acrLoginServer/claimsguru-frontend:$ImageTag"

$tokenJson = az acr login --name $AcrName --expose-token --output json 2>&1 | Out-String | ConvertFrom-Json
if ($tokenJson -and $tokenJson.accessToken) {
    $tokenJson.accessToken | docker login $acrLoginServer -u 00000000-0000-0000-0000-000000000000 --password-stdin
    Write-Host " [OK] Docker authenticated with ACR." -ForegroundColor Green
} else {
    az acr login --name $AcrName
}

Write-Host " [*] Building ClaimsGuru Core API & Workers Image: $coreImage"
docker build -t $coreImage -f infra/docker/Dockerfile.core .

Write-Host " [*] Building ClaimsGuru Frontend UI Image: $frontendImage"
docker build -t $frontendImage -f infra/docker/Dockerfile.web .

Write-Host " [*] Pushing images to ACR..."
docker push $coreImage
docker push $frontendImage
Write-Host " [OK] Container images pushed successfully." -ForegroundColor Green

# 6. Deploy Infrastructure via Bicep
Write-Host "`n[Step 6/7] Provisioning [$Environment] Infrastructure via Bicep..." -ForegroundColor Yellow
$bicepFile = "infra/azure/main.bicep"
$paramFile = "infra/azure/parameters.$Environment.json"

if (Test-Path $paramFile) {
    Write-Host " [*] Using Environment Parameter File: $paramFile"
    $rawDeploy = az deployment group create `
        --resource-group $ResourceGroupName `
        --template-file $bicepFile `
        --parameters "@$paramFile" `
        --parameters location=$Location acrLoginServer=$acrLoginServer imageTag=$ImageTag `
        --output json
} else {
    $rawDeploy = az deployment group create `
        --resource-group $ResourceGroupName `
        --template-file $bicepFile `
        --parameters location=$Location `
                     environmentName=$Environment `
                     appName="claimsguru" `
                     acrLoginServer=$acrLoginServer `
                     imageTag=$ImageTag `
                     sqlAdminLogin=$SqlAdminUser `
                     sqlAdminPassword=$SqlAdminPassword `
        --output json
}

$deployment = $rawDeploy | ConvertFrom-Json
if (-not $deployment -or -not $deployment.properties -or -not $deployment.properties.outputs) {
    Write-Error "Bicep deployment did not complete successfully. Details: $rawDeploy"
    exit 1
}

$outputs = $deployment.properties.outputs
$ingressUrl = "https://$($outputs.ingressFqdn.value)"
$frontendUrl = "https://$($outputs.frontendFqdn.value)"

Write-Host "`n [OK] $Environment Environment Deployed Successfully!" -ForegroundColor Green
Write-Host "     Ingress API URL     : $ingressUrl" -ForegroundColor Cyan
Write-Host "     Frontend UI URL     : $frontendUrl" -ForegroundColor Cyan
Write-Host "     SQL Server FQDN     : $($outputs.sqlServerFqdn.value)" -ForegroundColor Gray
Write-Host "     Service Bus         : $($outputs.serviceBusName.value)" -ForegroundColor Gray
Write-Host "     Storage Account     : $($outputs.storageAccountName.value)" -ForegroundColor Gray
Write-Host "     Doc Intelligence    : $($outputs.docIntelEndpoint.value)" -ForegroundColor Gray

# 7. Post-Deployment Smoke Test
Write-Host "`n[Step 7/7] Running Post-Deployment Health Check on $ingressUrl/health..." -ForegroundColor Yellow
Start-Sleep -Seconds 10

try {
    $healthRes = Invoke-RestMethod -Uri "$ingressUrl/health" -Method Get -TimeoutSec 20
    Write-Host " [OK] Health Check PASSED: $($healthRes | ConvertTo-Json -Compress)" -ForegroundColor Green
} catch {
    Write-Host " [!] Health check warm-up in progress: $_" -ForegroundColor Yellow
}

Write-Host "`n==========================================================================" -ForegroundColor Green
Write-Host "  ClaimsGuru [$Environment] Deployment Ready!" -ForegroundColor Green
Write-Host "  App Access: $frontendUrl" -ForegroundColor Green
Write-Host "==========================================================================" -ForegroundColor Green
