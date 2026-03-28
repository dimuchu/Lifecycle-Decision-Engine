# CRM Intelligence Copilot — Контур 1: Live Dashboard

## Что это

Web-приложение (React + Next.js на Vercel), которое через backend-proxy дёргает Braze REST API и показывает **единый cockpit view** всей CRM-активности. Без warehouse, без user-level данных, только агрегированные метрики.

Это **metric layer** — фундамент, на котором позже вырастет AI-интерпретация (Пятница 2), гипотезы (Пятница 3) и shareable view (Пятница 4).

---

## Какую боль закрывает

В самом Braze dashboard есть проблема: данные разбросаны. Чтобы понять "как идут дела с CRM", маркетолог должен:

1. Открыть каждую кампанию по отдельности и посмотреть её performance
2. Открыть каждый canvas и посмотреть его аналитику
3. Зайти в Home dashboard и посмотреть DAU/MAU
4. Зайти в Revenue report и посмотреть revenue
5. Пройтись по сегментам и проверить, растут ли они

Нет единого экрана, где всё это видно одним взглядом. Нет сравнения кампаний между собой. Нет динамики сегментов (Braze показывает размер "сейчас", но не тренд). Нет автоматической сводки.

**CRM Cockpit View** решает это: один экран, все ключевые метрики, обновляется по запросу.

---

## Архитектура

```
React App (Vercel)
    ↓ fetch('/api/braze')
Next.js API Route (server-side)
    ↓ Bearer token auth
Braze REST API (read-only)
    ↓ JSON responses
Агрегированные данные
```

### Почему backend-proxy, а не прямые вызовы из браузера

- Braze API Key нельзя хранить в клиентском коде — это секрет
- Backend кеширует ответы (5-15 мин TTL), чтобы не бить в rate limits
- Backend агрегирует несколько API-вызовов в один JSON для клиента
- Позже сюда добавится Claude API для AI-интерпретации

### Стек

| Компонент | Технология | Почему |
|-----------|-----------|-------|
| Frontend | React 18 + TypeScript | Вайбкодинг-совместимо, Vercel-native |
| Backend | Next.js API Routes | Серверные функции на том же деплое |
| Графики | Recharts | Лёгкий, React-native, хорошо для time series |
| Хостинг | Vercel (free tier) | Deploy по git push, HTTPS, CDN |
| Стили | CSS Modules или Tailwind | На выбор |

---

## Braze REST API: какие endpoints используем

### Аутентификация

Все запросы — GET с Bearer token в заголовке:

```
Authorization: Bearer YOUR-REST-API-KEY
```

Endpoint определяется кластером Braze (например `https://rest.iad-01.braze.com`). Найти свой: Settings → APIs and Identifiers.

### Необходимые permissions для API Key

Создать **отдельный ключ** (не переиспользовать существующий) со следующими permissions:

- `campaigns.list`
- `campaigns.details`
- `campaigns.data_series`
- `canvas.list`
- `canvas.details`
- `canvas.data_summary`
- `canvas.data_series`
- `kpi.dau.data_series`
- `kpi.mau.data_series`
- `kpi.new_users.data_series`
- `kpi.uninstalls.data_series`
- `segments.list`
- `segments.details`
- `segments.data_series`
- `purchases.revenue_series`
- `purchases.quantity_series`
- `purchases.product_list`
- `sessions.data_series`
- `events.list`
- `events.data_series`
- `content_blocks.list`
- `custom_attributes.get`

**Не добавлять write-permissions.** Только read-only.

---

### Endpoint Reference

#### 1. Campaigns

**GET `/campaigns/list`**
- Params: `page` (int, 0-indexed), `include_archived` (bool), `sort_direction` (asc/desc)
- Returns: массив `campaigns[]` по 100 штук на страницу
- Каждая кампания: `id`, `name`, `is_api_campaign`, `tags[]`, `last_edited`
- Rate limit: 250,000/час (общий)
- **Для нас:** получить полный список, посчитать total, взять top N по дате

**GET `/campaigns/details`**
- Params: `campaign_id` (required)
- Returns: `name`, `created_at`, `updated_at`, `draft`, `tags[]`, `channels[]`, `messages{}`, `conversion_behaviors[]`, `schedule_type`
- **Для нас:** channels для badge'ей в таблице, status (draft/active)

