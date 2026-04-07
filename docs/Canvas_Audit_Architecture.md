# Canvas Audit Agent — Техническая документация

## Оглавление

1. [Обзор](#обзор)
2. [Архитектура](#архитектура)
3. [Data Flow](#data-flow)
4. [Типы данных](#типы-данных)
5. [Data Layer: Braze API](#data-layer-braze-api)
6. [Нормализация](#нормализация)
7. [Derived Metrics](#derived-metrics)
8. [Audit Engine](#audit-engine)
9. [Правила аудита (17 правил, 5 измерений)](#правила-аудита)
10. [Скоринг и веса](#скоринг-и-веса)
11. [API Routes](#api-routes)
12. [Кэширование](#кэширование)
13. [UI-компоненты](#ui-компоненты)
14. [Страницы](#страницы)
15. [Файловая структура](#файловая-структура)

---

## Обзор

Canvas Audit Agent — rule-based аудитор Braze Canvas, встроенный в CRM Intelligence Copilot. Автоматически анализирует структуру, метрики и конфигурацию Canvas и выдаёт:

- **Health Score** (0–100) — взвешенная оценка здоровья Canvas
- **5 dimension scores** — оценки по Goal, Structure, Performance, Experimentation, Measurement
- **Findings** — конкретные проблемы с severity (critical/warning/info)
- **Step Drop-off** — визуализация потерь на каждом шаге
- **Variant Comparison** — сравнение вариантов с uplift vs control

Подход: **без Claude API**, чисто rule-based. REST API для дашборда. Весь анализ выполняется на сервере (Next.js API Routes).

---

## Архитектура

```
┌──────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  React UI    │────▸│ Next.js API Route │────▸│  Braze REST API │
│  /canvas-    │◂────│ /api/canvas-audit │◂────│  3 endpoints    │
│  audit/*     │     │                  │     │                 │
└──────────────┘     └────────┬─────────┘     └─────────────────┘
                              │
                    ┌─────────▼──────────┐
                    │   Audit Pipeline   │
                    │                    │
                    │  1. Fetch (3 calls)│
                    │  2. Normalize      │
                    │  3. Derive Metrics │
                    │  4. Run Rules      │
                    │  5. Score          │
                    │  6. Cache (15 min) │
                    └────────────────────┘
```

Один аудит = **3 Braze API вызова** параллельно:

| Endpoint | Что даёт |
|----------|----------|
| `/canvas/details` | Структура Canvas: шаги, варианты, conversion goals, каналы |
| `/canvas/data_summary` | Агрегированные метрики за 14 дней (с разбивкой по вариантам и шагам) |
| `/canvas/data_series` | Временные ряды метрик за 14 дней |

---

## Data Flow

```
Braze API ──▸ Raw Types ──▸ Normalize ──▸ NormalizedCanvas
                                              │
                                    ┌─────────┴──────────┐
                                    ▼                    ▼
                             Derived Metrics      17 Rule Functions
                             (dropoffs,           (goal, structure,
                              variants)            perf, exp, meas)
                                    │                    │
                                    └─────────┬──────────┘
                                              ▼
                                       CanvasAuditResult
                                       (healthScore,
                                        dimensions[5],
                                        findings[],
                                        derivedMetrics)
```

**Принцип:** Каждый слой зависит только от предыдущего. Правила — чистые функции `(NormalizedCanvas) => AuditFinding | null`.

---

## Типы данных

**Файл:** `types/canvas-audit.ts`

### Raw Braze (от API)

| Тип | Описание |
|-----|----------|
| `BrazeCanvasDetails` | Полная структура Canvas: steps[], variants[], conversion_behaviors[], schedule_type, channels |
| `BrazeCanvasStep` | Шаг Canvas: id, name, type, channels, next_step_ids, next_paths (для decision splits) |
| `BrazeCanvasVariant` | Вариант: id, name, percentage, first_step_ids |
| `BrazeConversionBehavior` | Цель конверсии: type, window (секунды), custom_event_name |

### Normalized (внутренняя схема)

| Тип | Описание |
|-----|----------|
| `NormalizedCanvas` | Главный объект: steps[], variants[], conversionGoals[], maxDepth, totalBranches, hasControl, totals |
| `NormalizedStep` | Шаг с computed `depth` (от BFS), channels[], nextStepIds[], metrics (sent, opens, clicks, conversions, revenue) |
| `NormalizedVariant` | Вариант с isControl flag, metrics (entries, conversions, revenue, conversionRate, revenuePerEntry) |
| `NormalizedConversionGoal` | Цель: type, windowSeconds, eventName |

### Audit Results

| Тип | Описание |
|-----|----------|
| `CanvasAuditResult` | Финальный результат: healthScore, dimensions[5], findings[], derivedMetrics, normalizedCanvas |
| `DimensionScore` | Оценка одного измерения: dimension, score (0–100), findings[] |
| `AuditFinding` | Находка: dimension, severity, title, detail |
| `DerivedMetrics` | Вычисленные метрики: overallConversionRate, overallRevenuePerEntry, stepDropoffs[], variantComparisons[] |
| `StepDropoff` | Drop-off шага: stepId, stepName, inflow, outflow, dropoffRate |
| `VariantComparison` | Сравнение варианта: entries, conversions, conversionRate, revenuePerEntry, upliftVsControl |

### API Response

| Тип | Описание |
|-----|----------|
| `CanvasAuditListItem` | Элемент списка: id, name, tags, lastEdited, healthScore (-1 = не проверен) |
| `CanvasAuditListResponse` | Ответ списка: canvases[], fetchedAt |

---

## Data Layer: Braze API

**Файл:** `lib/braze.ts`

Две новые функции добавлены к существующему Braze-клиенту:

### `getCanvasDetails(canvasId: string)`

```
GET /canvas/details?canvas_id=...
```

Возвращает `BrazeCanvasDetails` — полную структуру Canvas (шаги, варианты, цели конверсии, каналы, расписание). Используется CANVAS_API_KEY.

### `getCanvasDataSummaryFull(canvasId: string, length = 14)`

```
GET /canvas/data_summary?canvas_id=...&length=14&include_variant_breakdown=true&include_step_breakdown=true
```

Отличие от существующей `getCanvasDataSummary`: включает `include_variant_breakdown: "true"` для получения per-variant метрик (entries, conversions, revenue по каждому варианту).

Обе функции используют общий `brazeFetch()` с 8-секундным таймаутом и Bearer-авторизацией.

---

## Нормализация

**Файл:** `lib/canvas-audit/normalize.ts`

### `buildNormalizedCanvas(canvasId, details, summary, series)`

Главная функция нормализации. Принимает 3 ответа Braze API и возвращает `NormalizedCanvas`.

#### Алгоритм BFS для `depth`:

```
1. Построить adjacency list из steps (next_step_ids + next_paths)
2. Найти root-узлы (без входящих рёбер)
3. BFS от root с depth=0, инкрементируя на каждом уровне
4. Unreachable шаги получают depth=0
5. maxDepth = max(depth всех шагов)
```

Это обеспечивает корректный порядок шагов даже для сложных DAG с ветвлениями.

#### Подсчёт метрик шага (`extractStepMetrics`):

Из `summary.data.step_stats[stepId].messages` суммируются метрики по всем каналам и вариантам:
- `sent` — общее число отправок
- `opens`, `uniqueOpens` — открытия
- `clicks` — клики
- `conversions`, `revenue` — из step stats напрямую

#### Определение control-варианта:

Вариант считается control, если:
- Его `name` содержит "control" (case-insensitive), **или**
- Его `percentage` равен 0

#### Computed поля:

| Поле | Формула |
|------|---------|
| `maxDepth` | Max BFS depth среди всех шагов |
| `totalBranches` | Число шагов с >1 исходящим ребром |
| `hasControl` | Есть ли control-вариант |
| `totalSent` | Сумма sent по всем шагам |

---

## Derived Metrics

**Файл:** `lib/canvas-audit/derived-metrics.ts`

### `computeStepDropoffs(canvas)`

Для каждого message-шага с `sent > 0`:

```
inflow  = step.metrics.sent
outflow = Σ(sent в immediate next steps)

Если нет next steps → outflow = uniqueOpens (proxy для engagement)

dropoffRate = max(0, (inflow - outflow) / inflow)
```

Шаги сортируются по `depth` для логического порядка (воронка сверху вниз).

### `computeVariantComparisons(canvas)`

Для каждого варианта:

```
conversionRate  = conversions / entries     (если entries > 0)
revenuePerEntry = revenue / entries         (если entries > 0)
upliftVsControl = (rate - controlRate) / controlRate  (если не control и controlRate > 0)
```

Control-вариант получает `upliftVsControl = null`.

### `computeAllDerivedMetrics(canvas)`

Оркестратор:
- `overallConversionRate = totalConversions / totalEntries`
- `overallRevenuePerEntry = totalRevenue / totalEntries`
- Вызывает `computeStepDropoffs()` и `computeVariantComparisons()`

---

## Audit Engine

**Файл:** `lib/canvas-audit/engine.ts`

### `runAudit(canvas: NormalizedCanvas): CanvasAuditResult`

1. Для каждого из 5 измерений запускает все его правила
2. Считает dimension score: `100 - Σ(penalties)`
3. Считает weighted health score
4. Собирает все findings, сортирует по severity (critical → warning → info → pass)
5. Вычисляет derived metrics
6. Возвращает `CanvasAuditResult`

---

## Правила аудита

17 правил, распределённых по 5 измерениям. Каждое правило — чистая функция:

```typescript
(canvas: NormalizedCanvas) => AuditFinding | null
```

Возвращает `null` если проблема не обнаружена, или `AuditFinding` с severity и описанием.

### Goal (3 правила)

**Файл:** `lib/canvas-audit/rules/goal-rules.ts`

| Правило | Severity | Условие |
|---------|----------|---------|
| `checkNoConversionEvent` | critical | `conversionGoals.length === 0` |
| `checkWideConversionWindow` | warning | Любая цель с `windowSeconds > 7 дней` |
| `checkGenericEvent` | info | Цель использует generic event (session_start, app_open, any_purchase, custom_event) |

### Structure (4 правила)

**Файл:** `lib/canvas-audit/rules/structure-rules.ts`

| Правило | Severity | Условие |
|---------|----------|---------|
| `checkTooManySteps` | warning | `steps.length > 15` |
| `checkDeepDepth` | warning | `maxDepth > 10` |
| `checkNoControl` | warning | `variants.length > 1 && !hasControl` |
| `checkDeadEndSteps` | warning | Non-message шаги без исходящих рёбер |

### Performance (4 правила)

**Файл:** `lib/canvas-audit/rules/performance-rules.ts`

| Правило | Severity | Условие |
|---------|----------|---------|
| `checkHighDropoff` | critical | Шаг с `dropoffRate > 50%` и `inflow > 100` |
| `checkZeroConversions` | warning | `totalEntries > 100` и `totalConversions === 0` |
| `checkLowOpenRate` | warning | Email-шаг с `sent > 100` и `uniqueOpens/sent < 10%` |
| `checkZeroSends` | warning | `totalEntries > 0` и `totalSent === 0` |

### Experimentation (3 правила)

**Файл:** `lib/canvas-audit/rules/experimentation-rules.ts`

| Правило | Severity | Условие |
|---------|----------|---------|
| `checkNoControlGroup` | critical | `variants >= 2` и `!hasControl` |
| `checkSmallSampleSize` | warning | Non-control вариант с `entries < 1000` (но > 0) |
| `checkUnevenSplit` | warning | Разброс percentage non-control вариантов > 20 п.п. |

### Measurement (3 правила)

**Файл:** `lib/canvas-audit/rules/measurement-rules.ts`

| Правило | Severity | Условие |
|---------|----------|---------|
| `checkWideAttribution` | warning | `windowSeconds > 72 часа` |
| `checkNoStepMetrics` | warning | Ни один шаг не имеет `sent > 0` или `conversions > 0` |
| `checkRevenueWithoutConversions` | info | `totalRevenue > 0` при `totalConversions === 0` |

---

## Скоринг и веса

### Dimension Score

```
dimensionScore = max(0, min(100, 100 - Σ penalties))
```

| Severity | Штраф |
|----------|-------|
| critical | -30 |
| warning  | -15 |
| info     | -5  |
| pass     | 0   |

**Пример:** Dimension с 1 critical + 1 warning = `100 - 30 - 15 = 55`

### Health Score (взвешенный)

```
healthScore = round(
  Performance × 0.35 +
  Experimentation × 0.20 +
  Goal × 0.15 +
  Structure × 0.15 +
  Measurement × 0.15
)
```

| Измерение | Вес | Обоснование |
|-----------|-----|-------------|
| Performance | 35% | Самое важное — реальные результаты |
| Experimentation | 20% | Качество A/B тестов критично для роста |
| Goal | 15% | Без цели нечего оптимизировать |
| Structure | 15% | Влияет на maintainability и deliverability |
| Measurement | 15% | Качество данных для принятия решений |

### Цветовая шкала

| Диапазон | Цвет | Значение |
|----------|------|----------|
| 70–100 | Зелёный | Canvas в хорошем состоянии |
| 40–69 | Жёлтый | Требует внимания |
| 0–39 | Красный | Критические проблемы |
| -1 | Серый | Не проверен |

---

## API Routes

### `GET /api/canvas-audit`

**Файл:** `app/api/canvas-audit/route.ts`

Список всех Canvas с health scores.

**Логика:**
1. Проверяет кэш (`canvas_audit_list`, TTL 10 мин)
2. Если miss — вызывает `getCanvasList(0)` (Braze API)
3. Для каждого Canvas проверяет, есть ли кэшированный audit result (`canvas_audit_{id}`)
4. Если есть — берёт `healthScore`, иначе `-1`
5. Возвращает `CanvasAuditListResponse`

**Response:**
```json
{
  "canvases": [
    {
      "id": "canvas_123",
      "name": "Onboarding Flow",
      "tags": ["lifecycle", "onboarding"],
      "lastEdited": "2026-04-01T12:00:00Z",
      "healthScore": 72
    }
  ],
  "fetchedAt": "2026-04-07T10:00:00Z"
}
```

**Headers:** `X-Cache: HIT` или `X-Cache: MISS`

### `GET /api/canvas-audit/[canvasId]`

**Файл:** `app/api/canvas-audit/[canvasId]/route.ts`

Полный аудит одного Canvas.

**Логика:**
1. Проверяет кэш (`canvas_audit_{canvasId}`, TTL 15 мин)
2. Если miss — 3 параллельных запроса к Braze API через `Promise.allSettled`:
   - `getCanvasDetails(canvasId)`
   - `getCanvasDataSummaryFull(canvasId, 14)`
   - `getCanvasDataSeries(canvasId, 14)`
3. Details обязателен (502 при ошибке), summary и series — graceful fallback
4. `buildNormalizedCanvas()` → `runAudit()` → кэш → response

**Response:** `CanvasAuditResult` (полный объект аудита)

**Error handling:**
- `400` — отсутствует canvasId
- `502` — ошибка Braze API (details не загрузились) или внутренняя ошибка

---

## Кэширование

**Файл:** `lib/cache.ts`

In-memory кэш с поддержкой custom TTL.

```typescript
setInCache(key, data, ttlMs?)  // ttlMs по умолчанию 10 мин
getFromCache<T>(key)           // null если expired или отсутствует
```

| Ключ кэша | TTL | Описание |
|-----------|-----|----------|
| `canvas_audit_list` | 10 мин | Список Canvas с health scores |
| `canvas_audit_{canvasId}` | 15 мин | Полный результат аудита |

При повторном запросе к уже аудированному Canvas в течение 15 минут данные возвращаются из кэша без обращения к Braze API. Заголовок `X-Cache: HIT` сигнализирует о кэш-попадании.

---

## UI-компоненты

**Директория:** `components/canvas-audit/`

### `HealthScoreBadge`

Цветной бейдж с числом (0–100) или "Not audited" (-1).

| Score | Цвет | CSS |
|-------|------|-----|
| >= 70 | Зелёный | `bg-green-600` |
| >= 40 | Жёлтый | `bg-yellow-500` |
| < 40 | Красный | `variant="destructive"` |
| -1 | Серый | `variant="outline"` |

Два размера: `sm` (по умолчанию) и `lg` (для detail page header).

### `DimensionScoreCard`

Карточка одного из 5 измерений. Содержит:
- Название измерения (Goal, Structure, Performance, Experimentation, Measurement)
- Числовой score (0–100) крупным шрифтом
- Progress bar с цветовой кодировкой (зелёный/жёлтый/красный)
- Число findings

Используется в grid-раскладке `lg:grid-cols-5` на detail page.

### `FindingsList`

Список всех findings аудита. Каждый finding — карточка с:
- Иконкой severity (AlertCircle, AlertTriangle, Info, CheckCircle)
- Цветным фоном (red/yellow/blue/green с dark mode поддержкой)
- Title + severity label
- Detail text (описание проблемы и рекомендация)

Если findings пуст — показывает "No issues found. Canvas looks healthy!" с зелёной галочкой.

### `StepDropoffChart`

Горизонтальный BarChart (Recharts) — waterfall drop-off по шагам.

- **Ось Y:** названия шагов (обрезаются до 20 символов, полное имя в tooltip)
- **Бары:** inflow (цвет по dropoff rate) и outflow (зелёный, полупрозрачный)
- **Цвета inflow:** Красный > 50%, Жёлтый > 30%, Зелёный < 30%
- **Высота:** динамическая, `max(200px, steps × 50px)`

Если данных нет — показывает "No step-level data available".

### `VariantComparisonTable`

Переиспользует `SortableTable` (существующий generic компонент). Колонки:

| Колонка | Тип | Формат |
|---------|-----|--------|
| Variant | text | font-medium |
| Entries | numeric | `toLocaleString()` |
| Conversions | numeric | `toLocaleString()` |
| Conv. Rate | numeric | `X.XX%` |
| Rev/Entry | numeric | `$X.XX` (formatCurrency) |
| Uplift vs Control | numeric | Badge: зелёный (+X.X%), красный (-X.X%), "—" для control |

Сортировка по умолчанию: `conversionRate` desc. Скрывается если вариантов нет.

---

## Страницы

### `/canvas-audit` — Список Canvas

**Файл:** `app/canvas-audit/page.tsx`

**Состояние:** `data`, `error`, `loading`, `auditingId`

**Поведение:**
1. При монтировании — `fetch("/api/canvas-audit")`
2. Отображает список Canvas:
   - `HealthScoreBadge` (score или "Not audited")
   - Название Canvas (truncate)
   - До 3 тегов (Badge outline)
   - Дата последнего редактирования
3. Кнопка **"Run Audit"** / **"Re-audit"**:
   - Вызывает `fetch("/api/canvas-audit/{id}")`
   - Показывает "Auditing..." пока идёт запрос
   - После успеха обновляет healthScore в списке (без перезагрузки)
4. Кнопка **→** (ArrowRight): переход на detail page (только для аудированных)

**Loading state:** 5 skeleton-строк. **Error state:** красный banner.

### `/canvas-audit/[canvasId]` — Детальный отчёт

**Файл:** `app/canvas-audit/[canvasId]/page.tsx`

**Состояние:** `data`, `error`, `loading`

**Структура страницы (сверху вниз):**

1. **Навигация** — кнопка "Back to list" (ArrowLeft)
2. **Header Card:**
   - Название Canvas (h1, bold)
   - Description (если есть)
   - Теги (Badge outline) + schedule_type + число шагов/вариантов
   - Health Score Badge (lg) справа
   - Mini stats: Entries, Conversions, Conv. Rate, Rev/Entry
3. **Dimension Score Cards** — 5 карточек в grid (lg:5 колонок)
4. **Findings List** — все findings по severity
5. **Step Drop-off Chart** — горизонтальный waterfall
6. **Variant Comparison Table** — sortable таблица
7. **Audit timestamp** — "Audited at: ..."

**Loading state:** skeleton для header + dimension cards + findings + chart.
**Error state:** красный banner + кнопка "Back to list".

---

## Файловая структура

```
types/
  canvas-audit.ts                    # Все типы аудита

lib/
  braze.ts                           # + getCanvasDetails, getCanvasDataSummaryFull
  cache.ts                           # + optional ttlMs parameter
  canvas-audit/
    normalize.ts                     # BFS + нормализация в NormalizedCanvas
    derived-metrics.ts               # Step dropoffs, variant comparisons
    engine.ts                        # Score calculation + audit orchestration
    rules/
      goal-rules.ts                  # 3 правила
      structure-rules.ts             # 4 правила
      performance-rules.ts           # 4 правила
      experimentation-rules.ts       # 3 правила
      measurement-rules.ts           # 3 правила

app/
  api/canvas-audit/
    route.ts                         # GET — список Canvas с health scores
    [canvasId]/route.ts              # GET — полный аудит одного Canvas
  canvas-audit/
    page.tsx                         # Список Canvas
    [canvasId]/page.tsx              # Детальный отчёт

components/
  canvas-audit/
    HealthScoreBadge.tsx             # Цветной бейдж score
    DimensionScoreCard.tsx           # Карточка измерения + progress bar
    FindingsList.tsx                 # Severity-colored findings
    StepDropoffChart.tsx             # Recharts BarChart waterfall
    VariantComparisonTable.tsx       # SortableTable для вариантов
  layout/
    sidebar-data.ts                  # + Canvas Audit nav item (ClipboardCheck)
    app-sidebar.tsx                  # + <a> обёртки для навигации
```

---

## Расширение

Для добавления нового правила:

1. Создать функцию в соответствующем файле `rules/*.ts`:
   ```typescript
   export function checkMyRule(canvas: NormalizedCanvas): AuditFinding | null {
     if (/* условие */) {
       return { dimension: "performance", severity: "warning", title: "...", detail: "..." };
     }
     return null;
   }
   ```
2. Добавить в массив правил в том же файле (например, `performanceRules`)
3. Готово — engine автоматически подхватит

Для добавления нового измерения:

1. Добавить значение в `AuditDimension` type union
2. Создать файл правил `rules/new-dimension-rules.ts`
3. Добавить в `DIMENSION_RULES` и `DIMENSION_WEIGHTS` в `engine.ts`
4. Добавить label в `DIMENSION_LABELS` в `DimensionScoreCard.tsx`
