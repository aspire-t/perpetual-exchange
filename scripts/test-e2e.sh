#!/bin/bash
# E2E Test Script using Playwright
# Runs end-to-end tests for critical user journeys

set -e

echo "=== E2E Tests ==="
echo ""

# Check if Playwright is installed
if ! command -v npx &> /dev/null || ! npx playwright --version &> /dev/null; then
    echo "Installing Playwright..."
    npm install -D @playwright/test
    npx playwright install
fi

# Run E2E tests
echo "Running Playwright E2E tests..."
npx playwright test

echo ""
echo "=== Tests Complete ==="
