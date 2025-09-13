#!/bin/bash

# Production Deployment Script for AI Interview Assistant
# This script handles the complete deployment process for production environment

set -e  # Exit on any error

# Configuration
PROJECT_NAME="ai-interview-assistant"
DOCKER_REGISTRY="your-registry.com"
VERSION=${1:-latest}
ENVIRONMENT="production"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

error() {
    echo -e "${RED}[ERROR] $1${NC}" >&2
}

success() {
    echo -e "${GREEN}[SUCCESS] $1${NC}"
}

warning() {
    echo -e "${YELLOW}[WARNING] $1${NC}"
}

# Check prerequisites
check_prerequisites() {
    log "Checking prerequisites..."
    
    # Check if Docker is installed and running
    if ! command -v docker &> /dev/null; then
        error "Docker is not installed"
        exit 1
    fi
    
    if ! docker info &> /dev/null; then
        error "Docker is not running"
        exit 1
    fi
    
    # Check if Docker Compose is installed
    if ! command -v docker-compose &> /dev/null; then
        error "Docker Compose is not installed"
        exit 1
    fi
    
    # Check if required files exist
    if [[ ! -f "docker-compose.prod.yml" ]]; then
        error "docker-compose.prod.yml not found"
        exit 1
    fi
    
    if [[ ! -f ".env.production" ]]; then
        error ".env.production not found"
        exit 1
    fi
    
    success "Prerequisites check passed"
}

