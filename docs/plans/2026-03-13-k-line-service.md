# K-line Service Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement a K-line (candlestick) service that aggregates price data into time-based candles (1m, 5m, 15m, 1h, 4h, 1d) for charting.

**Architecture:**
- Service layer that fetches raw price data and aggregates into K-line candles
- Entity to store K-line records in database
- REST API endpoint to query K-lines by symbol, timeframe, and time range
- Tests cover aggregation logic, timeframe handling, and edge cases

**Tech Stack:** NestJS, TypeORM, Jest, SQLite/PostgreSQL

---

## Task 1: Create K-line Entity

**Files:**
- Create: `backend/src/entities/Kline.entity.ts`
- Test: `backend/src/entities/Kline.entity.spec.ts`

**Step 1: Write the failing test**

```typescript
// backend/src/entities/Kline.entity.spec.ts
import { Kline } from './Kline.entity';

describe('Kline Entity', () => {
  it('should create a valid Kline instance', () => {
    const kline = new Kline();
    kline.symbol = 'ETH';
    kline.timeframe = '1m';
    kline.timestamp = new Date('2024-01-01T00:00:00Z');
    kline.open = '2000000000';
    kline.high = '2050000000';
    kline.low = '1950000000';
    kline.close = '2030000000';
    kline.volume = '1000000000000000000';

    expect(kline.symbol).toBe('ETH');
    expect(kline.timeframe).toBe('1m');
    expect(kline.open).toBe('2000000000');
    expect(kline.high).toBe('2050000000');
    expect(kline.low).toBe('1950000000');
    expect(kline.close).toBe('2030000000');
  });
});
```

**Step 2: Run test to verify it fails**