**GET `/campaigns/data_series`**
- Params: `campaign_id` (required), `length` (days, required), `ending_at` (YYYY-MM-DD)
- Rate limit: **50,000/мин** (отдельный лимит!)
- Returns: массив `data[]`, каждый элемент — один день:
  ```json
  {
    "time": "2025-03-20T00:00:00Z",
    "messages": {
      "email": {
        "sent": 1234,
        "opens": 456,
        "unique_opens": 389,
        "clicks": 78,
        "unique_clicks": 65,
        "unsubscribes": 3,
        "bounces": 12,
        "delivered": 1222,
        "body_clicks": 45,
        "revenue": 0,
        "conversions": 23,
        "conversions1": 5
      },
      "ios_push": {
        "sent": 5000,
        "direct_opens": 200,
        "total_opens": 800,
        "bounces": 50,
        "body_clicks": 150,
        "revenue": 0,
        "conversions": 45
      }
    }
  }
  ```
- **Для нас:** open rate, click rate, sent count по каналам. Это ядро campaign leaderboard.
- **Нюанс:** данные разбиты по message types (email, ios_push, android_push, webhook, in_app_message, web_push, kindle_push). Нужно агрегировать.

#### 2. Canvases

**GET `/canvas/list`**
- Params: `page`, `include_archived`, `sort_direction`
- Returns: массив `canvases[]`, каждый: `id`, `name`, `tags[]`, `last_edited`

**GET `/canvas/details`**
- Params: `canvas_id` (required)
- Returns: `name`, `created_at`, `updated_at`, `draft`, `tags[]`, `steps[]`, `variants[]`, `channels[]`
- **Для нас:** структура canvas'а (сколько steps, какие каналы)

**GET `/canvas/data_summary`**
- Params: `canvas_id`, `length` (days), `ending_at`, `include_variant_breakdown` (bool)
- Returns: объект `data` с `stats{}`:
  ```json
  {
    "data": {
      "name": "Onboarding Flow",
      "stats": {
        "total_entries": 15000,
        "total_messages_sent": 42000,
        "total_conversions": 3200,
        "total_revenue": 45000
      }
    }
  }
  ```
- **Для нас:** сравнительная таблица канвасов

**GET `/canvas/data_series`**
- Params: `canvas_id`, `length`, `ending_at`, `include_variant_breakdown`
- Returns: массив `data[]` с ежедневными метриками
- **Для нас:** тренды по канвасам

#### 3. KPIs

**GET `/kpi/dau/data_series`**
- Params: `length` (days), `ending_at`
- Returns: `data[]` — `{ "time": "...", "dau": 12345 }`

**GET `/kpi/mau/data_series`**
- Params: `length`, `ending_at`
- Returns: `data[]` — `{ "time": "...", "mau": 123456 }`

**GET `/kpi/new_users/data_series`**
- Params: `length`, `ending_at`
- Returns: `data[]` — `{ "time": "...", "new_users": 234 }`

**GET `/kpi/uninstalls/data_series`**
- Params: `length`, `ending_at`
- Returns: `data[]` — `{ "time": "...", "uninstalls": 56 }`

**Для нас:** четыре графика трендов. DAU и MAU — главные KPI-карточки.

#### 4. Revenue & Purchases

**GET `/purchases/revenue_series`**
- Params: `length`, `ending_at`
- Returns: `data[]` — `{ "time": "...", "revenue": 1234.56 }`

**GET `/purchases/quantity_series`**
- Params: `length`, `ending_at`
- Returns: `data[]` — `{ "time": "...", "quantity": 456 }`

**GET `/purchases/product_list`**
- Params: `page`
- Returns: `products[]` — список product IDs
- **Для нас:** понять, какие продукты трекаются

#### 5. Segments

**GET `/segments/list`**
- Params: `page`, `sort_direction`
- Returns: `segments[]` — `id`, `name`, `analytics_tracking_enabled`, `tags[]`
- **Важно:** только сегменты с `analytics_tracking_enabled: true` имеют data_series

**GET `/segments/details`**
- Params: `segment_id`
- Returns: `name`, `description`, `text_description` (human-readable filter description), `tags[]`
- **Для нас:** `text_description` полезен для AI-интерпретации позже

**GET `/segments/data_series`**
- Params: `segment_id`, `length`
- Returns: `data[]` — `{ "time": "...", "size": 45000 }`
- **Для нас:** тренд размера сегмента. Растёт или сокращается?

#### 6. Sessions

**GET `/sessions/data_series`**
- Params: `length`, `ending_at`
- Returns: `data[]` — `{ "time": "...", "count": 78000 }`

#### 7. Custom Events

**GET `/events/list`**
- Returns: `events[]` — список custom event names
- **Для нас:** понять, какие события трекаются (purchase, signup, add_to_cart и т.д.)

