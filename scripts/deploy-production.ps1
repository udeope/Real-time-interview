# Production Deployment Script for AI Interview Assistant (PowerShell)
# This script handles the complete deployment process for production environment

param(
    [string]$Version = "latest",
    [switch]$SelfSigned,
    [switch]$Help
)

# Configuration
$ProjectName = "ai-interview-assistant"
$DockerRegistry = "your-registry.com"
$Environment = "production"

# Colors for output
$Colors = @{
    Red = "Red"
    Green = "Green"
    Yellow = "Yellow"
    Blue = "Blue"
    White = "White"
}

# Logging functions
function Write-Log {
    param([string]$Message, [string]$Color = "Blue")
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    Write-Host "[$timestamp] $Message" -ForegroundColor $Colors[$Color]
}

function Write-Error-Log {
    param([string]$Message)
    Write-Log "[ERROR] $Message" "Red"
}

function Write-Success {
    param([string]$Message)
    Write-Log "[SUCCESS] $Message" "Green"
}

function Write-Warning-Log {
    param([string]$Message)
    Write-Log "[WARNING] $Message" "Yellow"
}

# Show usage
function Show-Usage {
    Write-Host @"
Usage: .\deploy-production.ps1 [OPTIONS]

Parameters:
  -Version <string>     Docker image version (default: latest)
  -SelfSigned          Create self-signed SSL certificates (for testing only)
  -Help               Show this help message

Examples:
  .\deploy-production.ps1                    # Deploy latest version
  .\deploy-production.ps1 -Version v1.2.3   # Deploy specific version
  .\deploy-production.ps1 -SelfSigned       # Deploy with self-signed certificates
"@
}

# Check prerequisites
function Test-Prerequisites {
    Write-Log "Checking prerequisites..."
    
    # Check if Docker is installed and running
    try {
        $dockerVersion = docker --version
        if (-not $dockerVersion) {
            throw "Docker is not installed"
        }
        
        docker info | Out-Null
        if ($LASTEXITCODE -ne 0) {
            throw "Docker is not running"
        }
    }
    catch {
        Write-Error-Log "Docker check failed: $_"
        exit 1
    }
    
    # Check if Docker Compose is installed
    try {
        docker-compose --version | Out-Null
        if ($LASTEXITCODE -ne 0) {
            throw "Docker Compose is not installed"
        }
    }
    catch {
        Write-Error-Log "Docker Compose is not installed"
        exit 1
    }
    
    # Check if required files exist
    if (-not (Test-Path "docker-compose.prod.yml")) {
        Write-Error-Log "docker-compose.prod.yml not found"
        exit 1
    }
    
    if (-not (Test-Path ".env.production")) {
        Write-Error-Log ".env.production not found"
        exit 1
    }
    
    Write-Success "Prerequisites check passed"
}

# Validate environment variables
function Test-Environment {
    Write-Log "Validating environment variables..."
    
    # Load environment variables from .env.production
    if (Test-Path ".env.production") {
        Get-Content ".env.production" | ForEach-Object {
            if ($_ -match "^([^#][^=]+)=(.*)$") {
                [Environment]::SetEnvironmentVariable($matches[1], $matches[2], "Process")
            }
        }
    }
    
    # Required environment variables
    $requiredVars = @(
        "DATABASE_URL",
        "JWT_SECRET",
        "ENCRYPTION_MASTER_KEY",
        "OPENAI_API_KEY",
        "POSTGRES_PASSWORD"
    )
    
    $missingVars = @()
    foreach ($var in $requiredVars) {
        $value = [Environment]::GetEnvironmentVariable($var)
        if ([string]::IsNullOrEmpty($value)) {
            $missingVars += $var
        }
    }
    
    if ($missingVars.Count -gt 0) {
        Write-Error-Log "Missing required environment variables: $($missingVars -join ', ')"
        exit 1
    }
    
    Write-Success "Environment variables validated"
}

# Create necessary directories
function New-Directories {
    Write-Log "Creating necessary directories..."
    
    # Create directories for volumes
    $directories = @(
        "C:\var\lib\ai-interview\postgres",
        "C:\var\lib\ai-interview\redis",
        "C:\var\lib\ai-interview\logs",
        "C:\var\lib\ai-interview\uploads",
        "C:\var\lib\ai-interview\exports",
        "C:\var\lib\ai-interview\ssl",
        "C:\var\log\ai-interview\nginx",
        "C:\var\log\ai-interview\app"
    )
    
    foreach ($dir in $directories) {
        if (-not (Test-Path $dir)) {
            New-Item -ItemType Directory -Path $dir -Force | Out-Null
        }
    }
    
    Write-Success "Directories created"
}

