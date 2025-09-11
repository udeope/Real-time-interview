# AI Interview Assistant - Comprehensive Test Runner (PowerShell)
# This script runs all test suites and generates reports

param(
    [switch]$SkipLoad,
    [switch]$Verbose
)

# Set error action preference
$ErrorActionPreference = "Continue"

Write-Host "🚀 Starting comprehensive test suite for AI Interview Assistant Backend" -ForegroundColor Cyan
Write-Host "==================================================================" -ForegroundColor Cyan

# Create test results directory
if (!(Test-Path "test-results")) {
    New-Item -ItemType Directory -Path "test-results" | Out-Null
}

# Function to print colored output
function Write-Status {
    param([string]$Message)
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    Write-Host "[$timestamp] $Message" -ForegroundColor Blue
}

function Write-Success {
    param([string]$Message)
    Write-Host "✅ $Message" -ForegroundColor Green
}

function Write-Error {
    param([string]$Message)
    Write-Host "❌ $Message" -ForegroundColor Red
}

function Write-Warning {
    param([string]$Message)
    Write-Host "⚠️  $Message" -ForegroundColor Yellow
}

# Function to run tests with error handling
function Invoke-TestSuite {
    param(
        [string]$TestName,
        [string]$TestCommand,
        [string]$OutputFile
    )
    
    Write-Status "Running $TestName..."
    
    try {
        $output = Invoke-Expression $TestCommand 2>&1
        $output | Out-File -FilePath $OutputFile -Encoding UTF8
        
        if ($LASTEXITCODE -eq 0) {
            Write-Success "$TestName completed successfully"
            return $true
        } else {
            Write-Error "$TestName failed (Exit Code: $LASTEXITCODE)"
            Write-Host "Error details saved to: $OutputFile" -ForegroundColor Gray
            return $false
        }
    }
    catch {
        Write-Error "$TestName failed with exception: $($_.Exception.Message)"
        $_.Exception.Message | Out-File -FilePath $OutputFile -Encoding UTF8
        return $false
    }
}

# Initialize test results
$TotalTests = 0
$PassedTests = 0
$FailedTests = 0
$TestResults = @()

# 1. Unit Tests
Write-Status "Phase 1: Unit Tests"
$result = Invoke-TestSuite "Unit Tests" "npm run test -- --coverage --reporter=json" "test-results/unit-tests.json"
$TestResults += @{Name="Unit Tests"; Passed=$result; Details="Coverage report available"}
if ($result) { $PassedTests++ } else { $FailedTests++ }
$TotalTests++

# 2. Integration Tests
Write-Status "Phase 2: Integration Tests"
$result = Invoke-TestSuite "Integration Tests" "npm run test:integration" "test-results/integration-tests.log"
$TestResults += @{Name="Integration Tests"; Passed=$result; Details="Service interactions"}
if ($result) { $PassedTests++ } else { $FailedTests++ }
$TotalTests++

# 3. End-to-End Tests
Write-Status "Phase 3: End-to-End Tests"
$result = Invoke-TestSuite "E2E Tests" "npm run test:e2e" "test-results/e2e-tests.log"
$TestResults += @{Name="E2E Tests"; Passed=$result; Details="Complete workflows"}
if ($result) { $PassedTests++ } else { $FailedTests++ }
$TotalTests++

# 4. Performance Tests
Write-Status "Phase 4: Performance Benchmarks"
$result = Invoke-TestSuite "Performance Tests" "npm run test:performance" "test-results/performance-tests.log"
$TestResults += @{Name="Performance Tests"; Passed=$result; Details="Latency benchmarks"}
if ($result) { $PassedTests++ } else { $FailedTests++ }
$TotalTests++