**GET `/events/data_series`**
- Params: `event` (name), `length`, `unit` (hour/day/week/month)
- Returns: `data[]` с count по периодам

#### 8. Custom Attributes

**GET `/custom_attributes`**
- Params: `page`
- Returns: `custom_attributes[]` — `name`, `description`, `data_type`, `tags[]`, `status`
- **Для нас:** понять, какие атрибуты пользователей существуют (language, country, device_type и т.д.)

---

## Rate Limits — критически важно

| Endpoint | Rate Limit | Наш паттерн |
|----------|-----------|-------------|
| `/campaigns/list` | 250,000/час | 1-3 вызова при загрузке |
| `/campaigns/details` | 250,000/час | N вызовов (по числу кампаний) |
| `/campaigns/data_series` | **50,000/мин** | N вызовов — самый горячий endpoint |
| `/canvas/*` | 250,000/час | Аналогично campaigns |
| `/kpi/*` | 250,000/час | 4 вызова при загрузке |
| `/purchases/*` | 250,000/час | 2-3 вызова |
| `/segments/list` | 250,000/час | 1-2 вызова |
| `/segments/data_series` | 250,000/час | N вызовов (по числу сегментов) |

### Стратегия оптимизации

1. **Кеширование на backend:** TTL 5-15 минут для всех endpoints. Данные меняются медленно — нет смысла бить API при каждом F5.

2. **Параллельные вызовы:** `Promise.all()` для независимых endpoints (KPIs, segments, campaigns можно дёргать одновременно).

3. **Пагинация:** campaigns и canvases приходят по 100 штук. Для MVP берём первые 1-2 страницы (100-200 кампаний).

4. **Lazy loading details:** НЕ дёргать `data_series` для всех кампаний сразу. Дёргать только для top-10 (по дате или по тегу). Остальные — по клику.

5. **Background refresh:** Данные обновляются раз в 5-15 минут через `setInterval` или ISR (Incremental Static Regeneration в Next.js).

---

## UI: четыре блока экрана

### Блок 1: KPI-карточки (верх экрана)

Четыре карточки в ряд:

| Карточка | Источник | Что показываем |
|---------|---------|---------------|
| DAU | `/kpi/dau/data_series` | Последнее значение + % изменения vs прошлая неделя |
| MAU | `/kpi/mau/data_series` | Последнее значение + % изменения |
| Revenue (7d) | `/purchases/revenue_series` | Сумма за последние 7 дней + % vs предыдущие 7 |
| Active campaigns | `/campaigns/list` | Подсчёт не-archived кампаний |

Для расчёта % изменения: берём среднее за последние 7 дней vs среднее за предыдущие 7 дней.

### Блок 2: Trend Charts (середина)

Два графика рядом (grid 2 колонки):

1. **DAU / MAU / Sessions** — три линии на одном графике за 30 дней
2. **Revenue + Purchase quantity** — два графика наложенные за 30 дней

Библиотека: Recharts (AreaChart с прозрачным fill).

### Блок 3: Campaign Leaderboard (таблица)

Таблица с колонками:

| Колонка | Источник | Примечание |
|---------|---------|-----------|
| Campaign name | `campaigns/list` → `campaigns/details` | Truncate на 280px |
| Channel | `campaigns/details` → `channels[]` | Badge'и: email, push, in_app |
| Sent (7d) | `campaigns/data_series` → sum(sent) | Агрегация по дням |
| Open rate | `campaigns/data_series` → unique_opens / sent | Только для email |
| Click rate | `campaigns/data_series` → unique_clicks / sent | Только для email |
| Conversions | `campaigns/data_series` → sum(conversions) | Все каналы |

Сортировка по умолчанию: по sent (desc). Возможность сортировать по любой колонке.

**Формула open rate:**
```
open_rate = sum(unique_opens за 7 дней) / sum(sent за 7 дней) × 100
```

**Формула click rate:**
```
click_rate = sum(unique_clicks за 7 дней) / sum(sent за 7 дней) × 100
```

**Цветовая кодировка:**
- Open rate: ≥25% зелёный, 15-25% жёлтый, <15% красный
- Click rate: ≥3% зелёный, 1-3% жёлтый, <1% красный

### Блок 4: Canvas Comparison + Segment Health

Две таблицы:

**Canvas comparison:**

| Колонка | Источник |
|---------|---------|
| Canvas name | `canvas/list` |
| Entries (7d) | `canvas/data_summary` → total_entries |
| Messages sent | `canvas/data_summary` → total_messages_sent |
| Conversions | `canvas/data_summary` → total_conversions |
| Revenue | `canvas/data_summary` → total_revenue |

