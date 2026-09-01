@description('Azure Region for ClaimsGuru Deployment')
param location string = resourceGroup().location

@description('Environment Name suffix (stage, preprod, prod)')
param environmentName string = 'prod'

@description('Base Project / App Name')
param appName string = 'claimsguru'

@description('Container Image Tags')
param imageTag string = 'latest'

@description('Azure Container Registry Login Server')
param acrLoginServer string

@description('SQL Administrator Login')
param sqlAdminLogin string = 'claimsguruadmin'

@secure()
@description('SQL Administrator Password')
param sqlAdminPassword string

var prefix = '${appName}-${environmentName}'
var uniqueSuffix = uniqueString(resourceGroup().id)
var keyVaultName = take('${appName}-${environmentName}-kv-${uniqueSuffix}', 24)
var storageAccountName = take('${replace(appName, '-', '')}${environmentName}st${uniqueSuffix}', 24)
var docIntelName = '${prefix}-docintel-${uniqueSuffix}'
var logAnalyticsName = '${prefix}-law'
var acaEnvName = '${prefix}-aca-env'
var redisName = '${appName}-${environmentName}-redis-${uniqueSuffix}'
var serviceBusName = '${appName}-${environmentName}-sb-${uniqueSuffix}'
var sqlServerName = '${appName}-${environmentName}-sql-${uniqueSuffix}'
var sqlDbName = 'claimsguru'

// 1. Log Analytics Workspace
resource logAnalytics 'Microsoft.OperationalInsights/workspaces@2022-10-01' = {
  name: logAnalyticsName
  location: location
  properties: {
    sku: {
      name: 'PerGB2018'
    }
    retentionInDays: 30
  }
}

// 2. Azure Container Apps Managed Environment
resource containerAppEnv 'Microsoft.App/managedEnvironments@2023-05-01' = {
  name: acaEnvName
  location: location
  properties: {
    appLogsConfiguration: {
      destination: 'log-analytics'
      logAnalyticsConfiguration: {
        customerId: logAnalytics.properties.customerId
        sharedKey: logAnalytics.listKeys().primarySharedKey
      }
    }
  }
}

// 3. Azure Storage Account (Blob Storage for Documents)
resource storageAccount 'Microsoft.Storage/storageAccounts@2023-01-01' = {
  name: storageAccountName
  location: location
  sku: {
    name: 'Standard_LRS'
  }
  kind: 'StorageV2'
  properties: {
    minimumTlsVersion: 'TLS1_2'
    allowBlobPublicAccess: false
    supportsHttpsTrafficOnly: true
    accessTier: 'Hot'
  }
}

resource blobService 'Microsoft.Storage/storageAccounts/blobServices@2023-01-01' = {
  parent: storageAccount
  name: 'default'
}

resource claimgptContainer 'Microsoft.Storage/storageAccounts/blobServices/containers@2023-01-01' = {
  parent: blobService
  name: 'claimgpt'
  properties: {
    publicAccess: 'None'
  }
}

var storageConnectionString = 'DefaultEndpointsProtocol=https;AccountName=${storageAccount.name};AccountKey=${storageAccount.listKeys().keys[0].value};EndpointSuffix=${environment().suffixes.storage}'

// 4. Azure Document Intelligence (Form Recognizer)
resource docIntelligence 'Microsoft.CognitiveServices/accounts@2023-05-01' = {
  name: docIntelName
  location: location
  sku: {
    name: 'S0'
  }
  kind: 'FormRecognizer'
  properties: {
    customSubDomainName: docIntelName
    publicNetworkAccess: 'Enabled'
  }
}

// 5. Azure Service Bus Namespace & Processing Queues
resource serviceBus 'Microsoft.ServiceBus/namespaces@2022-10-01-preview' = {
  name: serviceBusName
  location: location
  sku: {
    name: 'Standard'
    tier: 'Standard'
  }
}

resource queueDefault 'Microsoft.ServiceBus/namespaces/queues@2022-10-01-preview' = {
  parent: serviceBus
  name: 'default'
  properties: {
    maxDeliveryCount: 10
    deadLetteringOnMessageExpiration: true
  }
}

resource queueOcr 'Microsoft.ServiceBus/namespaces/queues@2022-10-01-preview' = {
  parent: serviceBus
  name: 'ocr_queue'
  properties: {
    maxDeliveryCount: 10
    deadLetteringOnMessageExpiration: true
  }
}

resource queueParser 'Microsoft.ServiceBus/namespaces/queues@2022-10-01-preview' = {
  parent: serviceBus
  name: 'parser_queue'
  properties: {
    maxDeliveryCount: 10
    deadLetteringOnMessageExpiration: true
  }
}

