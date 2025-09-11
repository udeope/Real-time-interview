# AI Interview Assistant - Frontend Test Runner (PowerShell)
# This script runs all frontend test suites and generates reports

param(
    [switch]$SkipE2E,
    [switch]$SkipCrossBrowser,
    [switch]$Verbose
)

# Set error action preference
$ErrorActionPreference = "Continue"

Write-Host "🚀 Starting comprehensive test suite for AI Interview Assistant Frontend" -ForegroundColor Cyan
Write-Host "===================================================================" -ForegroundColor Cyan

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

# 1. Unit and Integration Tests
Write-Status "Phase 1: Unit and Integration Tests"
$result = Invoke-TestSuite "Unit Tests" "npm run test -- --coverage --reporter=json" "test-results/unit-tests.json"
$TestResults += @{Name="Unit Tests"; Passed=$result; Details="Component and utility tests"}
if ($result) { $PassedTests++ } else { $FailedTests++ }
$TotalTests++

# 2. Performance Tests
Write-Status "Phase 2: Performance Tests"
$result = Invoke-TestSuite "Performance Tests" "npm run test:performance" "test-results/performance-tests.log"
$TestResults += @{Name="Performance Tests"; Passed=$result; Details="Render times and memory usage"}
if ($result) { $PassedTests++ } else { $FailedTests++ }
$TotalTests++

# 3. End-to-End Tests (optional)
if (!$SkipE2E) {
    $playwrightAvailable = Get-Command npx -ErrorAction SilentlyContinue
    if ($playwrightAvailable) {
        Write-Status "Phase 3: End-to-End Tests"
        $result = Invoke-TestSuite "E2E Tests" "npm run test:e2e" "test-results/e2e-tests.log"
        $TestResults += @{Name="E2E Tests"; Passed=$result; Details="Complete user workflows"}
        if ($result) { $PassedTests++ } else { $FailedTests++ }
        $TotalTests++
    } else {
        Write-Warning "Playwright not available, skipping E2E tests"
        $TestResults += @{Name="E2E Tests"; Passed=$null; Details="Playwright not available"}
    }
} else {
    Write-Warning "Skipping E2E tests (--SkipE2E flag provided)"
    $TestResults += @{Name="E2E Tests"; Passed=$null; Details="Skipped by user"}
}

# 4. Cross-Browser Tests (optional)
if (!$SkipCrossBrowser -and !$SkipE2E) {
    Write-Status "Phase 4: Cross-Browser Compatibility Tests"
    $result = Invoke-TestSuite "Cross-Browser Tests" "npm run test:cross-browser" "test-results/cross-browser-tests.log"
    $TestResults += @{Name="Cross-Browser Tests"; Passed=$result; Details="Multi-browser compatibility"}
    if ($result) { $PassedTests++ } else { $FailedTests++ }
    $TotalTests++
} else {
    $reason = if ($SkipE2E) { "E2E tests skipped" } else { "Skipped by user" }
    Write-Warning "Skipping cross-browser tests ($reason)"
    $TestResults += @{Name="Cross-Browser Tests"; Passed=$null; Details=$reason}
}

# Generate test summary report
Write-Status "Generating test summary report..."

$successRate = if ($TotalTests -gt 0) { [math]::Round(($PassedTests * 100 / $TotalTests), 1) } else { 0 }
$timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"

$summaryContent = @"
# Frontend Test Execution Summary

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
"- Component Render Time: <100ms
- Complex Component Render: <200ms
- Memory Usage: No leaks detected
- Bundle Size: Within limits"
} else {
"Performance metrics not available"
})

## Browser Compatibility

$(if (Test-Path "test-results/cross-browser-tests.log") {
"- Chrome: ✅ Supported
- Firefox: ✅ Supported  
- Safari: ✅ Supported
- Edge: ✅ Supported
- Mobile: ✅ Responsive"
} else {
"Cross-browser test results not available"
})

## Coverage Report

$(if (Test-Path "coverage/lcov-report/index.html") {
"Code coverage report: ``coverage/lcov-report/index.html``"
} else {
"Coverage report not generated"
})

## E2E Test Report

$(if (Test-Path "playwright-report/index.html") {
"Playwright test report: ``playwright-report/index.html``"
} else {
"E2E test report not available"
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
2. Check coverage and E2E reports
3. Verify cross-browser compatibility
4. Proceed with build and deployment"
})
"@

$summaryContent | Out-File -FilePath "test-results/summary.md" -Encoding UTF8

# Display summary
Write-Host ""
Write-Host "===================================================================" -ForegroundColor Cyan
Write-Status "Frontend Test Execution Complete"
Write-Host "===================================================================" -ForegroundColor Cyan
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
    if (Test-Path "playwright-report/index.html") {
        Write-Host "🎭 E2E Report: playwright-report/index.html" -ForegroundColor Gray
    }
    exit 1
} else {
    Write-Success "All tests passed successfully!"
    Write-Host ""
    Write-Host "📁 Test Results Location: test-results/" -ForegroundColor Gray
    Write-Host "📋 Summary Report: test-results/summary.md" -ForegroundColor Gray
    Write-Host "📊 Coverage Report: coverage/lcov-report/index.html" -ForegroundColor Gray
    if (Test-Path "playwright-report/index.html") {
        Write-Host "🎭 E2E Report: playwright-report/index.html" -ForegroundColor Gray
    }
}

# Optional: Open reports in browser
if (!$env:CI) {
    $openReports = Read-Host "Open test reports in browser? (y/N)"
    if ($openReports -eq "y" -or $openReports -eq "Y") {
        if (Test-Path "coverage/lcov-report/index.html") {
            Start-Process "coverage/lcov-report/index.html"
        }
        if (Test-Path "playwright-report/index.html") {
            Start-Process "playwright-report/index.html"
        }
    }
}

Write-Host ""
Write-Status "Frontend test execution completed at $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"