# Setup SSL certificates
function Set-SSL {
    Write-Log "Setting up SSL certificates..."
    
    $sslDir = "C:\var\lib\ai-interview\ssl"
    
    if (-not (Test-Path "$sslDir\cert.pem") -or -not (Test-Path "$sslDir\key.pem")) {
        Write-Warning-Log "SSL certificates not found. Please ensure certificates are placed in $sslDir"
        Write-Warning-Log "Required files: cert.pem, key.pem, ca.pem"
        
        # Create self-signed certificates for testing (NOT for production)
        if ($SelfSigned) {
            Write-Warning-Log "Creating self-signed certificates for testing..."
            
            # Create self-signed certificate using PowerShell
            $cert = New-SelfSignedCertificate -DnsName "yourdomain.com" -CertStoreLocation "cert:\LocalMachine\My"
            $certPath = "$sslDir\cert.pem"
            $keyPath = "$sslDir\key.pem"
            
            # Export certificate
            Export-Certificate -Cert $cert -FilePath "$sslDir\cert.crt" -Type CERT
            Copy-Item "$sslDir\cert.crt" "$sslDir\ca.pem"
            
            Write-Warning-Log "Self-signed certificates created. Please convert to PEM format manually."
        }
        else {
            Write-Error-Log "SSL certificates are required for production deployment"
            exit 1
        }
    }
    
    Write-Success "SSL certificates configured"
}

# Build Docker images
function Build-Images {
    Write-Log "Building Docker images..."
    
    # Build backend image
    Write-Log "Building backend image..."
    docker build -f backend/Dockerfile.prod -t "${ProjectName}-backend:${Version}" backend/
    if ($LASTEXITCODE -ne 0) {
        throw "Failed to build backend image"
    }
    
    # Build frontend image
    Write-Log "Building frontend image..."
    docker build -f frontend/Dockerfile.prod -t "${ProjectName}-frontend:${Version}" frontend/
    if ($LASTEXITCODE -ne 0) {
        throw "Failed to build frontend image"
    }
    
    Write-Success "Docker images built successfully"
}

# Push images to registry
function Push-Images {
    if ($DockerRegistry -and $DockerRegistry -ne "your-registry.com") {
        Write-Log "Pushing images to registry..."
        
        # Tag images for registry
        docker tag "${ProjectName}-backend:${Version}" "${DockerRegistry}/${ProjectName}-backend:${Version}"
        docker tag "${ProjectName}-frontend:${Version}" "${DockerRegistry}/${ProjectName}-frontend:${Version}"
        
        # Push images
        docker push "${DockerRegistry}/${ProjectName}-backend:${Version}"
        docker push "${DockerRegistry}/${ProjectName}-frontend:${Version}"
        
        Write-Success "Images pushed to registry"
    }
    else {
        Write-Log "Skipping registry push (no registry configured)"
    }
}

# Run database migrations
function Invoke-Migrations {
    Write-Log "Running database migrations..."
    
    # Start only the database service first
    docker-compose -f docker-compose.prod.yml up -d postgres redis
    if ($LASTEXITCODE -ne 0) {
        throw "Failed to start database services"
    }
    
    # Wait for database to be ready
    Write-Log "Waiting for database to be ready..."
    Start-Sleep -Seconds 30
    
    # Run migrations
    docker-compose -f docker-compose.prod.yml run --rm backend npm run prisma:migrate:deploy
    if ($LASTEXITCODE -ne 0) {
        throw "Database migrations failed"
    }
    
    Write-Success "Database migrations completed"
}

# Deploy services
function Deploy-Services {
    Write-Log "Deploying services..."
    
    # Set environment variables
    $env:VERSION = $Version
    $env:PROJECT_NAME = $ProjectName
    
    # Deploy with docker-compose
    docker-compose -f docker-compose.prod.yml up -d
    if ($LASTEXITCODE -ne 0) {
        throw "Failed to deploy services"
    }
    
    Write-Success "Services deployed"
}

