# Canvas Auditor Agent для Braze

AI-агент для аудита Canvas и поиска инсайтов из Braze-аналитики

## 1. В чем идея

Canvas Auditor Agent — это специализированный AI-агент, который **подключается к Braze (через API или MCP)** и автоматически проводит аудит Canvas-кампаний в режиме read-only. Он не отправляет сообщения и не меняет настройки, а **анализирует структуру journeys и их фактическую эффективность** по данным Braze analytics и funnel reports и выдает понятные инсайты и рекомендации.[^1][^2]

Для маркетинговой команды этот агент становится “старшим аналитиком по Canvas”: он регулярно прогоняет все ключевые Canvas, находит узкие места, показывает, где теряются пользователи, как себя ведут варианты, что изменилось после правок и какие эксперименты запускать дальше.[^1]

### Что именно агент делает

- Подключается к Braze workspace по read-only API key или через Braze MCP server.[^2][^1]
- Загружает данные о Canvas: структуру, шаги, ветвления, каналы, задержки, варианта/контроль, conversion goals, re-eligibility, и др.[^1]
- Считывает Canvas analytics и при необходимости funnel reports: entries, sends, proceeds, exits, conversions, conversion rates, revenues, uplift, confidence, changelog.[^2][^1]
- Строит derived метрики: drop-off по шагам, эффективность вариантов, влияние изменений, quality score измерения.[^1]
- Прогоняет Canvas через набор audit rules и выдает **отчет с health score, ключевыми проблемами и конкретными action items**.[^1]

***

## 2. Проблема, которую решает агент

Braze предоставляет мощную аналитику по Canvas, включая step-level performance, variant comparisons, conversion events, funnel reports и revenue attribution. Но на практике маркетинговым и CRM-командам трудно:[^2][^1]

- регулярно просматривать десятки Canvas и “держать в голове” все изменения;
- правильно интерпретировать расхождения между Canvas analytics и funnel reports (разные окна, разные scopes);[^2]
- вовремя замечать, что после изменений (copy, delays, audience, schedule) performance просел;[^1]
- понимать, какие варианты действительно выиграли (есть uplift, но нет confidence, или наоборот);[^1]
- быстро увидеть, где именно в journey максимальный drop-off и из-за чего.[^1]

В итоге много денег теряется на “усталых” Canvas, которые никто системно не ревьюит, и на тестах, выводы по которым делаются слишком рано или, наоборот, никогда. Canvas Auditor Agent делает этот ревью **регулярным, детерминированным и воспроизводимым**, снимая нагрузку с аналитиков и lifecycle-менеджеров.

***

## 3. Что агент оценивает в Canvas

Агент не ограничивается одним числом. Он оценивает Canvas по нескольким **осям качества**, строит derived метрики и собирает holistic картинку здоровья кампании.[^2][^1]

### Основные измерения (score dimensions)

1. **Goal score**
    - Насколько Canvas “завязана” на явную и корректно настроенную conversion goal.
    - Соответствует ли структура journeys заявленной цели (активация, ретеншен, монетизация, реактивация и т.д.).[^3][^4]
2. **Structural score**
    - Complexity: количество шагов, ветвлений, задержек, каналов.
    - Hygiene: нет ли чрезмерно длинных delay цепочек, странных ветвлений, отсутствия контрольного варианта, неконсистентной логики re-eligibility.[^1]
3. **Performance score**
    - Step-level performance: entries, proceeds, exits, delivery, conversions, revenue per step.
    - Где основные потери (drop-off hotspots), какие шаги не дают смысла.[^2][^1]
4. **Experimentation score**
    - Наличие control/variants и корректная экспериментальная постановка.
    - Uplift vs control, statistical confidence, достаточность выборки, корректность выводов.[^1]
5. **Measurement/Trust score**
    - Правильно ли выбраны conversion events и окна (могут ли они давать misleading картину).[^4][^2]
    - Расхождения между Canvas analytics и funnel reports объяснимы (например, разные scopes по entry vs events, разные даты).[^2]
    - Revenue attribution: нет ли ложного впечатления causal эффекта последнего шага, если Braze атрибутирует revenue к most recent message.[^1]

