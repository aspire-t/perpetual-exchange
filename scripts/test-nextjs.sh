#!/bin/bash
# TDD Test Script for Next.js Project Structure
# Red-Green-Refactor Cycle

set -e

echo "=== Next.js Project Structure Tests ==="
echo ""

# Test 1: Check frontend directory exists
echo "Test 1: Frontend directory exists"
if [ -d "frontend" ]; then
    echo "  ✅ PASS: frontend/ directory exists"
else
    echo "  ❌ FAIL: frontend/ directory not found"
fi

# Test 2: Check package.json exists
echo "Test 2: package.json exists"
if [ -f "frontend/package.json" ]; then
    echo "  ✅ PASS: frontend/package.json exists"
else
    echo "  ❌ FAIL: frontend/package.json not found"
fi

# Test 3: Check Next.js is installed
echo "Test 3: Next.js installed"
if [ -f "frontend/package.json" ] && grep -q "\"next\":" frontend/package.json; then
    echo "  ✅ PASS: next dependency found"
else
    echo "  ❌ FAIL: next not found"
fi

# Test 4: Check React is installed
echo "Test 4: React installed"
if [ -f "frontend/package.json" ] && grep -q "\"react\":" frontend/package.json; then
    echo "  ✅ PASS: react dependency found"
else
    echo "  ❌ FAIL: react not found"
fi

# Test 5: Check wagmi is installed
echo "Test 5: wagmi installed"
if [ -f "frontend/package.json" ] && grep -q "\"wagmi\":" frontend/package.json; then
    echo "  ✅ PASS: wagmi dependency found"
else
    echo "  ❌ FAIL: wagmi not found"
fi

# Test 6: Check viem is installed
echo "Test 6: viem installed"
if [ -f "frontend/package.json" ] && grep -q "\"viem\":" frontend/package.json; then
    echo "  ✅ PASS: viem dependency found"
else
    echo "  ❌ FAIL: viem not found"
fi

# Test 7: Check TailwindCSS is installed
echo "Test 7: TailwindCSS installed"
if [ -f "frontend/package.json" ] && grep -q "\"tailwindcss\":" frontend/package.json; then
    echo "  ✅ PASS: tailwindcss dependency found"
else
    echo "  ❌ FAIL: tailwindcss not found"
fi

# Test 8: Check tsconfig.json exists
echo "Test 8: tsconfig.json exists"
if [ -f "frontend/tsconfig.json" ]; then
    echo "  ✅ PASS: frontend/tsconfig.json exists"
else
    echo "  ❌ FAIL: frontend/tsconfig.json not found"
fi

# Test 9: Check next.config exists
echo "Test 9: next.config exists"
if [ -f "frontend/next.config.js" ] || [ -f "frontend/next.config.ts" ]; then
    echo "  ✅ PASS: next.config exists"
else
    echo "  ❌ FAIL: next.config not found"
fi

# Test 10: Check Tailwind CSS config exists (v4 uses postcss.config.mjs)
echo "Test 10: Tailwind CSS config exists"
if [ -f "frontend/postcss.config.mjs" ]; then
    echo "  ✅ PASS: postcss.config.mjs exists (Tailwind v4)"
else
    echo "  ❌ FAIL: Tailwind CSS config not found"
fi

# Test 11: Check app directory exists
echo "Test 11: app directory exists"
if [ -d "frontend/app" ] || [ -d "frontend/src/app" ]; then
    echo "  ✅ PASS: app directory exists"
else
    echo "  ❌ FAIL: app directory not found"
fi

# Test 12: Check .env.example exists
echo "Test 12: .env.example exists"
if [ -f "frontend/.env.example" ]; then
    echo "  ✅ PASS: frontend/.env.example exists"
else
    echo "  ❌ FAIL: frontend/.env.example not found"
fi

echo ""
echo "=== Tests Complete ==="
