#!/bin/bash

# Docker Compose Infrastructure Tests
# TDD Test Script - Run this to verify infrastructure

set -e

echo "=== Docker Compose Infrastructure Tests ==="
echo ""

# Test 1: Check docker-compose.yml exists
echo "Test 1: Check docker-compose.yml exists"
if [ -f "docker-compose.yml" ]; then
    echo "  ✅ PASS: docker-compose.yml exists"
else
    echo "  ❌ FAIL: docker-compose.yml not found"
    exit 1
fi

# Test 2: Validate docker-compose.yml syntax
echo "Test 2: Validate docker-compose.yml syntax"
if docker compose config > /dev/null 2>&1; then
    echo "  ✅ PASS: docker-compose.yml is valid"
else
    echo "  ❌ FAIL: docker-compose.yml has syntax errors"
    exit 1
fi

# Test 3: Check PostgreSQL service is defined
echo "Test 3: Check PostgreSQL service is defined"
if docker compose config 2>/dev/null | grep -q "postgres:"; then
    echo "  ✅ PASS: PostgreSQL service defined"
else
    echo "  ❌ FAIL: PostgreSQL service not found"
    exit 1
fi

# Test 4: Check PostgreSQL uses correct image
echo "Test 4: Check PostgreSQL uses postgres:15 image"
if docker compose config 2>/dev/null | grep -q "postgres:15"; then
    echo "  ✅ PASS: PostgreSQL uses correct image"
else
    echo "  ❌ FAIL: PostgreSQL should use postgres:15 image"
    exit 1
fi

# Test 5: Check PostgreSQL port mapping
echo "Test 5: Check PostgreSQL port 5432"
if docker compose config 2>/dev/null | grep -q "published: \"5432\""; then
    echo "  ✅ PASS: PostgreSQL port 5432 mapped"
else
    echo "  ❌ FAIL: PostgreSQL port 5432 not mapped"
    exit 1
fi

# Test 6: Check Hardhat Node service is defined
echo "Test 6: Check Hardhat Node service is defined"
if docker compose config 2>/dev/null | grep -q "hardhat-node:"; then
    echo "  ✅ PASS: Hardhat Node service defined"
else
    echo "  ❌ FAIL: Hardhat Node service not found"
    exit 1
fi

# Test 7: Check Hardhat Node port mapping
echo "Test 7: Check Hardhat Node port 8545"
if docker compose config 2>/dev/null | grep -q "published: \"8545\""; then
    echo "  ✅ PASS: Hardhat Node port 8545 mapped"
else
    echo "  ❌ FAIL: Hardhat Node port 8545 not mapped"
    exit 1
fi

# Test 8: Check perp-network is defined
echo "Test 8: Check perp-network is defined"
if docker compose config 2>/dev/null | grep -q "perp-network:"; then
    echo "  ✅ PASS: perp-network defined"
else
    echo "  ❌ FAIL: perp-network not found"
    exit 1
fi

# Test 9: Check postgres-data volume is defined
echo "Test 9: Check postgres-data volume is defined"
if docker compose config 2>/dev/null | grep -q "postgres-data:"; then
    echo "  ✅ PASS: postgres-data volume defined"
else
    echo "  ❌ FAIL: postgres-data volume not found"
    exit 1
fi

# Test 10: Check PostgreSQL healthcheck
echo "Test 10: Check PostgreSQL has healthcheck"
if docker compose config 2>/dev/null | grep -A20 "postgres:" | grep -q "healthcheck:"; then
    echo "  ✅ PASS: PostgreSQL has healthcheck"
else
    echo "  ❌ FAIL: PostgreSQL missing healthcheck"
    exit 1
fi

# Test 11: Check Hardhat Node healthcheck
echo "Test 11: Check Hardhat Node has healthcheck"
if docker compose config 2>/dev/null | grep -A20 "hardhat-node:" | grep -q "healthcheck:"; then
    echo "  ✅ PASS: Hardhat Node has healthcheck"
else
    echo "  ❌ FAIL: Hardhat Node missing healthcheck"
    exit 1
fi

echo ""
echo "=== All Tests Passed ==="
