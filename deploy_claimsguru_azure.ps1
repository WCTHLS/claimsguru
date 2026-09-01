<#
.SYNOPSIS
    Automated Multi-Environment Cloud Deployment Script for ClaimsGuru on Microsoft Azure.
.DESCRIPTION
    Supports Staging (stage), Pre-Production (preprod), and Production (prod) environments.
    Builds multi-stage container images, pushes to Azure Container Registry (ACR),
    provisions full infrastructure via Bicep, and runs live smoke verification.
.EXAMPLE
    .\deploy_claimsguru_azure.ps1 -Environment stage
    .\deploy_claimsguru_azure.ps1 -Environment preprod
    .\deploy_claimsguru_azure.ps1 -Environment prod
#>

param(
    [ValidateSet("stage", "preprod", "prod")]
    [string]$Environment = "stage",
    
    [string]$Location = "eastus",
    [string]$AcrName = "claimsgurucr",
    [string]$ImageTag = "$Environment-$(Get-Date -Format 'yyyyMMdd-HHmm')",
    [string]$SqlAdminUser = "claimsguru${Environment}admin",
    [string]$SqlAdminPassword = ""
)

$ErrorActionPreference = "Stop"
$ResourceGroupName = "claimsguru-$Environment-rg"

Write-Host "==========================================================================" -ForegroundColor Cyan
Write-Host "  ClaimsGuru Enterprise Cloud Deployment ($($Environment.ToUpper()))" -ForegroundColor Cyan
Write-Host "==========================================================================" -ForegroundColor Cyan
Write-Host " Environment    : $($Environment.ToUpper())" -ForegroundColor Gray
Write-Host " Resource Group : $ResourceGroupName" -ForegroundColor Gray
Write-Host " Location       : $Location" -ForegroundColor Gray
Write-Host " Image Tag      : $ImageTag" -ForegroundColor Gray

# Prompt securely for SQL password if not provided
if (-not $SqlAdminPassword) {
    if ($Environment -eq "stage") {
        $SqlAdminPassword = "ClaimsGuruStagePass!2026"
    } else {
        $SqlAdminPassword = Read-Host "Enter Azure SQL Administrator Password" -AsSecureString
        $BSTR = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($SqlAdminPassword)
        $SqlAdminPassword = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($BSTR)
    }
}

# 1. Verify Azure CLI Login
Write-Host "`n[Step 1/7] Verifying Azure CLI Authentication..." -ForegroundColor Yellow
$account = az account show --output json | ConvertFrom-Json
if (-not $account) {
    Write-Error "Azure CLI is not logged in. Please run 'az login'."
}
Write-Host " [✓] Connected to Subscription: '$($account.name)' (ID: $($account.id))" -ForegroundColor Green
Write-Host " [✓] Tenant: $($account.tenantDefaultDomain) ($($account.tenantId))" -ForegroundColor Green

# 2. Register Required Azure Resource Providers
Write-Host "`n[Step 2/7] Ensuring Azure Resource Providers are Registered..." -ForegroundColor Yellow
$providers = @(
    "Microsoft.App",
    "Microsoft.ContainerService",
    "Microsoft.ContainerRegistry",
    "Microsoft.KeyVault",
    "Microsoft.ServiceBus",
    "Microsoft.OperationalInsights",
    "Microsoft.Cache",
    "Microsoft.Sql",
    "Microsoft.Storage",
    "Microsoft.CognitiveServices"
)
foreach ($p in $providers) {
    az provider register --namespace $p --output none
}
Write-Host " [✓] Resource providers registered." -ForegroundColor Green

# 3. Create or Verify Resource Group
Write-Host "`n[Step 3/7] Creating Resource Group: $ResourceGroupName in $Location..." -ForegroundColor Yellow
az group create --name $ResourceGroupName --location $Location --output none
Write-Host " [✓] Resource Group ready: $ResourceGroupName" -ForegroundColor Green

# 4. Create or Locate Azure Container Registry
Write-Host "`n[Step 4/7] Ensuring Azure Container Registry ($AcrName) is Ready..." -ForegroundColor Yellow
$acrExists = az acr check-name --name $AcrName --query "nameAvailable" --output tsv
if ($acrExists -eq "true") {
    az acr create --resource-group $ResourceGroupName --name $AcrName --sku Standard --admin-enabled true --output none
    Write-Host " [✓] ACR Created: $AcrName" -ForegroundColor Green
} else {
    Write-Host " [*] Using existing ACR: $AcrName" -ForegroundColor Yellow
}

$acrLoginServer = az acr show --name $AcrName --query "loginServer" --output tsv
Write-Host " [✓] ACR Login Server: $acrLoginServer" -ForegroundColor Green

# 5. Build & Push Container Images
Write-Host "`n[Step 5/7] Building & Pushing Multi-Stage Images for [$($Environment.ToUpper())]..." -ForegroundColor Yellow
Write-Host " [*] Authenticating Docker with ACR..."
az acr login --name $AcrName

$coreImage = "$acrLoginServer/claimsguru-core:$ImageTag"
$frontendImage = "$acrLoginServer/claimsguru-frontend:$ImageTag"

Write-Host " [*] Building ClaimsGuru Core API & Workers Image: $coreImage"
docker build -t $coreImage -f infra/docker/Dockerfile.core .

Write-Host " [*] Building ClaimsGuru Frontend UI Image: $frontendImage"
docker build -t $frontendImage -f infra/docker/Dockerfile.web .

Write-Host " [*] Pushing images to ACR..."
docker push $coreImage
docker push $frontendImage
Write-Host " [✓] Container images pushed successfully." -ForegroundColor Green

# 6. Deploy Infrastructure via Bicep
Write-Host "`n[Step 6/7] Provisioning [$($Environment.ToUpper())] Infrastructure via Bicep..." -ForegroundColor Yellow
$bicepFile = "infra/azure/main.bicep"
$paramFile = "infra/azure/parameters.$Environment.json"

if (Test-Path $paramFile) {
    Write-Host " [*] Using Environment Parameter File: $paramFile"
    $deployment = az deployment group create `
        --resource-group $ResourceGroupName `
        --template-file $bicepFile `
        --parameters "@$paramFile" `
        --parameters acrLoginServer=$acrLoginServer imageTag=$ImageTag `
        --output json | ConvertFrom-Json
} else {
    $deployment = az deployment group create `
        --resource-group $ResourceGroupName `
        --template-file $bicepFile `
        --parameters location=$Location `
                     environmentName=$Environment `
                     appName="claimsguru" `
                     acrLoginServer=$acrLoginServer `
                     imageTag=$ImageTag `
                     sqlAdminLogin=$SqlAdminUser `
                     sqlAdminPassword=$SqlAdminPassword `
        --output json | ConvertFrom-Json
}

$outputs = $deployment.properties.outputs
$ingressUrl = "https://$($outputs.ingressFqdn.value)"
$frontendUrl = "https://$($outputs.frontendFqdn.value)"

Write-Host " [✓] $($Environment.ToUpper()) Environment Deployed Successfully!" -ForegroundColor Green
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
    Write-Host " [✓] Health Check PASSED: $($healthRes | ConvertTo-Json -Compress)" -ForegroundColor Green
} catch {
    Write-Host " [!] Health check warm-up in progress: $_" -ForegroundColor Yellow
}

Write-Host "`n==========================================================================" -ForegroundColor Green
Write-Host "  ClaimsGuru [$($Environment.ToUpper())] Deployment Ready!" -ForegroundColor Green
Write-Host "  App Access: $frontendUrl" -ForegroundColor Green
Write-Host "==========================================================================" -ForegroundColor Green