# Health check
function Test-Health {
    Write-Log "Performing health checks..."
    
    # Wait for services to start
    Start-Sleep -Seconds 60
    
    # Check backend health
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:4000/health" -UseBasicParsing -TimeoutSec 10
        if ($response.StatusCode -eq 200) {
            Write-Success "Backend health check passed"
        }
        else {
            throw "Backend returned status code: $($response.StatusCode)"
        }
    }
    catch {
        Write-Error-Log "Backend health check failed: $_"
        return $false
    }
    
    # Check frontend health
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:3000/api/health" -UseBasicParsing -TimeoutSec 10
        if ($response.StatusCode -eq 200) {
            Write-Success "Frontend health check passed"
        }
        else {
            throw "Frontend returned status code: $($response.StatusCode)"
        }
    }
    catch {
        Write-Error-Log "Frontend health check failed: $_"
        return $false
    }
    
    Write-Success "All health checks passed"
    return $true
}

# Cleanup old images
function Remove-OldImages {
    Write-Log "Cleaning up old images..."
    
    # Remove dangling images
    docker image prune -f
    
    Write-Success "Cleanup completed"
}

# Backup current deployment
function Backup-Current {
    Write-Log "Creating backup of current deployment..."
    
    $backupDir = "C:\var\backups\ai-interview\$(Get-Date -Format 'yyyyMMdd_HHmmss')"
    New-Item -ItemType Directory -Path $backupDir -Force | Out-Null
    
    # Backup database
    $postgresUser = [Environment]::GetEnvironmentVariable("POSTGRES_USER")
    $postgresDb = [Environment]::GetEnvironmentVariable("POSTGRES_DB")
    
    if ($postgresUser -and $postgresDb) {
        docker-compose -f docker-compose.prod.yml exec -T postgres pg_dump -U $postgresUser $postgresDb | Out-File -FilePath "$backupDir\database.sql" -Encoding UTF8
    }
    
    # Backup uploaded files
    if (Test-Path "C:\var\lib\ai-interview\uploads") {
        Copy-Item -Path "C:\var\lib\ai-interview\uploads" -Destination "$backupDir\" -Recurse -Force
    }
    
    # Backup configuration
    Copy-Item -Path ".env.production" -Destination "$backupDir\" -Force
    Copy-Item -Path "docker-compose.prod.yml" -Destination "$backupDir\" -Force
    
    Write-Success "Backup created at $backupDir"
}

# Rollback function
function Invoke-Rollback {
    Write-Error-Log "Deployment failed. Rolling back..."
    
    # Stop current services
    docker-compose -f docker-compose.prod.yml down
    
    # Find latest backup
    $backupDirs = Get-ChildItem -Path "C:\var\backups\ai-interview" -Directory | Where-Object { $_.Name -match "^\d{8}_\d{6}$" } | Sort-Object Name -Descending
    
    if ($backupDirs.Count -gt 0) {
        $latestBackup = $backupDirs[0].FullName
        Write-Log "Restoring from backup: $latestBackup"
        
        # Restore database
        if (Test-Path "$latestBackup\database.sql") {
            docker-compose -f docker-compose.prod.yml up -d postgres
            Start-Sleep -Seconds 30
            Get-Content "$latestBackup\database.sql" | docker-compose -f docker-compose.prod.yml exec -T postgres psql -U $env:POSTGRES_USER $env:POSTGRES_DB
        }
        
        # Restore configuration
        if (Test-Path "$latestBackup\.env.production") {
            Copy-Item -Path "$latestBackup\.env.production" -Destination ".env.production" -Force
        }
        
        # Start services with previous configuration
        docker-compose -f docker-compose.prod.yml up -d
    }
    
    Write-Error-Log "Rollback completed"
    exit 1
}

# Main deployment function
function Start-Deployment {
    Write-Log "Starting production deployment for $ProjectName version $Version"
    
    try {
        Test-Prerequisites
        Test-Environment
        New-Directories
        Set-SSL
        Backup-Current
        Build-Images
        Push-Images
        Invoke-Migrations
        Deploy-Services
        
        if (Test-Health) {
            Remove-OldImages
            Write-Success "Deployment completed successfully!"
            Write-Log "Application is available at:"
            Write-Log "  - Frontend: https://yourdomain.com"
            Write-Log "  - API: https://api.yourdomain.com"
            Write-Log "  - Health: https://api.yourdomain.com/health"
        }
        else {
            Invoke-Rollback
        }
    }
    catch {
        Write-Error-Log "Deployment failed: $_"
        Invoke-Rollback
    }
}

# Handle command line arguments
if ($Help) {
    Show-Usage
    exit 0
}

# Start deployment
Start-Deployment