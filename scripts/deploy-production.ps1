# Production Deployment Script for AI Interview Assistant (PowerShell)
# This script handles the complete production deployment process

param(
    [string]$ImageTag = "latest",
    [string]$Action = "deploy"
)

# Configuration
$ENVIRONMENT = "production"
$NAMESPACE = "ai-interview-prod"
$REGISTRY = "ghcr.io/your-org"

Write-Host "🚀 AI Interview Assistant - Production Deployment" -ForegroundColor Green
Write-Host "Environment: $ENVIRONMENT" -ForegroundColor Yellow
Write-Host "Image Tag: $ImageTag" -ForegroundColor Yellow

# Function to check prerequisites
function Test-Prerequisites {
    Write-Host "📋 Checking prerequisites..." -ForegroundColor Blue
    
    # Check if kubectl is installed
    if (-not (Get-Command kubectl -ErrorAction SilentlyContinue)) {
        Write-Host "❌ kubectl not found. Please install kubectl." -ForegroundColor Red
        exit 1
    }
    
    # Check if helm is installed
    if (-not (Get-Command helm -ErrorAction SilentlyContinue)) {
        Write-Host "❌ helm not found. Please install helm." -ForegroundColor Red
        exit 1
    }
    
    # Check if docker is installed
    if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
        Write-Host "❌ docker not found. Please install docker." -ForegroundColor Red
        exit 1
    }
    
    # Check cluster connectivity
    try {
        kubectl cluster-info | Out-Null
        Write-Host "✅ All prerequisites met" -ForegroundColor Green
    }
    catch {
        Write-Host "❌ Cannot connect to Kubernetes cluster." -ForegroundColor Red
        exit 1
    }
}

# Function to create namespace
function New-Namespace {
    Write-Host "📦 Setting up namespace..." -ForegroundColor Blue
    
    try {
        kubectl get namespace $NAMESPACE | Out-Null
        Write-Host "⚠️  Namespace $NAMESPACE already exists" -ForegroundColor Yellow
    }
    catch {
        kubectl apply -f k8s/production/namespace.yaml
        Write-Host "✅ Namespace $NAMESPACE created" -ForegroundColor Green
    }
}

# Function to deploy secrets
function Deploy-Secrets {
    Write-Host "🔐 Deploying secrets..." -ForegroundColor Blue
    
    if (Test-Path "./scripts/secrets-management.sh") {
        & "./scripts/secrets-management.sh" $ENVIRONMENT deploy
        Write-Host "✅ Secrets deployed" -ForegroundColor Green
    }
    else {
        Write-Host "⚠️  Secrets management script not found. Please deploy secrets manually." -ForegroundColor Yellow
    }
}

# Function to build and push images
function Build-AndPushImages {
    Write-Host "🏗️  Building and pushing Docker images..." -ForegroundColor Blue
    
    # Build backend image
    Write-Host "Building backend image..."
    docker build -t "$REGISTRY/ai-interview-assistant-backend:$ImageTag" -f backend/Dockerfile.prod backend/
    docker push "$REGISTRY/ai-interview-assistant-backend:$ImageTag"
    
    # Build frontend image
    Write-Host "Building frontend image..."
    docker build -t "$REGISTRY/ai-interview-assistant-frontend:$ImageTag" -f frontend/Dockerfile.prod frontend/
    docker push "$REGISTRY/ai-interview-assistant-frontend:$ImageTag"
    
    Write-Host "✅ Images built and pushed" -ForegroundColor Green
}

# Function to deploy database
function Deploy-Database {
    Write-Host "🗄️  Deploying database..." -ForegroundColor Blue
    
    kubectl apply -f k8s/production/database.yaml
    
    # Wait for database to be ready
    Write-Host "Waiting for database to be ready..."
    kubectl wait --for=condition=ready pod -l app=postgres -n $NAMESPACE --timeout=300s
    
    Write-Host "✅ Database deployed" -ForegroundColor Green
}

# Function to deploy Redis
function Deploy-Redis {
    Write-Host "🗄️  Deploying Redis..." -ForegroundColor Blue
    
    kubectl apply -f k8s/production/redis.yaml
    
    # Wait for Redis to be ready
    Write-Host "Waiting for Redis to be ready..."
    kubectl wait --for=condition=ready pod -l app=redis -n $NAMESPACE --timeout=300s
    
    Write-Host "✅ Redis deployed" -ForegroundColor Green
}

# Function to deploy backend
function Deploy-Backend {
    Write-Host "🔧 Deploying backend..." -ForegroundColor Blue
    
    # Update image tag in deployment
    $content = Get-Content k8s/production/backend-deployment.yaml
    $content = $content -replace ":latest", ":$ImageTag"
    $content | Set-Content k8s/production/backend-deployment-temp.yaml
    
    kubectl apply -f k8s/production/backend-deployment-temp.yaml
    
    # Wait for backend to be ready
    Write-Host "Waiting for backend to be ready..."
    kubectl wait --for=condition=available deployment/backend -n $NAMESPACE --timeout=300s
    
    # Cleanup temp file
    Remove-Item k8s/production/backend-deployment-temp.yaml
    
    Write-Host "✅ Backend deployed" -ForegroundColor Green
}

