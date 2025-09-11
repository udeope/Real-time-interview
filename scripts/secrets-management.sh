#!/bin/bash

# Secrets Management Script for Production Deployment
# This script handles secure environment variable management

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
VAULT_ADDR=${VAULT_ADDR:-"https://vault.yourdomain.com"}
ENVIRONMENT=${1:-"production"}
SECRET_PATH="secret/ai-interview/${ENVIRONMENT}"

echo -e "${GREEN}🔐 AI Interview Assistant - Secrets Management${NC}"
echo -e "${YELLOW}Environment: ${ENVIRONMENT}${NC}"

# Function to check if required tools are installed
check_dependencies() {
    echo "Checking dependencies..."
    
    if ! command -v vault &> /dev/null; then
        echo -e "${RED}❌ HashiCorp Vault CLI not found. Please install it.${NC}"
        exit 1
    fi
    
    if ! command -v aws &> /dev/null; then
        echo -e "${RED}❌ AWS CLI not found. Please install it.${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}✅ All dependencies found${NC}"
}

# Function to authenticate with Vault
vault_auth() {
    echo "Authenticating with Vault..."
    
    if [ -z "$VAULT_TOKEN" ]; then
        echo -e "${YELLOW}Please enter your Vault token:${NC}"
        read -s VAULT_TOKEN
        export VAULT_TOKEN
    fi
    
    vault auth -method=token token=$VAULT_TOKEN
    echo -e "${GREEN}✅ Vault authentication successful${NC}"
}

# Function to retrieve secrets from Vault
get_secrets() {
    echo "Retrieving secrets from Vault..."
    
    # Database secrets
    DB_PASSWORD=$(vault kv get -field=password ${SECRET_PATH}/database)
    JWT_SECRET=$(vault kv get -field=jwt_secret ${SECRET_PATH}/auth)
    
    # API Keys
    GOOGLE_STT_API_KEY=$(vault kv get -field=api_key ${SECRET_PATH}/google-stt)
    OPENAI_API_KEY=$(vault kv get -field=api_key ${SECRET_PATH}/openai)
    WHISPER_API_KEY=$(vault kv get -field=api_key ${SECRET_PATH}/whisper)
    
    # External integrations
    LINKEDIN_CLIENT_SECRET=$(vault kv get -field=client_secret ${SECRET_PATH}/linkedin)
    GOOGLE_CALENDAR_CLIENT_SECRET=$(vault kv get -field=client_secret ${SECRET_PATH}/google-calendar)
    
    # AWS credentials
    AWS_ACCESS_KEY_ID=$(vault kv get -field=access_key_id ${SECRET_PATH}/aws)
    AWS_SECRET_ACCESS_KEY=$(vault kv get -field=secret_access_key ${SECRET_PATH}/aws)
    
    echo -e "${GREEN}✅ Secrets retrieved successfully${NC}"
}

# Function to create environment file
create_env_file() {
    echo "Creating environment file..."
    
    ENV_FILE=".env.${ENVIRONMENT}.secrets"
    
    cat > $ENV_FILE << EOF
# Auto-generated secrets file for ${ENVIRONMENT}
# Generated on: $(date)

# Database
POSTGRES_PASSWORD=${DB_PASSWORD}

# Authentication
JWT_SECRET=${JWT_SECRET}

# AI Services
GOOGLE_STT_API_KEY=${GOOGLE_STT_API_KEY}
OPENAI_API_KEY=${OPENAI_API_KEY}
WHISPER_API_KEY=${WHISPER_API_KEY}

# External Integrations
LINKEDIN_CLIENT_SECRET=${LINKEDIN_CLIENT_SECRET}
GOOGLE_CALENDAR_CLIENT_SECRET=${GOOGLE_CALENDAR_CLIENT_SECRET}

# AWS
AWS_ACCESS_KEY_ID=${AWS_ACCESS_KEY_ID}
AWS_SECRET_ACCESS_KEY=${AWS_SECRET_ACCESS_KEY}
EOF

    chmod 600 $ENV_FILE
    echo -e "${GREEN}✅ Environment file created: ${ENV_FILE}${NC}"
}

# Function to deploy secrets to Kubernetes
deploy_k8s_secrets() {
    echo "Deploying secrets to Kubernetes..."
    
    kubectl create secret generic ai-interview-secrets \
        --from-literal=postgres-password="${DB_PASSWORD}" \
        --from-literal=jwt-secret="${JWT_SECRET}" \
        --from-literal=google-stt-api-key="${GOOGLE_STT_API_KEY}" \
        --from-literal=openai-api-key="${OPENAI_API_KEY}" \
        --from-literal=whisper-api-key="${WHISPER_API_KEY}" \
        --from-literal=linkedin-client-secret="${LINKEDIN_CLIENT_SECRET}" \
        --from-literal=google-calendar-client-secret="${GOOGLE_CALENDAR_CLIENT_SECRET}" \
        --from-literal=aws-access-key-id="${AWS_ACCESS_KEY_ID}" \
        --from-literal=aws-secret-access-key="${AWS_SECRET_ACCESS_KEY}" \
        --namespace=ai-interview-${ENVIRONMENT} \
        --dry-run=client -o yaml | kubectl apply -f -
    
    echo -e "${GREEN}✅ Kubernetes secrets deployed${NC}"
}

# Function to rotate secrets
rotate_secrets() {
    echo "Rotating secrets..."
    
    # Generate new JWT secret
    NEW_JWT_SECRET=$(openssl rand -base64 32)
    vault kv put ${SECRET_PATH}/auth jwt_secret="${NEW_JWT_SECRET}"
    
    # Generate new database password
    NEW_DB_PASSWORD=$(openssl rand -base64 24)
    vault kv put ${SECRET_PATH}/database password="${NEW_DB_PASSWORD}"
    
    echo -e "${GREEN}✅ Secrets rotated successfully${NC}"
    echo -e "${YELLOW}⚠️  Remember to update the database and restart services${NC}"
}

# Function to backup secrets
backup_secrets() {
    echo "Backing up secrets..."
    
    BACKUP_FILE="secrets-backup-${ENVIRONMENT}-$(date +%Y%m%d-%H%M%S).json"
    
    vault kv get -format=json ${SECRET_PATH} > $BACKUP_FILE
    
    # Encrypt backup
    gpg --symmetric --cipher-algo AES256 $BACKUP_FILE
    rm $BACKUP_FILE
    
    echo -e "${GREEN}✅ Secrets backed up to ${BACKUP_FILE}.gpg${NC}"
}

# Main execution
case "${2:-deploy}" in
    "deploy")
        check_dependencies
        vault_auth
        get_secrets
        create_env_file
        if command -v kubectl &> /dev/null; then
            deploy_k8s_secrets
        fi
        ;;
    "rotate")
        check_dependencies
        vault_auth
        rotate_secrets
        ;;
    "backup")
        check_dependencies
        vault_auth
        backup_secrets
        ;;
    *)
        echo "Usage: $0 <environment> [deploy|rotate|backup]"
        echo "  environment: production, staging, development"
        echo "  action: deploy (default), rotate, backup"
        exit 1
        ;;
esac

echo -e "${GREEN}🎉 Secrets management completed successfully!${NC}"