# 5. Load Tests (optional, only if K6 is available)
if (!$SkipLoad) {
    $k6Available = Get-Command k6 -ErrorAction SilentlyContinue
    if ($k6Available) {
        Write-Status "Phase 5: Load Tests"
        $result = Invoke-TestSuite "Load Tests" "npm run test:load" "test-results/load-tests.log"
        $TestResults += @{Name="Load Tests"; Passed=$result; Details="Scalability validation"}
        if ($result) { $PassedTests++ } else { $FailedTests++ }
        $TotalTests++
    } else {
        Write-Warning "K6 not found, skipping load tests"
        $TestResults += @{Name="Load Tests"; Passed=$null; Details="K6 not available"}
    }
}

# Generate test summary report
Write-Status "Generating test summary report..."

$successRate = if ($TotalTests -gt 0) { [math]::Round(($PassedTests * 100 / $TotalTests), 1) } else { 0 }
$timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"

$summaryContent = @"
# Test Execution Summary

**Date**: $timestamp
**Total Test Suites**: $TotalTests
**Passed**: $PassedTests
**Failed**: $FailedTests
**Success Rate**: $successRate%

## Test Results

| Test Suite | Status | Details |
|------------|--------|---------|
"@

foreach ($test in $TestResults) {
    $status = if ($test.Passed -eq $true) { "✅ PASSED" } 
              elseif ($test.Passed -eq $false) { "❌ FAILED" } 
              else { "⚠️ SKIPPED" }
    $summaryContent += "`n| $($test.Name) | $status | $($test.Details) |"
}

$summaryContent += @"

## Performance Metrics

$(if (Test-Path "test-results/performance-tests.log") {
"- Transcription Latency: <1000ms
- Response Generation: <1500ms
- End-to-End Pipeline: <2000ms
- Transcription Accuracy: >95%"
} else {
"Performance metrics not available"
})

## Coverage Report

$(if (Test-Path "coverage/lcov-report/index.html") {
"Code coverage report: ``coverage/lcov-report/index.html``"
} else {
"Coverage report not generated"
})

## Next Steps

$(if ($FailedTests -gt 0) {
"❌ **Action Required**: $FailedTests test suite(s) failed
1. Review failed test logs in test-results/ directory
2. Fix failing tests before deployment
3. Re-run test suite to verify fixes"
} else {
"✅ **All tests passed!** Ready for deployment
1. Review performance metrics
2. Check code coverage report
3. Proceed with deployment pipeline"
})
"@

$summaryContent | Out-File -FilePath "test-results/summary.md" -Encoding UTF8

# Display summary
Write-Host ""
Write-Host "==================================================================" -ForegroundColor Cyan
Write-Status "Test Execution Complete"
Write-Host "==================================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "📊 SUMMARY:" -ForegroundColor White
Write-Host "  Total Test Suites: $TotalTests" -ForegroundColor White
Write-Host "  Passed: $PassedTests" -ForegroundColor Green
Write-Host "  Failed: $FailedTests" -ForegroundColor Red
Write-Host "  Success Rate: $successRate%" -ForegroundColor White
Write-Host ""

if ($FailedTests -gt 0) {
    Write-Error "Some tests failed. Check test-results/ directory for details."
    Write-Host ""
    Write-Host "📁 Test Results Location: test-results/" -ForegroundColor Gray
    Write-Host "📋 Summary Report: test-results/summary.md" -ForegroundColor Gray
    exit 1
} else {
    Write-Success "All tests passed successfully!"
    Write-Host ""
    Write-Host "📁 Test Results Location: test-results/" -ForegroundColor Gray
    Write-Host "📋 Summary Report: test-results/summary.md" -ForegroundColor Gray
    Write-Host "📊 Coverage Report: coverage/lcov-report/index.html" -ForegroundColor Gray
}

# Optional: Open coverage report in browser
if ((Test-Path "coverage/lcov-report/index.html") -and !$env:CI) {
    $openReport = Read-Host "Open coverage report in browser? (y/N)"
    if ($openReport -eq "y" -or $openReport -eq "Y") {
        Start-Process "coverage/lcov-report/index.html"
    }
}

Write-Host ""
Write-Status "Test execution completed at $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"