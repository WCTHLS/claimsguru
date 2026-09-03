#!/usr/bin/env bash
# ==============================================================================
# Automated Multi-Environment Cloud Deployment Script for ClaimsGuru on Microsoft Azure
# Compatible with macOS, Linux, and Azure Cloud Shell (Bash / Zsh)
# ==============================================================================
set -e

ENVIRONMENT="${1:-preprod}"
RESOURCE_GROUP="${2:-claimsGuru}"
LOCATION="${3:-centralindia}"
ACR_NAME="${4:-claimsgurucr}"
IMAGE_TAG="${ENVIRONMENT}-latest"
SQL_ADMIN_USER="claimsgurupreprodadmin"
SQL_ADMIN_PASSWORD="ClaimsGuruPreProdPass!2026"

echo "=========================================================================="
echo "  ClaimsGuru Enterprise Cloud Deployment ($ENVIRONMENT)"
echo "=========================================================================="
echo " Environment    : $ENVIRONMENT"
echo " Resource Group : $RESOURCE_GROUP"
echo " Location       : $LOCATION"
echo " Image Tag      : $IMAGE_TAG"
echo " ACR Name       : $ACR_NAME"

# 1. Verify Azure CLI Login
echo -e "\n[Step 1/7] Verifying Azure CLI Authentication..."
ACCOUNT_JSON=$(az account show -o json 2>/dev/null || true)
if [ -z "$ACCOUNT_JSON" ]; then
    echo " [ERROR] Azure CLI is not logged in. Please run 'az login'."
    exit 1
fi
SUB_NAME=$(echo "$ACCOUNT_JSON" | grep -o '"name": *"[^"]*"' | head -1 | cut -d'"' -f4)
SUB_ID=$(echo "$ACCOUNT_JSON" | grep -o '"id": *"[^"]*"' | head -1 | cut -d'"' -f4)
echo " [OK] Connected to Subscription: '$SUB_NAME' (ID: $SUB_ID)"

# 2. Register Required Azure Resource Providers
echo -e "\n[Step 2/7] Ensuring Azure Resource Providers are Registered..."
PROVIDERS=("Microsoft.App" "Microsoft.ContainerService" "Microsoft.ContainerRegistry" "Microsoft.KeyVault" "Microsoft.ServiceBus" "Microsoft.OperationalInsights" "Microsoft.Sql" "Microsoft.Storage" "Microsoft.CognitiveServices")
for p in "${PROVIDERS[@]}"; do
    az provider register --namespace "$p" --output none 2>/dev/null || true
done
echo " [OK] Resource providers registered."

# 3. Create or Verify Resource Group
echo -e "\n[Step 3/7] Ensuring Resource Group ($RESOURCE_GROUP) exists in $LOCATION..."
az group create --name "$RESOURCE_GROUP" --location "$LOCATION" --output none
echo " [OK] Resource Group ready: $RESOURCE_GROUP"

# 4. Create or Locate Dedicated Azure Container Registry in this Resource Group
CLEAN_RG=$(echo "$RESOURCE_GROUP" | tr '[:upper:]' '[:lower:]' | tr -cd '[:alnum:]' | cut -c1-12)
DEFAULT_ACR_NAME="acr${CLEAN_RG}${ENVIRONMENT}"
ACR_NAME="${4:-$DEFAULT_ACR_NAME}"
echo -e "\n[Step 4/7] Ensuring Dedicated Azure Container Registry ($ACR_NAME) in $RESOURCE_GROUP..."

ACR_EXISTS=$(az acr show --resource-group "$RESOURCE_GROUP" --name "$ACR_NAME" --query "name" -o tsv 2>/dev/null || true)
if [ -z "$ACR_EXISTS" ]; then
    echo " [*] Creating new Container Registry '$ACR_NAME' in $RESOURCE_GROUP..."
    az acr create --resource-group "$RESOURCE_GROUP" --name "$ACR_NAME" --sku Standard --admin-enabled true --location "$LOCATION" --output none
    echo " [OK] ACR Created: $ACR_NAME"
else
    echo " [*] Using existing ACR: $ACR_NAME"
fi

