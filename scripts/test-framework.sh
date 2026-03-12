#!/bin/bash
# TDD Test Script for Test Framework Setup
# Red-Green-Refactor Cycle

set -e

echo "=== Test Framework Setup Tests ==="
echo ""

# Test 1: Check Jest config exists for backend
echo "Test 1: Jest config exists for backend"
if [ -f "backend/jest.config.ts" ]; then
    echo "  ✅ PASS: backend/jest.config.ts exists"
else
    echo "  ❌ FAIL: backend/jest.config.ts not found"
fi

# Test 2: Check Playwright config exists
echo "Test 2: Playwright config exists"
if [ -f "playwright.config.ts" ]; then
    echo "  ✅ PASS: playwright.config.ts exists"
else
    echo "  ❌ FAIL: playwright.config.ts not found"
fi

# Test 3: Check test strategy document exists
echo "Test 3: Test strategy document exists"
if [ -f "docs/TEST_STRATEGY.md" ]; then
    echo "  ✅ PASS: docs/TEST_STRATEGY.md exists"
else
    echo "  ❌ FAIL: docs/TEST_STRATEGY.md not found"
fi

# Test 4: Check e2e directory exists
echo "Test 4: E2E directory exists"
if [ -d "e2e" ]; then
    echo "  ✅ PASS: e2e/ directory exists"
else
    echo "  ❌ FAIL: e2e/ directory not found"
fi

# Test 5: Check E2E test script exists
echo "Test 5: E2E test script exists"
if [ -f "scripts/test-e2e.sh" ]; then
    echo "  ✅ PASS: scripts/test-e2e.sh exists"
else
    echo "  ❌ FAIL: scripts/test-e2e.sh not found"
fi

# Test 6: Check backend test script exists
echo "Test 6: Backend test script exists (npm test)"
if [ -f "backend/package.json" ] && grep -q '"test"' backend/package.json; then
    echo "  ✅ PASS: npm test script defined in backend"
else
    echo "  ❌ FAIL: npm test script not found in backend"
fi

# Test 7: Check coverage configuration exists
echo "Test 7: Coverage configuration exists"
if [ -f "backend/jest.config.ts" ] && grep -q "coverageThreshold" backend/jest.config.ts; then
    echo "  ✅ PASS: Coverage threshold configured"
else
    echo "  ❌ FAIL: Coverage threshold not configured"
fi

echo ""
echo "=== Tests Complete ==="