**Segment health:**

| Колонка | Источник |
|---------|---------|
| Segment name | `segments/list` |
| Current size | `segments/data_series` → last value |
| Trend (7d) | `segments/data_series` → % change |
| Sparkline | `segments/data_series` → mini chart |

Только сегменты с `analytics_tracking_enabled: true`.

---

## Что мы НЕ можем посчитать из этих данных

Это критически важно для честного понимания ограничений:

| Метрика | Почему нет | Когда появится |
|---------|-----------|---------------|
| Touches per user (frequency pressure) | Нет user-level данных | BigQuery + Currents |
| Cross-channel overlap | Нет пересечения на уровне пользователей | BigQuery + Currents |
| Cohort retention | Нет когортных данных | BigQuery |
| Связка CRM → повторная покупка | Нет attribution на уровне пользователя | BigQuery + Currents |
| Распределение сегмента по языку/гео | Нет атрибутов пользователей | BigQuery или bulk export |
| A/B test результаты с significance | Braze API не отдаёт confidence intervals | Braze dashboard или расчёт вручную |

---

## Переменные окружения

```env
# .env.local (Vercel Environment Variables)
BRAZE_API_KEY=your-braze-rest-api-key
BRAZE_REST_ENDPOINT=https://rest.iad-XX.braze.com
```

Найти свои значения:
- API Key: Braze Dashboard → Settings → APIs and Identifiers → Create New API Key
- REST Endpoint: там же, внизу страницы

---

## Структура файлов проекта

```
crm-copilot/
├── app/
│   ├── layout.tsx              # Root layout + meta + fonts
│   ├── page.tsx                # Main dashboard page (client component)
│   ├── globals.css             # Global styles
│   ├── api/
│   │   └── braze/
│   │       └── route.ts        # API proxy — aggregates all Braze calls
│   ├── lib/
│   │   └── braze.ts            # Braze REST API client (server-only)
│   └── components/
│       ├── KPICard.tsx          # Single KPI metric card
│       ├── MiniChart.tsx        # Small area chart (Recharts)
│       ├── CampaignTable.tsx    # Campaign leaderboard table
│       ├── CanvasTable.tsx      # Canvas comparison table
│       └── SegmentHealth.tsx    # Segment trend table with sparklines
├── public/
├── package.json
├── next.config.js
├── tsconfig.json
├── .env.example
├── .env.local                  # НЕ коммитить
└── .gitignore
```

---

## Data Flow при загрузке страницы

1. Пользователь открывает `app.vercel.app`
2. React рендерит loading state (spinner)
3. `useEffect` вызывает `fetch('/api/braze')`
4. API Route (`app/api/braze/route.ts`) выполняет:
   - `Promise.all([getCampaignList(), getCanvasList(), getDAUSeries(), ...])`
   - Для top-N кампаний: `getCampaignDetails()` + `getCampaignDataSeries()`
   - Для top-N канвасов: `getCanvasDataSummary()`
   - Для сегментов с analytics: `getSegmentDataSeries()`
5. Backend собирает один большой JSON `snapshot`
6. React получает JSON и рендерит все четыре блока
7. Кеш на backend: следующий запрос в течение 5 мин отдаёт cached версию

**Примерное время загрузки:** 3-8 секунд (зависит от количества кампаний и параллелизма).

---

## Deployment на Vercel

```bash
# Инициализация
npx create-next-app@latest crm-copilot --typescript --app
cd crm-copilot

# Установить зависимости
npm install recharts

# Локальная разработка
cp .env.example .env.local
# Заполнить BRAZE_API_KEY и BRAZE_REST_ENDPOINT
npm run dev

# Deploy
npx vercel --prod

# Environment variables в Vercel
vercel env add BRAZE_API_KEY
vercel env add BRAZE_REST_ENDPOINT
```

---

## Следующие шаги (после Контура 1)

**Пятница 2 — AI Summary:**
Backend отправляет snapshot JSON в Claude API с промптом "напиши weekly brief на русском". Claude возвращает текстовую сводку. Добавляем блок "AI Brief" вверху дашборда.

**Пятница 3 — Гипотезы:**
Claude анализирует аномалии в данных и предлагает 3-5 тестов. Добавляем блок "Suggested tests".

**Пятница 4 — Shareable view:**
Добавляем URL-параметры для фильтрации (date range, tags). Возможность шарить ссылку стейкхолдеру.

**Контур 2 — User-level drill-down:**
Подключение `/users/export/segment` (async) или BigQuery (когда CDI/Currents настроены) для сегментации по атрибутам пользователей.
