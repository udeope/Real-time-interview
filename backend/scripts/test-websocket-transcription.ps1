#!/usr/bin/env pwsh

<#
.SYNOPSIS
    Test script for WebSocket transcription integration
.DESCRIPTION
    This script tests the WebSocket transcription integration by running the Node.js test script
.EXAMPLE
    .\test-websocket-transcription.ps1
#>

param(
    [string]$ServerUrl = "http://localhost:3001",
    [string]$JwtSecret = $env:JWT_SECRET
)

Write-Host "🚀 WebSocket Transcription Integration Test" -ForegroundColor Green
Write-Host "=" * 50

# Check if Node.js is available
try {
    $nodeVersion = node --version
    Write-Host "✅ Node.js version: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Node.js is not installed or not in PATH" -ForegroundColor Red
    exit 1
}

# Check if the backend server is running
Write-Host "🔍 Checking if backend server is running..." -ForegroundColor Yellow

try {
    $response = Invoke-WebRequest -Uri "$ServerUrl/health" -Method GET -TimeoutSec 5 -ErrorAction Stop
    Write-Host "✅ Backend server is running" -ForegroundColor Green
} catch {
    Write-Host "❌ Backend server is not running at $ServerUrl" -ForegroundColor Red
    Write-Host "Please start the backend server first with: npm run start:dev" -ForegroundColor Yellow
    exit 1
}

# Set environment variables
$env:SERVER_URL = $ServerUrl
if ($JwtSecret) {
    $env:JWT_SECRET = $JwtSecret
} else {
    Write-Host "⚠️  JWT_SECRET not provided, using default" -ForegroundColor Yellow
}

# Change to backend directory
$backendDir = Split-Path -Parent $PSScriptRoot
Push-Location $backendDir

try {
    Write-Host "📁 Working directory: $(Get-Location)" -ForegroundColor Cyan
    
    # Install dependencies if needed
    if (-not (Test-Path "node_modules")) {
        Write-Host "📦 Installing dependencies..." -ForegroundColor Yellow
        npm install
        if ($LASTEXITCODE -ne 0) {
            throw "Failed to install dependencies"
        }
    }
    
    # Run the test script
    Write-Host "🧪 Running WebSocket transcription tests..." -ForegroundColor Cyan
    node scripts/test-websocket-transcription.js
    
    $exitCode = $LASTEXITCODE
    
    if ($exitCode -eq 0) {
        Write-Host "`n🎉 All tests passed successfully!" -ForegroundColor Green
    } else {
        Write-Host "`n❌ Some tests failed (exit code: $exitCode)" -ForegroundColor Red
    }
    
    exit $exitCode
    
} catch {
    Write-Host "❌ Error running tests: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
} finally {
    Pop-Location
}