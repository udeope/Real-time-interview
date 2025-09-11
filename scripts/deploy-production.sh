#!/bin/bash

# Production Deployment Script for AI Interview Assistant
# This script handles the complete production deployment process

set -e

# Configuration
ENVIRONMENT="production"
NAMESPACE="ai-interview-prod"
REGISTRY="ghcr.io/your-org"
IMAGE_TAG=${1:-latest}

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${GREEN}🚀 AI Interview Assistant - Production Deployment${NC}"
echo -e "${YELLOW}Environment: ${ENVIRONMENT}${NC}"
echo -e "${YELLOW}Image Tag: ${IMAGE_TAG}${NC}"

# Function to check prerequisites
check_prerequisites() {
    echo -e "${BLUE}📋 Checking prerequisites...${NC}"
    
    # Check if kubectl is installed and configured
    if ! command -v kubectl &> /dev/null; then
        echo -e "${RED}❌ kubectl not found. Please install kubectl.${NC}"
        exit 1
    fi
    
    # Check if helm is installed
    if ! command -v helm &> /dev/null; then
        echo -e "${RED}❌ helm not found. Please install helm.${NC}"
        exit 1
    fi
    
    # Check if docker is installed
    if ! command -v docker &> /dev/null; then
        echo -e "${RED}❌ docker not found. Please install docker.${NC}"
        exit 1
    fi
    
    # Check cluster connectivity
    if ! kubectl cluster-info &> /dev/null; then
        echo -e "${RED}❌ Cannot connect to Kubernetes cluster.${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}✅ All prerequisites met${NC}"
}

# Function to create namespace if it doesn't exist
create_namespace() {
    echo -e "${BLUE}📦 Setting up namespace...${NC}"
    
    if kubectl get namespace $NAMESPACE &> /dev/null; then
        echo -e "${YELLOW}⚠️  Namespace $NAMESPACE already exists${NC}"
    else
        kubectl apply -f k8s/production/namespace.yaml
        echo -e "${GREEN}✅ Namespace $NAMESPACE created${NC}"
    fi
}

# Function to deploy secrets
deploy_secrets() {
    echo -e "${BLUE}🔐 Deploying secrets...${NC}"
    
    # Check if secrets management script exists
    if [ -f "./scripts/secrets-management.sh" ]; then
        ./scripts/secrets-management.sh $ENVIRONMENT deploy
        echo -e "${GREEN}✅ Secrets deployed${NC}"
    else
        echo -e "${YELLOW}⚠️  Secrets management script not found. Please deploy secrets manually.${NC}"
    fi
}

# Function to build and push Docker images
build_and_push_images() {
    echo -e "${BLUE}🏗️  Building and pushing Docker images...${NC}"
    
    # Build backend image
    echo "Building backend image..."
    docker build -t $REGISTRY/ai-interview-assistant-backend:$IMAGE_TAG -f backend/Dockerfile.prod backend/
    docker push $REGISTRY/ai-interview-assistant-backend:$IMAGE_TAG
    
    # Build frontend image
    echo "Building frontend image..."
    docker build -t $REGISTRY/ai-interview-assistant-frontend:$IMAGE_TAG -f frontend/Dockerfile.prod frontend/
    docker push $REGISTRY/ai-interview-assistant-frontend:$IMAGE_TAG
    
    echo -e "${GREEN}✅ Images built and pushed${NC}"
}

# Function to deploy database
deploy_database() {
    echo -e "${BLUE}🗄️  Deploying database...${NC}"
    
    kubectl apply -f k8s/production/database.yaml
    
    # Wait for database to be ready
    echo "Waiting for database to be ready..."
    kubectl wait --for=condition=ready pod -l app=postgres -n $NAMESPACE --timeout=300s
    
    echo -e "${GREEN}✅ Database deployed${NC}"
}

# Function to deploy Redis
deploy_redis() {
    echo -e "${BLUE}🗄️  Deploying Redis...${NC}"
    
    kubectl apply -f k8s/production/redis.yaml
    
    # Wait for Redis to be ready
    echo "Waiting for Redis to be ready..."
    kubectl wait --for=condition=ready pod -l app=redis -n $NAMESPACE --timeout=300s
    
    echo -e "${GREEN}✅ Redis deployed${NC}"
}

# Function to run database migrations
run_migrations() {
    echo -e "${BLUE}🔄 Running database migrations...${NC}"
    
    # Get the first backend pod
    BACKEND_POD=$(kubectl get pods -n $NAMESPACE -l app=backend -o jsonpath='{.items[0].metadata.name}')
    
    if [ -n "$BACKEND_POD" ]; then
        kubectl exec -n $NAMESPACE $BACKEND_POD -- npx prisma migrate deploy
        echo -e "${GREEN}✅ Database migrations completed${NC}"
    else
        echo -e "${YELLOW}⚠️  No backend pod found. Migrations will run on first startup.${NC}"
    fi
}

# Function to deploy backend
deploy_backend() {
    echo -e "${BLUE}🔧 Deploying backend...${NC}"
    
    # Update image tag in deployment
    sed -i.bak "s|:latest|:$IMAGE_TAG|g" k8s/production/backend-deployment.yaml
    
    kubectl apply -f k8s/production/backend-deployment.yaml
    
    # Wait for backend to be ready
    echo "Waiting for backend to be ready..."
    kubectl wait --for=condition=available deployment/backend -n $NAMESPACE --timeout=300s
    
    # Restore original file
    mv k8s/production/backend-deployment.yaml.bak k8s/production/backend-deployment.yaml
    
    echo -e "${GREEN}✅ Backend deployed${NC}"
}