```bash
npm test -- Kline.entity.spec.ts
```
Expected: FAIL - Module not found (entity doesn't exist)

**Step 3: Write minimal implementation**

```typescript
// backend/src/entities/Kline.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('klines')
export class Kline {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @Index()
  symbol: string;

  @Column()
  @Index()
  timeframe: string;

  @Column()
  @Index()
  timestamp: Date;

  @Column('varchar')
  open: string;

  @Column('varchar')
  high: string;

  @Column('varchar')
  low: string;

  @Column('varchar')
  close: string;

  @Column('varchar')
  volume: string;

  @CreateDateColumn()
  createdAt: Date;
}
```

**Step 4: Run test to verify it passes**

```bash
npm test -- Kline.entity.spec.ts
```
Expected: PASS

**Step 5: Commit**

```bash
git add backend/src/entities/Kline.entity.ts backend/src/entities/Kline.entity.spec.ts
git commit -m "feat: add Kline entity with basic fields"
```

---

## Task 2: K-line Service - Basic Aggregation Logic

**Files:**
- Create: `backend/src/kline/kline.service.ts`
- Create: `backend/src/kline/kline.service.spec.ts`

**Step 1: Write failing test for single candle aggregation**

```typescript
// backend/src/kline/kline.service.spec.ts
import { KlineService } from './kline.service';
import { PriceService } from '../price/price.service';

describe('KlineService', () => {
  let klineService: KlineService;
  let mockPriceService: jest.Mocked<PriceService>;

  beforeEach(() => {
    mockPriceService = {
      getPriceHistory: jest.fn(),
    } as any;
    klineService = new KlineService(mockPriceService);
  });

  describe('aggregateCandle', () => {
    it('should aggregate OHLCV from price data', () => {
      const prices = [
        { price: '2000000000', volume: '100000000000000000', timestamp: new Date('2024-01-01T00:00:00Z') },
        { price: '2050000000', volume: '150000000000000000', timestamp: new Date('2024-01-01T00:00:30Z') },
        { price: '1950000000', volume: '120000000000000000', timestamp: new Date('2024-01-01T00:01:00Z') },
        { price: '2030000000', volume: '130000000000000000', timestamp: new Date('2024-01-01T00:01:30Z') },
      ];

      const candle = klineService.aggregateCandle(prices, '1m');

      expect(candle.open).toBe('2000000000');
      expect(candle.high).toBe('2050000000');
      expect(candle.low).toBe('1950000000');
      expect(candle.close).toBe('2030000000');
      expect(candle.volume).toBe('500000000000000000');
    });
  });
});
```

**Step 2: Run test to verify it fails**

```bash
npm test -- kline.service.spec.ts
```
Expected: FAIL - Service doesn't exist or method missing

**Step 3: Write minimal implementation**

```typescript
// backend/src/kline/kline.service.ts
import { Injectable } from '@nestjs/common';
import { PriceService } from '../price/price.service';

interface PricePoint {
  price: string;
  volume: string;
  timestamp: Date;
}

interface Candle {
  open: string;
  high: string;
  low: string;
  close: string;
  volume: string;
  timestamp: Date;
}

@Injectable()
export class KlineService {
  constructor(private priceService: PriceService) {}

  aggregateCandle(prices: PricePoint[], timeframe: string): Candle {
    if (prices.length === 0) {
      throw new Error('No price data to aggregate');
    }

    const open = prices[0].price;
    const close = prices[prices.length - 1].price;
    const high = prices.reduce((max, p) =>
      BigInt(p.price) > BigInt(max) ? p.price : max, prices[0].price);
    const low = prices.reduce((min, p) =>
      BigInt(p.price) < BigInt(min) ? p.price : min, prices[0].price);
    const volume = prices.reduce(
      (sum, p) => sum + BigInt(p.volume),
      BigInt(0)
    ).toString();

    return {
      open,
      high,
      low,
      close,
      volume,
      timestamp: prices[0].timestamp,
    };
  }
}
```

**Step 4: Run test to verify it passes**

```bash
npm test -- kline.service.spec.ts
```
Expected: PASS

**Step 5: Commit**

```bash
git add backend/src/kline/kline.service.ts backend/src/kline/kline.service.spec.ts
git commit -m "feat: implement candle aggregation logic"
```

---

## Task 3: K-line Service - Timeframe Bucket Logic

**Files:**
- Modify: `backend/src/kline/kline.service.spec.ts`
- Modify: `backend/src/kline/kline.service.ts`

**Step 1: Write failing test for timeframe bucketing**

```typescript
// Add to kline.service.spec.ts
describe('bucketByTimeframe', () => {
  it('should group prices into 1m buckets', () => {
    const prices = [
      { price: '2000000000', volume: '100000000000000000', timestamp: new Date('2024-01-01T00:00:00Z') },
      { price: '2010000000', volume: '110000000000000000', timestamp: new Date('2024-01-01T00:00:30Z') },
      { price: '2020000000', volume: '120000000000000000', timestamp: new Date('2024-01-01T00:01:00Z') },
      { price: '2030000000', volume: '130000000000000000', timestamp: new Date('2024-01-01T00:01:30Z') },
      { price: '2040000000', volume: '140000000000000000', timestamp: new Date('2024-01-01T00:02:00Z') },
    ];

    const buckets = klineService.bucketByTimeframe(prices, '1m');

    expect(buckets.size).toBe(3);
    expect(buckets.get('2024-01-01T00:00:00.000Z')).toHaveLength(2);
    expect(buckets.get('2024-01-01T00:01:00.000Z')).toHaveLength(2);
    expect(buckets.get('2024-01-01T00:02:00.000Z')).toHaveLength(1);
  });

  it('should group prices into 5m buckets', () => {
    const prices = [
      { price: '2000000000', volume: '100000000000000000', timestamp: new Date('2024-01-01T00:00:00Z') },
      { price: '2010000000', volume: '110000000000000000', timestamp: new Date('2024-01-01T00:02:00Z') },
      { price: '2020000000', volume: '120000000000000000', timestamp: new Date('2024-01-01T00:05:00Z') },
      { price: '2030000000', volume: '130000000000000000', timestamp: new Date('2024-01-01T00:07:00Z') },
    ];

    const buckets = klineService.bucketByTimeframe(prices, '5m');

    expect(buckets.size).toBe(2);
    expect(buckets.get('2024-01-01T00:00:00.000Z')).toHaveLength(2);
    expect(buckets.get('2024-01-01T00:05:00.000Z')).toHaveLength(2);
  });
});
```

**Step 2: Run test to verify it fails**

```bash
npm test -- kline.service.spec.ts
```
Expected: FAIL - Method doesn't exist

**Step 3: Write minimal implementation**

```typescript
// Add to kline.service.ts
private getBucketKey(timestamp: Date, timeframe: string): string {
  const msPerMinute = 60 * 1000;
  const msPerHour = 60 * msPerMinute;
  const msPerDay = 24 * msPerHour;

  let bucketMs: number;
  const time = timestamp.getTime();

  switch (timeframe) {
    case '1m':
      bucketMs = Math.floor(time / msPerMinute) * msPerMinute;
      break;
    case '5m':
      bucketMs = Math.floor(time / (5 * msPerMinute)) * (5 * msPerMinute);
      break;
    case '15m':
      bucketMs = Math.floor(time / (15 * msPerMinute)) * (15 * msPerMinute);
      break;
    case '1h':
      bucketMs = Math.floor(time / msPerHour) * msPerHour;
      break;
    case '4h':
      bucketMs = Math.floor(time / (4 * msPerHour)) * (4 * msPerHour);
      break;
    case '1d':
      bucketMs = Math.floor(time / msPerDay) * msPerDay;
      break;
    default:
      bucketMs = Math.floor(time / msPerMinute) * msPerMinute;
  }

  return new Date(bucketMs).toISOString();
}

bucketByTimeframe(
  prices: PricePoint[],
  timeframe: string,
): Map<string, PricePoint[]> {
  const buckets = new Map<string, PricePoint[]>();

  for (const price of prices) {
    const key = this.getBucketKey(price.timestamp, timeframe);
    const existing = buckets.get(key) || [];
    existing.push(price);
    buckets.set(key, existing);
  }

  return buckets;
}
```

**Step 4: Run test to verify it passes**

```bash
npm test -- kline.service.spec.ts
```
Expected: PASS

**Step 5: Commit**

```bash
git add backend/src/kline/kline.service.ts backend/src/kline/kline.service.spec.ts
git commit -m "feat: add timeframe bucketing logic"
```

---

## Task 4: K-line Service - Generate K-lines Method

**Files:**
- Modify: `backend/src/kline/kline.service.spec.ts`
- Modify: `backend/src/kline/kline.service.ts`

**Step 1: Write failing test for generateKlines**

```typescript
// Add to kline.service.spec.ts
describe('generateKlines', () => {
  it('should generate k-lines from raw price data', async () => {
    const mockPrices = [
      { price: '2000000000', volume: '100000000000000000', timestamp: new Date('2024-01-01T00:00:00Z') },
      { price: '2010000000', volume: '110000000000000000', timestamp: new Date('2024-01-01T00:00:30Z') },
      { price: '2020000000', volume: '120000000000000000', timestamp: new Date('2024-01-01T00:01:00Z') },
      { price: '2030000000', volume: '130000000000000000', timestamp: new Date('2024-01-01T00:01:30Z') },
    ];

    jest.spyOn(mockPriceService, 'getPriceHistory').mockResolvedValue(mockPrices);

    const klines = await klineService.generateKlines('ETH', '1m', 2);

    expect(klines.length).toBe(2);
    expect(klines[0].symbol).toBe('ETH');
    expect(klines[0].timeframe).toBe('1m');
    expect(klines[0].open).toBe('2000000000');
    expect(klines[0].close).toBe('2010000000');
    expect(klines[1].open).toBe('2020000000');
    expect(klines[1].close).toBe('2030000000');
  });

  it('should handle empty price data', async () => {
    jest.spyOn(mockPriceService, 'getPriceHistory').mockResolvedValue([]);

    const klines = await klineService.generateKlines('ETH', '1m', 10);

    expect(klines).toEqual([]);
  });
});
```

**Step 2: Run test to verify it fails**

```bash
npm test -- kline.service.spec.ts
```
Expected: FAIL - Method doesn't exist

**Step 3: Write minimal implementation**

```typescript
// Add to kline.service.ts
async generateKlines(
  symbol: string,
  timeframe: string,
  count: number,
): Promise<Partial<Kline>[]> {
  const endTime = new Date();
  const startTime = this.getStartTime(endTime, timeframe, count);

  const prices = await this.priceService.getPriceHistory(symbol, startTime, endTime);

  if (prices.length === 0) {
    return [];
  }

  const buckets = this.bucketByTimeframe(prices, timeframe);
  const klines: Partial<Kline>[] = [];

  for (const [timestamp, bucketPrices] of buckets.entries()) {
    const candle = this.aggregateCandle(bucketPrices, timeframe);
    klines.push({
      symbol,
      timeframe,
      timestamp: new Date(timestamp),
      ...candle,
    });
  }

  return klines.slice(-count);
}

private getStartTime(endTime: Date, timeframe: string, count: number): Date {
  const msPerMinute = 60 * 1000;
  const msPerHour = 60 * msPerMinute;
  const msPerDay = 24 * msPerHour;

  let duration: number;
  switch (timeframe) {
    case '1m': duration = msPerMinute; break;
    case '5m': duration = 5 * msPerMinute; break;
    case '15m': duration = 15 * msPerMinute; break;
    case '1h': duration = msPerHour; break;
    case '4h': duration = 4 * msPerHour; break;
    case '1d': duration = msPerDay; break;
    default: duration = msPerMinute;
  }

  return new Date(endTime.getTime() - duration * count * 2);
}
```

**Step 4: Run test to verify it passes**

```bash
npm test -- kline.service.spec.ts
```
Expected: PASS

**Step 5: Commit**

```bash
git add backend/src/kline/kline.service.ts backend/src/kline/kline.service.spec.ts
git commit -m "feat: implement generateKlines method"
```

---

## Task 5: K-line Module and Controller

**Files:**
- Create: `backend/src/kline/kline.module.ts`
- Create: `backend/src/kline/kline.controller.ts`
- Create: `backend/src/kline/kline.controller.spec.ts`

**Step 1: Write failing test for controller**

```typescript
// backend/src/kline/kline.controller.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { KlineController } from './kline.controller';
import { KlineService } from './kline.service';

describe('KlineController', () => {
  let controller: KlineController;
  let service: KlineService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [KlineController],
      providers: [
        {
          provide: KlineService,
          useValue: {
            generateKlines: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<KlineController>(KlineController);
    service = module.get<KlineService>(KlineService);
  });

  describe('getKlines', () => {
    it('should return klines for symbol and timeframe', async () => {
      const mockKlines = [
        {
          symbol: 'ETH',
          timeframe: '1m',
          timestamp: new Date('2024-01-01T00:00:00Z'),
          open: '2000000000',
          high: '2010000000',
          low: '1990000000',
          close: '2005000000',
          volume: '100000000000000000',
        },
      ];

      jest.spyOn(service, 'generateKlines').mockResolvedValue(mockKlines);

      const result = await controller.getKlines('ETH', '1m', 10);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockKlines);
    });

    it('should handle invalid timeframe', async () => {
      const result = await controller.getKlines('ETH', 'invalid', 10);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid timeframe');
    });
  });
});
```

**Step 2: Run test to verify it fails**

```bash
npm test -- kline.controller.spec.ts
```
Expected: FAIL - Controller doesn't exist

**Step 3: Write minimal implementation**

```typescript
// backend/src/kline/kline.controller.ts
import { Controller, Get, Query } from '@nestjs/common';
import { KlineService } from './kline.service';

const VALID_TIMEFRAMES = ['1m', '5m', '15m', '1h', '4h', '1d'];

@Controller('klines')
export class KlineController {
  constructor(private klineService: KlineService) {}

  @Get()
  async getKlines(
    @Query('symbol') symbol: string,
    @Query('timeframe') timeframe: string,
    @Query('count') count: number = 100,
  ): Promise<{ success: boolean; data?: any[]; error?: string }> {
    if (!VALID_TIMEFRAMES.includes(timeframe)) {
      return {
        success: false,
        error: `Invalid timeframe. Must be one of: ${VALID_TIMEFRAMES.join(', ')}`,
      };
    }

    const klines = await this.klineService.generateKlines(symbol, timeframe, count);

    return {
      success: true,
      data: klines,
    };
  }
}
```

```typescript
// backend/src/kline/kline.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Kline } from '../entities/Kline.entity';
import { KlineService } from './kline.service';
import { KlineController } from './kline.controller';
import { PriceModule } from '../price/price.module';

@Module({
  imports: [TypeOrmModule.forFeature([Kline]), PriceModule],
  controllers: [KlineController],
  providers: [KlineService],
  exports: [KlineService],
})
export class KlineModule {}
```

**Step 4: Run test to verify it passes**

```bash
npm test -- kline.controller.spec.ts
```
Expected: PASS

**Step 5: Commit**

```bash
git add backend/src/kline/kline.module.ts backend/src/kline/kline.controller.ts backend/src/kline/kline.controller.spec.ts
git commit -m "feat: add Kline module and controller"
```

---

## Task 6: Register Kline Module in App

**Files:**
- Modify: `backend/src/app.module.ts`

**Step 1: Add KlineModule to imports**

```typescript
// In app.module.ts, add to imports array
import { KlineModule } from './kline/kline.module';

@Module({
  imports: [
    // ... existing imports
    KlineModule,
  ],
})
export class AppModule {}
```

**Step 2: Verify build succeeds**

```bash
npm run build
```
Expected: SUCCESS

**Step 3: Run all tests**

```bash
npm test
```
Expected: All tests pass

**Step 4: Commit**

```bash
git add backend/src/app.module.ts
git commit -m "feat: register KlineModule in AppModule"
```

---

## Testing Checklist

- [ ] Entity tests pass (Task 1)
- [ ] Service aggregation tests pass (Task 2)
- [ ] Service bucketing tests pass (Task 3)
- [ ] Service generateKlines tests pass (Task 4)
- [ ] Controller tests pass (Task 5)
- [ ] All existing tests still pass (Task 6)
- [ ] Manual API test: `curl "http://localhost:3000/klines?symbol=ETH&timeframe=1m&count=10"`

---

## Summary

**Total Tasks:** 6
**Estimated Time:** 60-90 minutes
**Test Coverage:** Entity, service logic, controller