# Validate environment variables
validate_environment() {
    log "Validating environment variables..."
    
    # Source the production environment file
    set -a
    source .env.production
    set +a
    
    # Required environment variables
    required_vars=(
        "DATABASE_URL"
        "JWT_SECRET"
        "ENCRYPTION_MASTER_KEY"
        "OPENAI_API_KEY"
        "POSTGRES_PASSWORD"
    )
    
    missing_vars=()
    for var in "${required_vars[@]}"; do
        if [[ -z "${!var}" ]]; then
            missing_vars+=("$var")
        fi
    done
    
    if [[ ${#missing_vars[@]} -gt 0 ]]; then
        error "Missing required environment variables: ${missing_vars[*]}"
        exit 1
    fi
    
    success "Environment variables validated"
}

# Create necessary directories
create_directories() {
    log "Creating necessary directories..."
    
    # Create directories for volumes
    sudo mkdir -p /var/lib/ai-interview/{postgres,redis,logs,uploads,exports,ssl}
    sudo mkdir -p /var/log/ai-interview/{nginx,app}
    
    # Set proper permissions
    sudo chown -R 1001:1001 /var/lib/ai-interview/{logs,uploads,exports}
    sudo chown -R 999:999 /var/lib/ai-interview/postgres
    sudo chown -R 999:999 /var/lib/ai-interview/redis
    
    success "Directories created"
}

# Setup SSL certificates
setup_ssl() {
    log "Setting up SSL certificates..."
    
    SSL_DIR="/var/lib/ai-interview/ssl"
    
    if [[ ! -f "$SSL_DIR/cert.pem" ]] || [[ ! -f "$SSL_DIR/key.pem" ]]; then
        warning "SSL certificates not found. Please ensure certificates are placed in $SSL_DIR"
        warning "Required files: cert.pem, key.pem, ca.pem"
        
        # Create self-signed certificates for testing (NOT for production)
        if [[ "$2" == "--self-signed" ]]; then
            warning "Creating self-signed certificates for testing..."
            sudo openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
                -keyout "$SSL_DIR/key.pem" \
                -out "$SSL_DIR/cert.pem" \
                -subj "/C=US/ST=State/L=City/O=Organization/CN=yourdomain.com"
            sudo cp "$SSL_DIR/cert.pem" "$SSL_DIR/ca.pem"
        else
            error "SSL certificates are required for production deployment"
            exit 1
        fi
    fi
    
    success "SSL certificates configured"
}

# Build Docker images
build_images() {
    log "Building Docker images..."
    
    # Build backend image
    log "Building backend image..."
    docker build -f backend/Dockerfile.prod -t "${PROJECT_NAME}-backend:${VERSION}" backend/
    
    # Build frontend image
    log "Building frontend image..."
    docker build -f frontend/Dockerfile.prod -t "${PROJECT_NAME}-frontend:${VERSION}" frontend/
    
    success "Docker images built successfully"
}

# Push images to registry (if registry is configured)
push_images() {
    if [[ -n "$DOCKER_REGISTRY" ]] && [[ "$DOCKER_REGISTRY" != "your-registry.com" ]]; then
        log "Pushing images to registry..."
        
        # Tag images for registry
        docker tag "${PROJECT_NAME}-backend:${VERSION}" "${DOCKER_REGISTRY}/${PROJECT_NAME}-backend:${VERSION}"
        docker tag "${PROJECT_NAME}-frontend:${VERSION}" "${DOCKER_REGISTRY}/${PROJECT_NAME}-frontend:${VERSION}"
        
        # Push images
        docker push "${DOCKER_REGISTRY}/${PROJECT_NAME}-backend:${VERSION}"
        docker push "${DOCKER_REGISTRY}/${PROJECT_NAME}-frontend:${VERSION}"
        
        success "Images pushed to registry"
    else
        log "Skipping registry push (no registry configured)"
    fi
}

# Run database migrations
run_migrations() {
    log "Running database migrations..."
    
    # Start only the database service first
    docker-compose -f docker-compose.prod.yml up -d postgres redis
    
    # Wait for database to be ready
    log "Waiting for database to be ready..."
    sleep 30
    
    # Run migrations
    docker-compose -f docker-compose.prod.yml run --rm backend npm run prisma:migrate:deploy
    
    success "Database migrations completed"
}

# Deploy services
deploy_services() {
    log "Deploying services..."
    
    # Set environment variables for docker-compose
    export VERSION
    export PROJECT_NAME
    
    # Deploy with docker-compose
    docker-compose -f docker-compose.prod.yml up -d
    
    success "Services deployed"
}

# Health check
health_check() {
    log "Performing health checks..."
    
    # Wait for services to start
    sleep 60
    
    # Check backend health
    if curl -f http://localhost:4000/health > /dev/null 2>&1; then
        success "Backend health check passed"
    else
        error "Backend health check failed"
        return 1
    fi
    
    # Check frontend health
    if curl -f http://localhost:3000/api/health > /dev/null 2>&1; then
        success "Frontend health check passed"
    else
        error "Frontend health check failed"
        return 1
    fi
    
    success "All health checks passed"
}

# Cleanup old images
cleanup() {
    log "Cleaning up old images..."
    
    # Remove dangling images
    docker image prune -f
    
    # Remove old versions (keep last 3)
    docker images "${PROJECT_NAME}-backend" --format "table {{.Tag}}" | tail -n +4 | xargs -r docker rmi "${PROJECT_NAME}-backend:" 2>/dev/null || true
    docker images "${PROJECT_NAME}-frontend" --format "table {{.Tag}}" | tail -n +4 | xargs -r docker rmi "${PROJECT_NAME}-frontend:" 2>/dev/null || true
    
    success "Cleanup completed"
}

# Backup current deployment
backup_current() {
    log "Creating backup of current deployment..."
    
    BACKUP_DIR="/var/backups/ai-interview/$(date +%Y%m%d_%H%M%S)"
    sudo mkdir -p "$BACKUP_DIR"
    
    # Backup database
    docker-compose -f docker-compose.prod.yml exec -T postgres pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB" | sudo tee "$BACKUP_DIR/database.sql" > /dev/null
    
    # Backup uploaded files
    sudo cp -r /var/lib/ai-interview/uploads "$BACKUP_DIR/" 2>/dev/null || true
    
    # Backup configuration
    sudo cp .env.production "$BACKUP_DIR/"
    sudo cp docker-compose.prod.yml "$BACKUP_DIR/"
    
    success "Backup created at $BACKUP_DIR"
}

# Rollback function
rollback() {
    error "Deployment failed. Rolling back..."
    
    # Stop current services
    docker-compose -f docker-compose.prod.yml down
    
    # Restore from backup if available
    LATEST_BACKUP=$(sudo find /var/backups/ai-interview -type d -name "20*" | sort | tail -1)
    if [[ -n "$LATEST_BACKUP" ]]; then
        log "Restoring from backup: $LATEST_BACKUP"
        
        # Restore database
        if [[ -f "$LATEST_BACKUP/database.sql" ]]; then
            docker-compose -f docker-compose.prod.yml up -d postgres
            sleep 30
            sudo cat "$LATEST_BACKUP/database.sql" | docker-compose -f docker-compose.prod.yml exec -T postgres psql -U "$POSTGRES_USER" "$POSTGRES_DB"
        fi
        
        # Restore configuration
        if [[ -f "$LATEST_BACKUP/.env.production" ]]; then
            sudo cp "$LATEST_BACKUP/.env.production" .env.production
        fi
        
        # Start services with previous configuration
        docker-compose -f docker-compose.prod.yml up -d
    fi
    
    error "Rollback completed"
    exit 1
}

# Main deployment function
main() {
    log "Starting production deployment for $PROJECT_NAME version $VERSION"
    
    # Set trap for rollback on error
    trap rollback ERR
    
    check_prerequisites
    validate_environment
    create_directories
    setup_ssl "$@"
    backup_current
    build_images
    push_images
    run_migrations
    deploy_services
    
    # Remove trap before health check
    trap - ERR
    
    if health_check; then
        cleanup
        success "Deployment completed successfully!"
        log "Application is available at:"
        log "  - Frontend: https://yourdomain.com"
        log "  - API: https://api.yourdomain.com"
        log "  - Health: https://api.yourdomain.com/health"
    else
        rollback
    fi
}

# Show usage
usage() {
    echo "Usage: $0 [VERSION] [OPTIONS]"
    echo ""
    echo "Arguments:"
    echo "  VERSION     Docker image version (default: latest)"
    echo ""
    echo "Options:"
    echo "  --self-signed    Create self-signed SSL certificates (for testing only)"
    echo "  --help          Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0                    # Deploy latest version"
    echo "  $0 v1.2.3            # Deploy specific version"
    echo "  $0 latest --self-signed  # Deploy with self-signed certificates"
}

# Handle command line arguments
case "${1:-}" in
    --help|-h)
        usage
        exit 0
        ;;
    *)
        main "$@"
        ;;
esac