# Function to deploy frontend
function Deploy-Frontend {
    Write-Host "🎨 Deploying frontend..." -ForegroundColor Blue
    
    # Update image tag in deployment
    $content = Get-Content k8s/production/frontend-deployment.yaml
    $content = $content -replace ":latest", ":$ImageTag"
    $content | Set-Content k8s/production/frontend-deployment-temp.yaml
    
    kubectl apply -f k8s/production/frontend-deployment-temp.yaml
    
    # Wait for frontend to be ready
    Write-Host "Waiting for frontend to be ready..."
    kubectl wait --for=condition=available deployment/frontend -n $NAMESPACE --timeout=300s
    
    # Cleanup temp file
    Remove-Item k8s/production/frontend-deployment-temp.yaml
    
    Write-Host "✅ Frontend deployed" -ForegroundColor Green
}

# Function to run health checks
function Test-HealthChecks {
    Write-Host "🏥 Running health checks..." -ForegroundColor Blue
    
    # Wait for services to stabilize
    Start-Sleep -Seconds 30
    
    try {
        # Get ingress URLs
        $backendUrl = kubectl get ingress ai-interview-ingress -n $NAMESPACE -o jsonpath='{.spec.rules[1].host}'
        $frontendUrl = kubectl get ingress ai-interview-ingress -n $NAMESPACE -o jsonpath='{.spec.rules[0].host}'
        
        # Check backend health
        $response = Invoke-WebRequest -Uri "https://$backendUrl/health" -UseBasicParsing
        if ($response.StatusCode -eq 200) {
            Write-Host "✅ Backend health check passed" -ForegroundColor Green
        }
        
        # Check frontend health
        $response = Invoke-WebRequest -Uri "https://$frontendUrl/api/health" -UseBasicParsing
        if ($response.StatusCode -eq 200) {
            Write-Host "✅ Frontend health check passed" -ForegroundColor Green
        }
        
        Write-Host "✅ All health checks passed" -ForegroundColor Green
    }
    catch {
        Write-Host "❌ Health check failed: $($_.Exception.Message)" -ForegroundColor Red
        throw
    }
}

# Function to display summary
function Show-DeploymentSummary {
    Write-Host "🎉 Deployment Summary" -ForegroundColor Green
    Write-Host "===================" -ForegroundColor Blue
    
    kubectl get pods -n $NAMESPACE
    Write-Host ""
    kubectl get services -n $NAMESPACE
    Write-Host ""
    kubectl get ingress -n $NAMESPACE
    
    $backendUrl = kubectl get ingress ai-interview-ingress -n $NAMESPACE -o jsonpath='{.spec.rules[1].host}'
    $frontendUrl = kubectl get ingress ai-interview-ingress -n $NAMESPACE -o jsonpath='{.spec.rules[0].host}'
    
    Write-Host "🌐 Application URLs:" -ForegroundColor Green
    Write-Host "Frontend: https://$frontendUrl"
    Write-Host "Backend API: https://$backendUrl"
    Write-Host "Monitoring: http://your-monitoring-url:3001"
    
    Write-Host "✅ Production deployment completed successfully!" -ForegroundColor Green
}

# Main deployment function
function Start-Deployment {
    try {
        Test-Prerequisites
        New-Namespace
        Deploy-Secrets
        Build-AndPushImages
        Deploy-Database
        Deploy-Redis
        Deploy-Backend
        Deploy-Frontend
        kubectl apply -f k8s/production/ingress.yaml
        Test-HealthChecks
        Show-DeploymentSummary
    }
    catch {
        Write-Host "❌ Deployment failed: $($_.Exception.Message)" -ForegroundColor Red
        Write-Host "🔄 Consider running rollback..." -ForegroundColor Yellow
        exit 1
    }
}

# Function to rollback
function Start-Rollback {
    Write-Host "🔄 Rolling back deployment..." -ForegroundColor Yellow
    
    kubectl rollout undo deployment/backend -n $NAMESPACE
    kubectl rollout undo deployment/frontend -n $NAMESPACE
    
    Write-Host "✅ Rollback completed" -ForegroundColor Green
}

# Execute based on action
switch ($Action) {
    "deploy" { Start-Deployment }
    "rollback" { Start-Rollback }
    "health-check" { Test-HealthChecks }
    default {
        Write-Host "Usage: .\deploy-production.ps1 [-ImageTag <tag>] [-Action <deploy|rollback|health-check>]"
        Write-Host "  ImageTag: Docker image tag to deploy (default: latest)"
        Write-Host "  Action: deploy (default), rollback, health-check"
        exit 1
    }
}