resource queueDeadLetter 'Microsoft.ServiceBus/namespaces/queues@2022-10-01-preview' = {
  parent: serviceBus
  name: 'dead_letter'
  properties: {
    maxDeliveryCount: 10
    deadLetteringOnMessageExpiration: true
  }
}

var serviceBusConnectionString = listKeys('${serviceBus.id}/AuthorizationRules/RootManageSharedAccessKey', serviceBus.apiVersion).primaryConnectionString

// 6. Azure Cache for Redis
resource redisCache 'Microsoft.Cache/redis@2023-08-01' = {
  name: redisName
  location: location
  properties: {
    sku: {
      name: 'Basic'
      family: 'C'
      capacity: 1
    }
    enableNonSslPort: false
    minimumTlsVersion: '1.2'
  }
}

var redisConnectionString = 'rediss://:${redisCache.listKeys().primaryKey}@${redisCache.properties.hostName}:${redisCache.properties.sslPort}/0'

// 7. Azure SQL Database Server & Database
resource sqlServer 'Microsoft.Sql/servers@2022-05-01-preview' = {
  name: sqlServerName
  location: location
  properties: {
    administratorLogin: sqlAdminLogin
    administratorLoginPassword: sqlAdminPassword
    version: '12.0'
    publicNetworkAccess: 'Enabled'
  }
}

resource sqlFirewallAzure 'Microsoft.Sql/servers/firewallRules@2022-05-01-preview' = {
  parent: sqlServer
  name: 'AllowAllWindowsAzureIps'
  properties: {
    startIpAddress: '0.0.0.0'
    endIpAddress: '0.0.0.0'
  }
}

resource sqlDatabase 'Microsoft.Sql/servers/databases@2022-05-01-preview' = {
  parent: sqlServer
  name: sqlDbName
  location: location
  sku: {
    name: 'Standard'
    tier: 'Standard'
    capacity: 20
  }
}

var dbConnectionString = 'mssql+pyodbc://${sqlAdminLogin}:${sqlAdminPassword}@${sqlServer.properties.fullyQualifiedDomainName}:1433/${sqlDbName}?driver=ODBC+Driver+18+for+SQL+Server&TrustServerCertificate=yes'

// 8. Azure Key Vault (Secrets Management)
resource keyVault 'Microsoft.KeyVault/vaults@2023-07-01' = {
  name: keyVaultName
  location: location
  properties: {
    sku: {
      family: 'A'
      name: 'standard'
    }
    tenantId: subscription().tenantId
    enableRbacAuthorization: true
  }
}

// 9. ClaimsGuru Ingress API Container App (FastAPI Gateway)
resource ingressApp 'Microsoft.App/containerApps@2023-05-01' = {
  name: '${prefix}-ingress'
  location: location
  properties: {
    managedEnvironmentId: containerAppEnv.id
    configuration: {
      ingress: {
        external: true
        targetPort: 8000
        transport: 'auto'
      }
    }
    template: {
      containers: [
        {
          name: 'claimsguru-ingress'
          image: '${acrLoginServer}/claimsguru-core:${imageTag}'
          env: [
            { name: 'APP_ENV', value: 'production' }
            { name: 'APP_NAME', value: 'ClaimsGuru' }
            { name: 'LOG_LEVEL', value: 'INFO' }
            { name: 'DATABASE_URL', value: dbConnectionString }
            { name: 'REDIS_URL', value: redisConnectionString }
            { name: 'AZURE_SERVICEBUS_CONNECTION_STRING', value: serviceBusConnectionString }
            { name: 'AZURE_STORAGE_CONNECTION_STRING', value: storageConnectionString }
            { name: 'AZURE_STORAGE_ACCOUNT_URL', value: storageAccount.properties.primaryEndpoints.blob }
            { name: 'AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT', value: docIntelligence.properties.endpoint }
            { name: 'AZURE_DOCUMENT_INTELLIGENCE_KEY', value: docIntelligence.listKeys().key1 }
            { name: 'CELERY_BROKER_URL', value: 'azure-servicebus://RootManageSharedAccessKey:${listKeys('${serviceBus.id}/AuthorizationRules/RootManageSharedAccessKey', serviceBus.apiVersion).primaryKey}@${serviceBus.name}' }
            { name: 'CELERY_RESULT_BACKEND', value: redisConnectionString }
          ]
          resources: {
            cpu: json('1.0')
            memory: '2.0Gi'
          }
        }
      ]
      scale: {
        minReplicas: 1
        maxReplicas: 10
      }
    }
  }
}

