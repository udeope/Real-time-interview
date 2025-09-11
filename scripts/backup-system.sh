#!/bin/bash

# Automated Backup System for AI Interview Assistant
# Handles database backups, file backups, and disaster recovery

set -e

# Configuration
BACKUP_DIR="/backups"
S3_BUCKET="${BACKUP_S3_BUCKET:-ai-interview-backups}"
RETENTION_DAYS=30
ENCRYPTION_KEY="${BACKUP_ENCRYPTION_KEY}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${GREEN}🔄 AI Interview Assistant - Backup System${NC}"
echo -e "${YELLOW}Timestamp: ${TIMESTAMP}${NC}"

# Create backup directory
mkdir -p $BACKUP_DIR

# Function to backup PostgreSQL database
backup_database() {
    echo "📊 Backing up PostgreSQL database..."
    
    BACKUP_FILE="$BACKUP_DIR/postgres_backup_$TIMESTAMP.sql"
    
    # Create database dump
    docker exec postgres pg_dump -U $POSTGRES_USER -d $POSTGRES_DB > $BACKUP_FILE
    
    # Compress and encrypt
    gzip $BACKUP_FILE
    gpg --symmetric --cipher-algo AES256 --passphrase "$ENCRYPTION_KEY" ${BACKUP_FILE}.gz
    rm ${BACKUP_FILE}.gz
    
    echo -e "${GREEN}✅ Database backup completed: ${BACKUP_FILE}.gz.gpg${NC}"
}

# Function to backup Redis data
backup_redis() {
    echo "🗄️ Backing up Redis data..."
    
    BACKUP_FILE="$BACKUP_DIR/redis_backup_$TIMESTAMP.rdb"
    
    # Create Redis backup
    docker exec redis redis-cli BGSAVE
    sleep 5
    docker cp redis:/data/dump.rdb $BACKUP_FILE
    
    # Compress and encrypt
    gzip $BACKUP_FILE
    gpg --symmetric --cipher-algo AES256 --passphrase "$ENCRYPTION_KEY" ${BACKUP_FILE}.gz
    rm ${BACKUP_FILE}.gz
    
    echo -e "${GREEN}✅ Redis backup completed: ${BACKUP_FILE}.gz.gpg${NC}"
}

# Function to backup application files
backup_application_files() {
    echo "📁 Backing up application files..."
    
    BACKUP_FILE="$BACKUP_DIR/app_files_backup_$TIMESTAMP.tar"
    
    # Create tar archive of important files
    tar -cf $BACKUP_FILE \
        --exclude='node_modules' \
        --exclude='.git' \
        --exclude='dist' \
        --exclude='.next' \
        --exclude='coverage' \
        .
    
    # Compress and encrypt
    gzip $BACKUP_FILE
    gpg --symmetric --cipher-algo AES256 --passphrase "$ENCRYPTION_KEY" ${BACKUP_FILE}.gz
    rm ${BACKUP_FILE}.gz
    
    echo -e "${GREEN}✅ Application files backup completed: ${BACKUP_FILE}.gz.gpg${NC}"
}

# Function to backup configuration files
backup_configurations() {
    echo "⚙️ Backing up configuration files..."
    
    BACKUP_FILE="$BACKUP_DIR/config_backup_$TIMESTAMP.tar"
    
    # Create tar archive of configuration files
    tar -cf $BACKUP_FILE \
        docker-compose*.yml \
        nginx/ \
        monitoring/ \
        scripts/ \
        .env* \
        k8s/ 2>/dev/null || true
    
    # Compress and encrypt
    gzip $BACKUP_FILE
    gpg --symmetric --cipher-algo AES256 --passphrase "$ENCRYPTION_KEY" ${BACKUP_FILE}.gz
    rm ${BACKUP_FILE}.gz
    
    echo -e "${GREEN}✅ Configuration backup completed: ${BACKUP_FILE}.gz.gpg${NC}"
}