# Function to deploy frontend
deploy_frontend() {
    echo -e "${BLUE}🎨 Deploying frontend...${NC}"
    
    # Update image tag in deployment
    sed -i.bak "s|:latest|:$IMAGE_TAG|g" k8s/production/frontend-deployment.yaml
    
    kubectl apply -f k8s/production/frontend-deployment.yaml
    
    # Wait for frontend to be ready
    echo "Waiting for frontend to be ready..."
    kubectl wait --for=condition=available deployment/frontend -n $NAMESPACE --timeout=300s
    
    # Restore original file
    mv k8s/production/frontend-deployment.yaml.bak k8s/production/frontend-deployment.yaml
    
    echo -e "${GREEN}✅ Frontend deployed${NC}"
}

# Function to deploy ingress
deploy_ingress() {
    echo -e "${BLUE}🌐 Deploying ingress...${NC}"
    
    kubectl apply -f k8s/production/ingress.yaml
    
    echo -e "${GREEN}✅ Ingress deployed${NC}"
}

# Function to deploy monitoring
deploy_monitoring() {
    echo -e "${BLUE}📊 Deploying monitoring...${NC}"
    
    if [ -f "monitoring/docker-compose.monitoring.yml" ]; then
        # For Docker Compose monitoring
        docker-compose -f monitoring/docker-compose.monitoring.yml up -d
        echo -e "${GREEN}✅ Monitoring deployed with Docker Compose${NC}"
    elif [ -d "k8s/monitoring" ]; then
        # For Kubernetes monitoring
        kubectl apply -f k8s/monitoring/
        echo -e "${GREEN}✅ Monitoring deployed to Kubernetes${NC}"
    else
        echo -e "${YELLOW}⚠️  Monitoring configuration not found${NC}"
    fi
}

# Function to run health checks
run_health_checks() {
    echo -e "${BLUE}🏥 Running health checks...${NC}"
    
    # Get service URLs
    BACKEND_URL=$(kubectl get ingress ai-interview-ingress -n $NAMESPACE -o jsonpath='{.spec.rules[1].host}')
    FRONTEND_URL=$(kubectl get ingress ai-interview-ingress -n $NAMESPACE -o jsonpath='{.spec.rules[0].host}')
    
    # Wait a bit for services to stabilize
    sleep 30
    
    # Check backend health
    if curl -f https://$BACKEND_URL/health > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Backend health check passed${NC}"
    else
        echo -e "${RED}❌ Backend health check failed${NC}"
        exit 1
    fi
    
    # Check frontend health
    if curl -f https://$FRONTEND_URL/api/health > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Frontend health check passed${NC}"
    else
        echo -e "${RED}❌ Frontend health check failed${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}✅ All health checks passed${NC}"
}

# Function to run smoke tests
run_smoke_tests() {
    echo -e "${BLUE}🧪 Running smoke tests...${NC}"
    
    # Run basic API tests
    if [ -f "./scripts/smoke-tests.sh" ]; then
        ./scripts/smoke-tests.sh
        echo -e "${GREEN}✅ Smoke tests passed${NC}"
    else
        echo -e "${YELLOW}⚠️  Smoke tests script not found${NC}"
    fi
}

# Function to display deployment summary
display_summary() {
    echo -e "${GREEN}🎉 Deployment Summary${NC}"
    echo -e "${BLUE}===================${NC}"
    
    # Get service information
    kubectl get pods -n $NAMESPACE
    echo ""
    kubectl get services -n $NAMESPACE
    echo ""
    kubectl get ingress -n $NAMESPACE
    
    # Display URLs
    BACKEND_URL=$(kubectl get ingress ai-interview-ingress -n $NAMESPACE -o jsonpath='{.spec.rules[1].host}')
    FRONTEND_URL=$(kubectl get ingress ai-interview-ingress -n $NAMESPACE -o jsonpath='{.spec.rules[0].host}')
    
    echo -e "${GREEN}🌐 Application URLs:${NC}"
    echo -e "Frontend: https://$FRONTEND_URL"
    echo -e "Backend API: https://$BACKEND_URL"
    echo -e "Monitoring: http://your-monitoring-url:3001"
    
    echo -e "${GREEN}✅ Production deployment completed successfully!${NC}"
}

# Function to rollback deployment
rollback_deployment() {
    echo -e "${YELLOW}🔄 Rolling back deployment...${NC}"
    
    kubectl rollout undo deployment/backend -n $NAMESPACE
    kubectl rollout undo deployment/frontend -n $NAMESPACE
    
    echo -e "${GREEN}✅ Rollback completed${NC}"
}

# Main deployment function
deploy() {
    check_prerequisites
    create_namespace
    deploy_secrets
    build_and_push_images
    deploy_database
    deploy_redis
    deploy_backend
    run_migrations
    deploy_frontend
    deploy_ingress
    deploy_monitoring
    run_health_checks
    run_smoke_tests
    display_summary
}

# Error handling
trap 'echo -e "${RED}❌ Deployment failed. Running rollback...${NC}"; rollback_deployment; exit 1' ERR

# Parse command line arguments
case "${2:-deploy}" in
    "deploy")
        deploy
        ;;
    "rollback")
        rollback_deployment
        ;;
    "health-check")
        run_health_checks
        ;;
    "smoke-test")
        run_smoke_tests
        ;;
    *)
        echo "Usage: $0 <image-tag> [deploy|rollback|health-check|smoke-test]"
        echo "  image-tag: Docker image tag to deploy (default: latest)"
        echo "  action: deploy (default), rollback, health-check, smoke-test"
        exit 1
        ;;
esac