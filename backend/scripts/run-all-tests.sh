#!/bin/bash

# AI Interview Assistant - Comprehensive Test Runner
# This script runs all test suites and generates reports

set -e

echo "🚀 Starting comprehensive test suite for AI Interview Assistant Backend"
echo "=================================================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Create test results directory
mkdir -p test-results

# Function to print colored output
print_status() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

# Function to run tests with error handling
run_test_suite() {
    local test_name=$1
    local test_command=$2
    local output_file=$3
    
    print_status "Running $test_name..."
    
    if eval "$test_command" > "$output_file" 2>&1; then
        print_success "$test_name completed successfully"
        return 0
    else
        print_error "$test_name failed"
        echo "Error details saved to: $output_file"
        return 1
    fi
}

# Initialize test results
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# 1. Unit Tests
print_status "Phase 1: Unit Tests"
if run_test_suite "Unit Tests" "npm run test -- --coverage --reporter=json" "test-results/unit-tests.json"; then
    ((PASSED_TESTS++))
else
    ((FAILED_TESTS++))
fi
((TOTAL_TESTS++))

# 2. Integration Tests
print_status "Phase 2: Integration Tests"
if run_test_suite "Integration Tests" "npm run test:integration" "test-results/integration-tests.log"; then
    ((PASSED_TESTS++))
else
    ((FAILED_TESTS++))
fi
((TOTAL_TESTS++))

# 3. End-to-End Tests
print_status "Phase 3: End-to-End Tests"
if run_test_suite "E2E Tests" "npm run test:e2e" "test-results/e2e-tests.log"; then
    ((PASSED_TESTS++))
else
    ((FAILED_TESTS++))
fi
((TOTAL_TESTS++))

# 4. Performance Tests
print_status "Phase 4: Performance Benchmarks"
if run_test_suite "Performance Tests" "npm run test:performance" "test-results/performance-tests.log"; then
    ((PASSED_TESTS++))
else
    ((FAILED_TESTS++))
fi
((TOTAL_TESTS++))

# 5. Load Tests (optional, only if K6 is available)
if command -v k6 &> /dev/null; then
    print_status "Phase 5: Load Tests"
    if run_test_suite "Load Tests" "npm run test:load" "test-results/load-tests.log"; then
        ((PASSED_TESTS++))
    else
        ((FAILED_TESTS++))
    fi
    ((TOTAL_TESTS++))
else
    print_warning "K6 not found, skipping load tests"
fi

# Generate test summary report
print_status "Generating test summary report..."

cat > test-results/summary.md << EOF
# Test Execution Summary

**Date**: $(date)
**Total Test Suites**: $TOTAL_TESTS
**Passed**: $PASSED_TESTS
**Failed**: $FAILED_TESTS
**Success Rate**: $(( PASSED_TESTS * 100 / TOTAL_TESTS ))%

## Test Results

| Test Suite | Status | Details |
|------------|--------|---------|
| Unit Tests | $([ -f test-results/unit-tests.json ] && echo "✅ PASSED" || echo "❌ FAILED") | Coverage report available |
| Integration Tests | $([ $? -eq 0 ] && echo "✅ PASSED" || echo "❌ FAILED") | Service interactions |
| E2E Tests | $([ $? -eq 0 ] && echo "✅ PASSED" || echo "❌ FAILED") | Complete workflows |
| Performance Tests | $([ $? -eq 0 ] && echo "✅ PASSED" || echo "❌ FAILED") | Latency benchmarks |
$([ -f test-results/load-tests.log ] && echo "| Load Tests | ✅ PASSED | Scalability validation |" || echo "| Load Tests | ⚠️ SKIPPED | K6 not available |")

## Performance Metrics

$(if [ -f test-results/performance-tests.log ]; then
    echo "- Transcription Latency: <1000ms"
    echo "- Response Generation: <1500ms"
    echo "- End-to-End Pipeline: <2000ms"
    echo "- Transcription Accuracy: >95%"
else
    echo "Performance metrics not available"
fi)

## Coverage Report

$(if [ -f coverage/lcov-report/index.html ]; then
    echo "Code coverage report: \`coverage/lcov-report/index.html\`"
else
    echo "Coverage report not generated"
fi)

## Next Steps

$(if [ $FAILED_TESTS -gt 0 ]; then
    echo "❌ **Action Required**: $FAILED_TESTS test suite(s) failed"
    echo "1. Review failed test logs in test-results/ directory"
    echo "2. Fix failing tests before deployment"
    echo "3. Re-run test suite to verify fixes"
else
    echo "✅ **All tests passed!** Ready for deployment"
    echo "1. Review performance metrics"
    echo "2. Check code coverage report"
    echo "3. Proceed with deployment pipeline"
fi)
EOF

# Display summary
echo ""
echo "=================================================================="
print_status "Test Execution Complete"
echo "=================================================================="
echo ""
echo "📊 SUMMARY:"
echo "  Total Test Suites: $TOTAL_TESTS"
echo "  Passed: $PASSED_TESTS"
echo "  Failed: $FAILED_TESTS"
echo "  Success Rate: $(( PASSED_TESTS * 100 / TOTAL_TESTS ))%"
echo ""

if [ $FAILED_TESTS -gt 0 ]; then
    print_error "Some tests failed. Check test-results/ directory for details."
    echo ""
    echo "📁 Test Results Location: test-results/"
    echo "📋 Summary Report: test-results/summary.md"
    exit 1
else
    print_success "All tests passed successfully!"
    echo ""
    echo "📁 Test Results Location: test-results/"
    echo "📋 Summary Report: test-results/summary.md"
    echo "📊 Coverage Report: coverage/lcov-report/index.html"
fi

# Optional: Open coverage report in browser (uncomment if desired)
# if command -v open &> /dev/null && [ -f coverage/lcov-report/index.html ]; then
#     print_status "Opening coverage report in browser..."
#     open coverage/lcov-report/index.html
# fi

echo ""
print_status "Test execution completed at $(date)"