# Function to upload backups to S3
upload_to_s3() {
    echo "☁️ Uploading backups to S3..."
    
    for file in $BACKUP_DIR/*_$TIMESTAMP.*.gpg; do
        if [ -f "$file" ]; then
            filename=$(basename "$file")
            aws s3 cp "$file" "s3://$S3_BUCKET/$(date +%Y/%m/%d)/$filename"
            echo -e "${GREEN}✅ Uploaded: $filename${NC}"
        fi
    done
}

# Function to cleanup old backups
cleanup_old_backups() {
    echo "🧹 Cleaning up old backups..."
    
    # Remove local backups older than retention period
    find $BACKUP_DIR -name "*.gpg" -mtime +$RETENTION_DAYS -delete
    
    # Remove old S3 backups
    aws s3 ls s3://$S3_BUCKET/ --recursive | while read -r line; do
        createDate=$(echo $line | awk '{print $1" "$2}')
        createDate=$(date -d "$createDate" +%s)
        olderThan=$(date -d "$RETENTION_DAYS days ago" +%s)
        
        if [[ $createDate -lt $olderThan ]]; then
            fileName=$(echo $line | awk '{print $4}')
            if [[ $fileName != "" ]]; then
                aws s3 rm s3://$S3_BUCKET/$fileName
                echo -e "${YELLOW}Removed old backup: $fileName${NC}"
            fi
        fi
    done
    
    echo -e "${GREEN}✅ Cleanup completed${NC}"
}

# Function to verify backup integrity
verify_backups() {
    echo "🔍 Verifying backup integrity..."
    
    for file in $BACKUP_DIR/*_$TIMESTAMP.*.gpg; do
        if [ -f "$file" ]; then
            if gpg --batch --passphrase "$ENCRYPTION_KEY" --decrypt "$file" > /dev/null 2>&1; then
                echo -e "${GREEN}✅ Verified: $(basename "$file")${NC}"
            else
                echo -e "${RED}❌ Verification failed: $(basename "$file")${NC}"
                exit 1
            fi
        fi
    done
}

# Function to create backup manifest
create_manifest() {
    echo "📋 Creating backup manifest..."
    
    MANIFEST_FILE="$BACKUP_DIR/backup_manifest_$TIMESTAMP.json"
    
    cat > $MANIFEST_FILE << EOF
{
  "timestamp": "$TIMESTAMP",
  "date": "$(date -Iseconds)",
  "environment": "${NODE_ENV:-production}",
  "version": "$(git rev-parse HEAD 2>/dev/null || echo 'unknown')",
  "files": [
EOF

    first=true
    for file in $BACKUP_DIR/*_$TIMESTAMP.*.gpg; do
        if [ -f "$file" ]; then
            if [ "$first" = true ]; then
                first=false
            else
                echo "," >> $MANIFEST_FILE
            fi
            filename=$(basename "$file")
            filesize=$(stat -f%z "$file" 2>/dev/null || stat -c%s "$file")
            checksum=$(sha256sum "$file" | cut -d' ' -f1)
            
            cat >> $MANIFEST_FILE << EOF
    {
      "name": "$filename",
      "size": $filesize,
      "checksum": "$checksum"
    }
EOF
        fi
    done

    cat >> $MANIFEST_FILE << EOF
  ]
}
EOF

    # Upload manifest to S3
    aws s3 cp "$MANIFEST_FILE" "s3://$S3_BUCKET/$(date +%Y/%m/%d)/backup_manifest_$TIMESTAMP.json"
    
    echo -e "${GREEN}✅ Backup manifest created and uploaded${NC}"
}

# Function to send notification
send_notification() {
    local status=$1
    local message=$2
    
    if [ "$status" = "success" ]; then
        echo -e "${GREEN}📧 Sending success notification...${NC}"
        # Add notification logic here (Slack, email, etc.)
    else
        echo -e "${RED}📧 Sending failure notification...${NC}"
        # Add failure notification logic here
    fi
}

# Main backup execution
main() {
    local backup_type=${1:-"full"}
    
    case $backup_type in
        "database")
            backup_database
            ;;
        "redis")
            backup_redis
            ;;
        "files")
            backup_application_files
            backup_configurations
            ;;
        "full")
            backup_database
            backup_redis
            backup_application_files
            backup_configurations
            ;;
        *)
            echo "Usage: $0 [database|redis|files|full]"
            exit 1
            ;;
    esac
    
    verify_backups
    upload_to_s3
    create_manifest
    cleanup_old_backups
    
    send_notification "success" "Backup completed successfully"
    echo -e "${GREEN}🎉 Backup process completed successfully!${NC}"
}

# Error handling
trap 'send_notification "failure" "Backup failed"; exit 1' ERR

# Execute main function
main "$@"