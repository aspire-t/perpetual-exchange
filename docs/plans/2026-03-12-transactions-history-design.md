# Transaction History Design Document

**Date:** 2026-03-12
**Status:** Approved

---

## 1. Overview

Build a unified transaction history page that displays all user transactions (Deposits, Withdrawals, and Orders) in a tabbed interface.

---

## 2. Architecture

### 2.1 High-Level Design

```
┌─────────────────────┐     ┌─────────────────────────────────────┐
│   Frontend          │     │   Backend (Existing APIs)           │
│   /transactions     │     │                                     │
│   ┌───────────────┐ │     │  ┌─────────────┐ ┌───────────────┐  │
│   │ Tab: Deposits │─┼────▶│  │GET /deposits│ │GET /withdrawals│ │
│   └───────────────┘ │     │  └─────────────┘ └───────────────┘  │
│   ┌───────────────┐ │     │                                     │
│   │Tab:Withdrawals│─┼────▶│  ┌─────────────────────────────┐    │
│   └───────────────┘ │     │  │GET /orders/history          │    │
│   ┌───────────────┐ │     │  └─────────────────────────────┘    │
│   │ Tab: Orders   │─┼────▶│                                     │
│   └───────────────┘ │     └─────────────────────────────────────┘
└─────────────────────┘
```

### 2.2 Technology Stack

| Component | Technology |
|-----------|------------|
| Frontend UI | Next.js + React Tabs component |
| Data Fetching | TanStack Query (React Query) |
| Backend | Existing NestJS API endpoints |
| Database | Existing PostgreSQL tables |

---

## 3. Page Design

### 3.1 Layout

```
/transactions
├── Page Title: "Transaction History"
├── Tab Navigation
│   ├── Deposits (存款)
│   ├── Withdrawals (取款)
│   └── Orders (订单)
└── Tab Content (based on selection)
```

### 3.2 Tab 1: Deposits

| Column | Field | Format |
|--------|-------|--------|
| Time | createdAt | YYYY-MM-DD HH:mm:ss |
| Amount | amount | X.XX USDC |
| Status | status | Badge with color |
| Transaction | txHash | Clickable link to block explorer |

**Status Badges:**
- `pending`: Yellow
- `confirmed`: Green
- `failed`: Red

### 3.3 Tab 2: Withdrawals

| Column | Field | Format |
|--------|-------|--------|
| Time | createdAt | YYYY-MM-DD HH:mm:ss |
| Amount | amount | X.XX USDC |
| Status | status | Badge with color |
| Transaction | txHash | Clickable link to block explorer |

**Status Badges:**
- `pending`: Yellow
- `approved`: Blue
- `processing`: Purple
- `confirmed`: Green
- `rejected`: Red

### 3.4 Tab 3: Orders

| Column | Field | Format |
|--------|-------|--------|
| Time | createdAt | YYYY-MM-DD HH:mm:ss |
| Side | side | Long (Green) / Short (Red) |
| Size | size | X.XX |
| Price | fillPrice or limitPrice | X.XX |
| Status | status | Badge with color |
| Transaction | txHash | Clickable link to block explorer |

**Status Badges:**
- `pending`: Yellow
- `open`: Blue
- `filled`: Green
- `cancelled`: Gray
- `rejected`: Red

---

## 4. API Endpoints

All endpoints require authentication (user wallet address).

### 4.1 Deposits

```
GET /deposits?limit=20&offset=0
```

Response:
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "userId": "uuid",
      "amount": "1000000",
      "status": "confirmed",
      "txHash": "0x...",
      "createdAt": "2026-03-12T10:00:00.000Z"
    }
  ]
}
```

### 4.2 Withdrawals

```
GET /withdrawals?limit=20&offset=0
```

Response:
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "userId": "uuid",
      "amount": "500000",
      "status": "confirmed",
      "txHash": "0x...",
      "createdAt": "2026-03-12T10:00:00.000Z"
    }
  ]
}
```

### 4.3 Orders

```
GET /orders/history?limit=20&offset=0
```

Response:
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "userId": "uuid",
      "type": "market",
      "side": "long",
      "size": "100",
      "limitPrice": null,
      "fillPrice": "3500.50",
      "status": "filled",
      "txHash": "0x...",
      "createdAt": "2026-03-12T10:00:00.000Z"
    }
  ]
}
```

---

## 5. Pagination

- **Page Size:** 20 records per page
- **Sorting:** createdAt DESC (newest first)
- **Loading:** Load more button or page number navigation
- **Empty State:** "No transactions yet" message when no records

---

## 6. Error Handling

| Scenario | Behavior |
|----------|----------|
| API returns 401 | Redirect to login |
| API returns 500 | Show error toast |
| No records | Show empty state message |
| Loading | Show skeleton loader |

---

## 7. Testing Strategy

### 7.1 Frontend

- Component tests for each tab
- E2E tests for page navigation
- Mock API responses for isolated testing

### 7.2 Backend

- Verify existing API endpoints return correct data
- Ensure pagination works correctly
- Test authentication/authorization

---

## 8. Implementation Order

```
1. Verify existing API endpoints
2. Create frontend /transactions page
3. Implement tab navigation
4. Implement Deposits tab
5. Implement Withdrawals tab
6. Implement Orders tab
7. Add pagination
8. Add loading states and error handling
9. Write tests
10. Documentation
```

---

## 9. Out of Scope

- Export to CSV/PDF
- Date range filtering
- Transaction type filtering within tabs
- Search functionality
- Admin view (all users' transactions)

---

## 10. Success Criteria

- [ ] User can view their deposit history
- [ ] User can view their withdrawal history
- [ ] User can view their order history
- [ ] Tabs switch correctly
- [ ] Pagination works
- [ ] Loading states display correctly
- [ ] Error states display correctly
- [ ] All tests pass