// 10. ClaimsGuru OCR Celery Worker Container App
resource workerOcrApp 'Microsoft.App/containerApps@2023-05-01' = {
  name: '${prefix}-worker-ocr'
  location: location
  properties: {
    managedEnvironmentId: containerAppEnv.id
    template: {
      containers: [
        {
          name: 'claimsguru-worker-ocr'
          image: '${acrLoginServer}/claimsguru-core:${imageTag}'
          command: [
            'celery'
            '-A'
            'libs.shared.celery_app'
            'worker'
            '-l'
            'info'
            '-Q'
            'ocr_queue'
            '-c'
            '2'
          ]
          env: [
            { name: 'APP_ENV', value: 'production' }
            { name: 'CELERY_WORKER', value: 'true' }
            { name: 'DATABASE_URL', value: dbConnectionString }
            { name: 'REDIS_URL', value: redisConnectionString }
            { name: 'AZURE_SERVICEBUS_CONNECTION_STRING', value: serviceBusConnectionString }
            { name: 'AZURE_STORAGE_CONNECTION_STRING', value: storageConnectionString }
            { name: 'AZURE_STORAGE_ACCOUNT_URL', value: storageAccount.properties.primaryEndpoints.blob }
            { name: 'AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT', value: docIntelligence.properties.endpoint }
            { name: 'AZURE_DOCUMENT_INTELLIGENCE_KEY', value: docIntelligence.listKeys().key1 }
            { name: 'OCR_USE_AZURE_OCR', value: 'True' }
          ]
          resources: {
            cpu: json('2.0')
            memory: '4.0Gi'
          }
        }
      ]
      scale: {
        minReplicas: 1
        maxReplicas: 8
      }
    }
  }
}

// 11. ClaimsGuru Default & Parser Celery Worker Container App
resource workerDefaultApp 'Microsoft.App/containerApps@2023-05-01' = {
  name: '${prefix}-worker-default'
  location: location
  properties: {
    managedEnvironmentId: containerAppEnv.id
    template: {
      containers: [
        {
          name: 'claimsguru-worker-default'
          image: '${acrLoginServer}/claimsguru-core:${imageTag}'
          command: [
            'celery'
            '-A'
            'libs.shared.celery_app'
            'worker'
            '-l'
            'info'
            '-Q'
            'default,parser_queue'
            '-c'
            '2'
          ]
          env: [
            { name: 'APP_ENV', value: 'production' }
            { name: 'CELERY_WORKER', value: 'true' }
            { name: 'DATABASE_URL', value: dbConnectionString }
            { name: 'REDIS_URL', value: redisConnectionString }
            { name: 'AZURE_SERVICEBUS_CONNECTION_STRING', value: serviceBusConnectionString }
            { name: 'AZURE_STORAGE_CONNECTION_STRING', value: storageConnectionString }
            { name: 'AZURE_STORAGE_ACCOUNT_URL', value: storageAccount.properties.primaryEndpoints.blob }
            { name: 'AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT', value: docIntelligence.properties.endpoint }
            { name: 'AZURE_DOCUMENT_INTELLIGENCE_KEY', value: docIntelligence.listKeys().key1 }
          ]
          resources: {
            cpu: json('1.0')
            memory: '2.0Gi'
          }
        }
      ]
      scale: {
        minReplicas: 1
        maxReplicas: 6
      }
    }
  }
}

// 12. ClaimsGuru Next.js Frontend Container App
resource frontendApp 'Microsoft.App/containerApps@2023-05-01' = {
  name: '${prefix}-frontend'
  location: location
  properties: {
    managedEnvironmentId: containerAppEnv.id
    configuration: {
      ingress: {
        external: true
        targetPort: 3000
        transport: 'auto'
      }
    }
    template: {
      containers: [
        {
          name: 'claimsguru-frontend'
          image: '${acrLoginServer}/claimsguru-frontend:${imageTag}'
          env: [
            { name: 'NODE_ENV', value: 'production' }
            { name: 'NEXT_PUBLIC_APP_NAME', value: 'ClaimsGuru' }
            { name: 'NEXT_PUBLIC_API_BASE', value: 'https://${ingressApp.properties.configuration.ingress.fqdn}' }
          ]
          resources: {
            cpu: json('0.5')
            memory: '1.0Gi'
          }
        }
      ]
      scale: {
        minReplicas: 1
        maxReplicas: 5
      }
    }
  }
}

// Outputs
output ingressFqdn string = ingressApp.properties.configuration.ingress.fqdn
output frontendFqdn string = frontendApp.properties.configuration.ingress.fqdn
output sqlServerFqdn string = sqlServer.properties.fullyQualifiedDomainName
output redisHost string = redisCache.properties.hostName
output serviceBusName string = serviceBus.name
output storageAccountName string = storageAccount.name
output docIntelEndpoint string = docIntelligence.properties.endpoint
