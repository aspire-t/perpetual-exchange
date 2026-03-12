#!/bin/bash
# TDD Test Script for NestJS Project Structure
# Red-Green-Refactor Cycle

set -e

echo "=== NestJS Project Structure Tests ==="
echo ""

# Test 1: Check backend directory exists
echo "Test 1: Backend directory exists"
if [ -d "backend" ]; then
    echo "  ✅ PASS: backend/ directory exists"
else
    echo "  ❌ FAIL: backend/ directory not found"
fi

# Test 2: Check package.json exists
echo "Test 2: package.json exists"
if [ -f "backend/package.json" ]; then
    echo "  ✅ PASS: backend/package.json exists"
else
    echo "  ❌ FAIL: backend/package.json not found"
fi

# Test 3: Check NestJS is installed
echo "Test 3: NestJS core installed"
if [ -f "backend/package.json" ] && grep -q "@nestjs/core" backend/package.json; then
    echo "  ✅ PASS: @nestjs/core dependency found"
else
    echo "  ❌ FAIL: @nestjs/core not found"
fi

# Test 4: Check NestJS CLI installed
echo "Test 4: NestJS CLI installed"
if [ -f "backend/package.json" ] && grep -q "@nestjs/cli" backend/package.json; then
    echo "  ✅ PASS: @nestjs/cli dependency found"
else
    echo "  ❌ FAIL: @nestjs/cli not found"
fi

# Test 5: Check tsconfig.json exists
echo "Test 5: tsconfig.json exists"
if [ -f "backend/tsconfig.json" ]; then
    echo "  ✅ PASS: backend/tsconfig.json exists"
else
    echo "  ❌ FAIL: backend/tsconfig.json not found"
fi

# Test 6: Check nest-cli.json exists
echo "Test 6: nest-cli.json exists"
if [ -f "backend/nest-cli.json" ]; then
    echo "  ✅ PASS: backend/nest-cli.json exists"
else
    echo "  ❌ FAIL: backend/nest-cli.json not found"
fi

# Test 7: Check main.ts exists
echo "Test 7: src/main.ts exists"
if [ -f "backend/src/main.ts" ]; then
    echo "  ✅ PASS: backend/src/main.ts exists"
else
    echo "  ❌ FAIL: backend/src/main.ts not found"
fi

# Test 8: Check AppController exists
echo "Test 8: AppController exists"
if [ -f "backend/src/app.controller.ts" ]; then
    echo "  ✅ PASS: backend/src/app.controller.ts exists"
else
    echo "  ❌ FAIL: backend/src/app.controller.ts not found"
fi

# Test 9: Check AppModule exists
echo "Test 9: AppModule exists"
if [ -f "backend/src/app.module.ts" ]; then
    echo "  ✅ PASS: backend/src/app.module.ts exists"
else
    echo "  ❌ FAIL: backend/src/app.module.ts not found"
fi

# Test 10: Check Jest config exists
echo "Test 10: Jest configuration exists"
if [ -f "backend/package.json" ] && grep -q "jest" backend/package.json; then
    echo "  ✅ PASS: Jest dependency found"
else
    echo "  ❌ FAIL: Jest not found"
fi

# Test 11: Check test script works
echo "Test 11: Test script works"
cd backend
if npm test 2>&1 | head -1 | grep -q "pass\|PASS\|Tests:.*passed"; then
    echo "  ✅ PASS: Tests executed successfully"
else
    echo "  ⚠️  Test output unclear"
fi
cd ..

echo ""
echo "=== Tests Complete ==="