На базе этих измерений агент строит общий **Canvas health score**, но всегда показывает и оси отдельно, чтобы команда видела, где именно проблема: в структуре, в измерении или в фактическом performance.[^2][^1]

***

## 4. Какие данные использует агент

Агент работает строго в **read-only режиме**, используя Braze API и/или Braze MCP server. MCP изначально спроектирован Braze как read-only, non-PII data layer для AI tools и agents, что идеально подходит под use case аудита.[^2][^1]

### Примеры источников внутри Braze

- **Canvas data**
    - Canvas metadata: id, name, status, owner, last modified.
    - Canvas structure: steps, branches, channels, delays, variants, control, conversion goals.[^1]
- **Canvas analytics** (step-level)
    - Entries и re-entries.
    - Sends и deliveries.
    - Proceeds и exits per step.
    - Conversions и conversion rate (по Canvas и по шагу).
    - Revenue и revenue attribution.[^1]
- **Variant analytics**
    - Performance каждого variанта vs control.
    - Uplift, confidence, sample size.[^1]
- **Funnel reports**
    - Ordered sequence conversion events per user.
    - Completion rates, drop-offs per stage.
    - Отдельные окна и scopes vs Canvas analytics.[^5][^2]
- **Change log**
    - Изменения в Canvas и их связь с performance (например, Edit in Progress, schedule changes, audience changes).[^1]

***

## 5. Как работает агент (high-level pipeline)

Агент устроен как **чёткий pipeline**, а не “один LLM prompt”. Это важно для стабильности и воспроизводимости.

### Шаг 1. Intake

- Вход: Canvas ID или список Canvas (например, “топовые revenue-generating journeys”).
- Настройка scope: период анализа (7/14/30 дней), какие KPIs приоритетны, делать ли сравнение с предыдущим периодом.


### Шаг 2. Fetch

- Агент через Braze connector (REST или MCP) считывает структуру и метрики Canvas: metadata, steps, variants, summary analytics, step-level analytics, funnel данные (если подключены).[^2][^1]


### Шаг 3. Normalize

- Все данные приводятся к единой внутренней схеме (`canvas_metadata`, `canvas_structure`, `performance_summary`, `step_metrics`, `variant_metrics`, `funnel_metrics`, `change_log`).[^1]
- Учитываются особенности Braze: например, разная логика подсчета для Canvas analytics vs funnel reports.[^2]


### Шаг 4. Compute

- Считаются derived метрики:
    - step drop-off/proceed rates,
    - conversion yield per step,
    - revenue per entrant/recipient,
    - variance и uplift per variant,
    - impact of recent changes (до/после).[^1]


### Шаг 5. Evaluate (rules engine)

- Набор audit rules (rule packs) проверяет Canvas по каждой оси:
    - Structural hygiene,
    - Performance leakage,
    - Experimentation quality,
    - Measurement pitfalls,
    - Change impact.[^2][^1]


### Шаг 6. Explain (insights)

- Сначала собираются **структурированные findings** (машинные выводы с evidence, severity, confidence).
- Затем LLM или другой генератор объяснений превращает их в удобочитаемый отчет:
    - Executive summary,
    - Top issues,
    - Opportunities,
    - Recommended experiments \& actions.[^1]


### Шаг 7. Store \& Notify

- Результаты сохраняются в собственной БД сервиса (вне Braze).
- Команда получает уведомления (email/Slack/внутренний dashboard) о новых audit runs и важных изменениях health score.[^1]

***

## 6. Примеры инсайтов, которые находит агент

Агент не просто пересказывает метрики; он ищет **паттерны и проблемы**, которые человеку было бы долго или сложно заметить.[^2][^1]

Типичные примеры:

- “Основной drop-off происходит между шагом 2 и 3: proceed rate упал до X%, при этом audience и канал не меняются — вероятно, проблема в delay или содержании сообщения на шаге 2.”[^1]
- “Variant B показывает положительный uplift vs control, но sample и confidence пока недостаточны, чтобы считать вариант победителем — продолжайте тест.”[^1]
- “Canvas conversions выглядят высокими, но funnel report показывает, что большинство целевых событий происходят до получения сообщения на шаге 3 — возможна ошибочная атрибуция.”[^2]
- “После изменения schedule два недели назад revenue per entrant снизился на Y%, хотя entries стабильны — стоит пересмотреть timing или audience.”[^1]
- “Структура Canvas чрезмерно сложная для заданного объема трафика: слишком много ветвлений и вариантов, из-за чего тесты будут очень долго сходиться.”[^1]

***

## 7. Безопасность и модель доступа

Ключевой принцип — агент работает **read-only** и **никогда не хранит или не обрабатывает PII**. Он использует агрегированные и операционные данные Braze.[^2][^1]

### Как подключается клиентский Braze workspace

1. Клиент создает в Braze **отдельный REST API key** (или MCP key) со строго ограниченными read-only permissions (Canvas analytics и сопутствующие endpoints).[^2][^1]
2. Ключ добавляется в сервис через secure onboarding форму и хранится только на backend, в зашифрованном виде/secret manager.
3. Backend вызывает Braze API/MCP от имени клиента, но клиенты и UI **никогда не видят ключи**.[^1]
4. По возможности используется IP allowlisting на стороне Braze для этого ключа (ограничение на egress IP сервиса).[^1]

### Security-гарантии

- Только read-only scope: агент не может отправлять сообщения, изменять Canvas, модифицировать audience и т.п.[^2]
- Tenant isolation: данные разных клиентов разделены по workspace/tenant.
- Нет PII: используется агрегированная аналитика и объектная структура Canvas, а не raw user data.[^2]
- Audit log: фиксируются подключения, запуски аудитов, used scopes, но не чувствительные значения.[^1]

***

## 8. Как это может быть упаковано как продукт

Изначально агент создается **in-house** для внутренней команды, а затем превращается в внешний сервис.

### In-house фаза

- Быстрый прототип через Braze MCP (Claude/Cursor/Gemini + MCP server).[^2]
- Проверка ценности: какие инсайты действительно помогают менять Canvas и улучшать метрики.
- Наработка правил и rubric, адаптированных под конкретный бизнес.


### External SaaS / Usage-based сервис

- Backend-first multi-tenant архитектура с собственным API и UI.[^1]
- Onboarding клиентов: customer-managed read-only Braze API key.[^2][^1]
- Billing:
    - Subscription: покрытие N Canvas + scheduled audits + alerts.
    - Usage-based: плата за аудит Canvas, за объем обработанных journeys или за частоту проверок.

***

## 9. Для кого этот агент

- CRM/Retention маркетологи, которые ведут десятки Canvas и хотят системный health check.
- Growth/LCM команды, которые запуская A/B/N Canvas-тесты, но не успевают глубоко и регулярно их анализировать.
- Data/Insights команды, которым нужен стандартный audit rubric по Braze Canvas и снижение manual работы.

***

## 10. Краткое резюме

Canvas Auditor Agent — это **узкоспециализированный AI-аналитик** для Braze, который:[^2][^1]

- работает в read-only режиме через Braze API/MCP;
- понимает структуру Canvas и особенности Braze analytics/funnel reporting;
- оценивает Canvas по нескольким осям качества и строит health score;
- регулярно генерирует понятные, actionable инсайты и рекомендации;
- безопасен для enterprise-окружений и может быть развернут как отдельный B2B-продукт (subscription или usage-based).

<div align="center">⁂</div>

[^1]: https://www.reddit.com/r/webscraping/comments/1kjvde4/building_own_deep_research_agent_with_mcpuse/

[^2]: https://www.youtube.com/watch?v=oPqgYiXm5Ws

[^3]: https://www.braze.com/docs/user_guide/engagement_tools/canvas/get_started/the_basics/

[^4]: https://www.braze.com/docs/user_guide/engagement_tools/messaging_fundamentals/conversion_events/

[^5]: https://www.braze.com/docs/user_guide/analytics/reporting/funnel_reports/