ACR_LOGIN_SERVER=$(az acr show --resource-group "$RESOURCE_GROUP" --name "$ACR_NAME" --query "loginServer" -o tsv 2>/dev/null || true)
if [ -z "$ACR_LOGIN_SERVER" ]; then
    ACR_LOGIN_SERVER="${ACR_NAME}.azurecr.io"
fi
echo " [OK] ACR Login Server: $ACR_LOGIN_SERVER"

# 5. Build & Push Container Images
echo -e "\n[Step 5/7] Building & Pushing Multi-Stage Images for [$ENVIRONMENT]..."
CORE_IMAGE="$ACR_LOGIN_SERVER/claimsguru-core:$IMAGE_TAG"
FRONTEND_IMAGE="$ACR_LOGIN_SERVER/claimsguru-frontend:$IMAGE_TAG"

echo " [*] Authenticating Docker with ACR ($ACR_NAME)..."
ACR_PASS=$(az acr credential show --resource-group "$RESOURCE_GROUP" --name "$ACR_NAME" --query "passwords[0].value" -o tsv 2>/dev/null || true)
if [ -n "$ACR_PASS" ]; then
    echo "$ACR_PASS" | docker login "$ACR_LOGIN_SERVER" -u "$ACR_NAME" --password-stdin 2>/dev/null
    echo " [OK] Docker authenticated with ACR."
else
    az acr login --name "$ACR_NAME"
fi

echo " [*] Building ClaimsGuru Core API & Workers Image: $CORE_IMAGE"
docker build -t "$CORE_IMAGE" -f infra/docker/Dockerfile.core .

echo " [*] Building ClaimsGuru Frontend UI Image: $FRONTEND_IMAGE"
docker build -t "$FRONTEND_IMAGE" -f infra/docker/Dockerfile.web .

echo " [*] Pushing images to ACR..."
docker push "$CORE_IMAGE"
docker push "$FRONTEND_IMAGE"
echo " [OK] Container images pushed successfully."

# 6. Deploy Infrastructure via Bicep
echo -e "\n[Step 6/7] Provisioning [$ENVIRONMENT] Infrastructure via Bicep..."
BICEP_FILE="infra/azure/main.bicep"
PARAM_FILE="infra/azure/parameters.${ENVIRONMENT}.json"

if [ -f "$PARAM_FILE" ]; then
    echo " [*] Using Parameter File: $PARAM_FILE"
    DEPLOYMENT_JSON=$(az deployment group create \
        --resource-group "$RESOURCE_GROUP" \
        --template-file "$BICEP_FILE" \
        --parameters "@$PARAM_FILE" \
        --parameters location="$LOCATION" acrLoginServer="$ACR_LOGIN_SERVER" imageTag="$IMAGE_TAG" \
        --output json)
else
    DEPLOYMENT_JSON=$(az deployment group create \
        --resource-group "$RESOURCE_GROUP" \
        --template-file "$BICEP_FILE" \
        --parameters location="$LOCATION" \
                     environmentName="$ENVIRONMENT" \
                     appName="claimsguru" \
                     acrLoginServer="$ACR_LOGIN_SERVER" \
                     imageTag="$IMAGE_TAG" \
                     sqlAdminLogin="$SQL_ADMIN_USER" \
                     sqlAdminPassword="$SQL_ADMIN_PASSWORD" \
        --output json)
fi

INGRESS_FQDN=$(echo "$DEPLOYMENT_JSON" | grep -A 3 '"ingressFqdn"' | grep '"value"' | cut -d'"' -f4 || true)
FRONTEND_FQDN=$(echo "$DEPLOYMENT_JSON" | grep -A 3 '"frontendFqdn"' | grep '"value"' | cut -d'"' -f4 || true)

echo -e "\n=========================================================================="
echo "  ClaimsGuru [$ENVIRONMENT] Deployed Successfully!"
echo "  Frontend UI URL     : https://$FRONTEND_FQDN"
echo "  Ingress API URL     : https://$INGRESS_FQDN"
echo "=========================================================================="

# 7. Smoke Test
echo -e "\n[Step 7/7] Running Post-Deployment Health Check..."
sleep 10
curl -s "https://$INGRESS_FQDN/ingress/health" || true

echo -e "\n\n=========================================================================="
echo "  Deployment Complete! Access: https://$FRONTEND_FQDN"
echo "=========================================================================="
