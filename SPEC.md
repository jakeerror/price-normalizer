# SPEC.md — Price-Normalizer

Сервис нормализации прайс-листов поставщиков: принимает прайсы в разных форматах
(CSV, XLSX), приводит их к единому каноническому каталогу, сопоставляет позиции с
эталонной номенклатурой («это тот же товар») и отдаёт чистые структурированные
данные и цены по API. Компаньон к системе закупок Mini-SRM.

> Статус документа: **на ревью (шаг 1)**. Код не пишется, пока этот файл не утверждён.

---

## 1. Назначение и границы

Price-Normalizer превращает хаотичные прайсы поставщиков в чистый каталог с ценами,
пригодный для потребления системой закупок.

**В границах v1:**
- Загрузка прайсов в форматах **CSV и XLSX**.
- Конвейер обработки батча с явными стадиями и строгой серверной валидацией переходов.
- Нормализация: числа, единицы измерения, валюты, названия.
- Сопоставление позиции с эталонной номенклатурой: **точный матч по артикулу → fallback fuzzy по названию** с оценкой уверенности; спорные — на ручной разбор.
- Справочники: поставщики и эталонная номенклатура (кэш в Redis).
- Фоновая обработка батча через очередь (BullMQ) + rate limiting на загрузку.
- Экспорт чистого каталога для Mini-SRM (эндпоинт JSON/CSV).
- Две роли (operator / viewer), JWT-аутентификация, два сид-пользователя.
- Фронтенд: загрузка + список батчей, экран ручного разбора матчей, каталог, сравнение цен.

**Вне границ v1 (осознанно):**
- Парсинг PDF-прайсов (stretch на будущее).
- Прямые интеграции с API поставщиков.
- Обучаемый ML-классификатор (матчинг — детерминированный: артикул + строковое сходство).
- Мультитенантность, сложная регистрация/refresh-токены.
- Полноценный push/webhook в Mini-SRM (в v1 — экспорт по запросу, см. §8).

---

## 2. Роли и права

| Роль | Код | Права |
|------|-----|-------|
| Оператор | `operator` | Загружает прайсы, перезапускает обработку, разбирает спорные матчи, ведёт эталонный каталог и поставщиков (CRUD). |
| Наблюдатель | `viewer` | Только чтение: каталог, сравнение цен, батчи и их статусы. |

Аутентификация — JWT, два сид-пользователя (`operator@example.com`, `viewer@example.com`).

---

## 3. Доменная модель (сущности и поля)

Общие поля всех таблиц: `id` (bigint PK), `created_at`, `updated_at` (timestamptz).
Деньги — `numeric`, не float. Названия сущностей — по-английски (код), метки UI — русские.

### 3.1 User
| Поле | Тип | Ограничения |
|------|-----|-------------|
| id | bigint | PK |
| email | varchar(255) | unique, not null |
| full_name | varchar(255) | not null |
| password_hash | varchar(255) | not null (bcrypt; в API не отдаётся) |
| role | enum(`operator`,`viewer`) | not null |
| is_active | boolean | default true |

### 3.2 Supplier
| Поле | Тип | Ограничения |
|------|-----|-------------|
| id | bigint | PK |
| name | varchar(255) | not null |
| inn | varchar(12) | unique, not null (10/12 цифр) |
| contact_person | varchar(255) | nullable |
| email | varchar(255) | nullable |

### 3.3 CanonicalProduct (эталонная номенклатура)
| Поле | Тип | Ограничения |
|------|-----|-------------|
| id | bigint | PK |
| name | varchar(255) | not null |
| normalized_name | varchar(255) | not null, indexed (для fuzzy) |
| article | varchar(64) | nullable, unique (для точного матча) |
| category | varchar(128) | not null, indexed |
| base_unit | varchar(32) | not null (нормализованная: `pcs`,`kg`,`m`,`l`,`pack`…) |
| is_active | boolean | default true |

> Кэшируется в Redis (см. §7).

### 3.4 ImportBatch (загрузка прайса)
| Поле | Тип | Ограничения |
|------|-----|-------------|
| id | bigint | PK |
| supplier_id | fk → Supplier | not null |
| uploaded_by | fk → User | not null |
| filename | varchar(255) | not null |
| format | enum(`csv`,`xlsx`) | not null |
| status | enum (см. §5) | not null, default `uploaded` |
| total_rows | int | default 0 |
| matched_count | int | default 0 (auto-сматчено) |
| review_count | int | default 0 (в ручном разборе) |
| error | text | nullable (при `failed`) |

### 3.5 RawRow (сырая строка файла)
| Поле | Тип | Ограничения |
|------|-----|-------------|
| id | bigint | PK |
| batch_id | fk → ImportBatch | not null, ondelete CASCADE, indexed |
| row_index | int | not null |
| raw_data | jsonb | not null (исходные ячейки как есть) |
| parse_error | text | nullable |

### 3.6 PriceOffer (нормализованная позиция)
| Поле | Тип | Ограничения |
|------|-----|-------------|
| id | bigint | PK |
| batch_id | fk → ImportBatch | not null, ondelete CASCADE, indexed |
| raw_row_id | fk → RawRow | not null |
| supplier_id | fk → Supplier | not null, indexed |
| canonical_product_id | fk → CanonicalProduct | nullable (до разрешения) |
| raw_name | varchar(512) | not null |
| normalized_name | varchar(512) | not null |
| raw_article | varchar(64) | nullable |
| price | numeric(14,2) | not null, >= 0 |
| currency | varchar(3) | not null (`RUB`/`USD`/`EUR`) |
| normalized_unit | varchar(32) | not null |
| confidence | numeric(4,3) | nullable (0..1, у fuzzy) |
| match_method | enum(`article`,`fuzzy`,`manual`,`none`) | not null, default `none` |
| match_status | enum (см. §5.3) | not null |
| match_candidates | jsonb | nullable (top-N кандидатов с score для UI разбора) |
| reviewed_by | fk → User | nullable |

---

## 4. ER (кратко)

```
User 1──N ImportBatch N──1 Supplier
              │ 1──N
              ▼
           RawRow 1──1 PriceOffer N──0..1 CanonicalProduct
                                   (сматчена с эталоном)
```

---

## 5. Ядро проекта — конвейер и матчинг

### 5.1 Стадии ImportBatch (жизненный цикл)

```
uploaded → parsing → parsed → normalizing → needs_review → completed
                │                    │
             (ошибка)             (ошибка)
                ▼                    ▼
              failed               failed
```
Если после нормализации спорных позиций нет — `normalizing → completed` напрямую.
`completed` и `failed` — терминальные.

### 5.2 Таблица разрешённых переходов (single source of truth)

Реализуется явной структурой `dict[(status, action)] -> Transition`, **не набором if**.
Недопустимая пара (status, action) → **409 Conflict**.

| action | from | → to | Кто/что инициирует | Условие |
|--------|------|------|--------------------|---------|
| `start_parse` | uploaded | parsing | worker | — |
| `parse_ok` | parsing | parsed | worker | строки извлечены |
| `parse_fail` | parsing | failed | worker | ошибка чтения файла |
| `start_normalize` | parsed | normalizing | worker | — |
| `to_review` | normalizing | needs_review | worker | есть позиции ниже порога |
| `auto_complete` | normalizing | completed | worker | все позиции авто-сматчены |
| `normalize_fail` | normalizing | failed | worker | ошибка нормализации |
| `finish_review` | needs_review | completed | operator | не осталось позиций в разборе |
| `retry` | failed | uploaded | operator | перезапуск обработки |

### 5.3 Статусы позиции (PriceOffer.match_status)

`auto_matched` (сматчено автоматически, resolved) · `needs_review` (ждёт оператора) ·
`confirmed` (оператор подтвердил кандидата) · `manual_matched` (оператор выбрал другой эталон) ·
`new_product` (оператор создал новый эталон) · `rejected` (позиция отброшена).

### 5.4 Алгоритм нормализации («хаос → структура»)

1. **Числа**: `"1 234,56"`, `"1,234.56"`, `"1234.56"` → `1234.56`.
2. **Единицы**: таблица синонимов (`шт/шт./pcs → pcs`, `кг/kg → kg`, `уп/упак → pack`, `м/m`, `л/l`).
3. **Валюта**: `₽/руб/RUB → RUB`, `$/USD`, `€/EUR`; дефолт — `RUB`.
4. **Название**: lower-case, схлопывание пробелов, удаление лишней пунктуации → `normalized_name`.

Парсинг форматов: CSV (разные разделители/кодировки, автоопределение шапки),
XLSX (SheetJS, поиск строки-заголовка среди верхних строк). Маппинг колонок
(«наименование», «цена», «ед.», «артикул») — по словарю синонимов заголовков.

### 5.5 Матчинг позиции к эталону (изюминка)

```
1. Если raw_article задан и нормализованный совпал с CanonicalProduct.article
   → match_method=article, confidence=1.0, status=auto_matched.
2. Иначе fuzzy: строковое сходство normalized_name ↔ эталоны (коэффициент Дайса).
   best = максимум по каталогу.
     best >= HIGH (по умолч. 0.90) → auto_matched (method=fuzzy)
     LOW <= best < HIGH (0.60..0.90) → needs_review, сохранить top-3 в match_candidates
     best < LOW → needs_review без кандидата (оператор создаёт новый товар)
```
Пороги `MATCH_HIGH`/`MATCH_LOW` — из переменных окружения. Каталог для матчинга берётся
из Redis-кэша (см. §7).

### 5.6 Контракт разрешения позиции
`resolveOffer(offer, action, actor, payload)`:
1. позиция должна быть в `needs_review`, иначе 409;
2. `action ∈ {confirm, match, new, reject}`; `match` требует `canonical_product_id`, `new` — данные нового товара (иначе 422);
3. применить, проставить `match_status`/`reviewed_by`;
4. пересчитать счётчики батча; если `review_count == 0` → перевести батч `needs_review → completed`.

---

## 6. Матрица прав (сводно)

| Действие | operator | viewer |
|----------|:--------:|:------:|
| Загрузка/ретрай батча | ✅ | ❌ |
| Разбор матчей (resolve) | ✅ | ❌ |
| CRUD каталога/поставщиков | ✅ | ❌ |
| Чтение батчей/каталога/цен | ✅ | ✅ |
| Экспорт для Mini-SRM | ✅ | ✅ |

---

## 7. Использование Redis (не декоративное)

1. **Кэш эталонного каталога** — `GET /products` (+ used by matcher). Ключи
   `catalog:list:<hash>` / `catalog:item:<id>`, TTL 300с; инвалидация при любой мутации каталога.
2. **Фоновая обработка батча** — очередь **BullMQ** `imports`. Воркер выполняет
   `parse → normalize → match`, двигая батч по стадиям через ту же таблицу переходов;
   прогресс отражается в счётчиках батча (клиент опрашивает `GET /batches/:id`).
3. **Rate limiting** — на `POST /auth/login` и `POST /batches` (загрузка). Превышение → **429**.

---

## 8. API-эндпоинты

Префикс `/api/v1`. JSON (кроме экспорта CSV). Auth: `Authorization: Bearer <JWT>`, кроме `/auth/login` и `/health`.

### Auth
| Метод | Путь | Роль | Описание |
|-------|------|------|----------|
| POST | `/auth/login` | — | Логин, JWT. **Rate limited** |
| GET | `/auth/me` | любая | Текущий пользователь |

### Suppliers
| Метод | Путь | Роль | Описание |
|-------|------|------|----------|
| GET | `/suppliers` | любая | Список |
| POST/PUT/DELETE | `/suppliers[/:id]` | operator | CRUD (DELETE → 409, если есть батчи) |

### Canonical catalog (кэш)
| Метод | Путь | Роль | Описание |
|-------|------|------|----------|
| GET | `/products` | любая | Список (поиск, категория, пагинация); **кэш** |
| GET | `/products/:id` | любая | Один товар; **кэш** |
| POST/PUT/DELETE | `/products[/:id]` | operator | CRUD; **инвалидация кэша** |
| GET | `/products/:id/offers` | любая | Цены на товар у разных поставщиков (сравнение) |

### Imports (батчи)
| Метод | Путь | Роль | Описание |
|-------|------|------|----------|
| POST | `/batches` | operator | multipart: `supplier_id` + `file` → создать батч, поставить в очередь → 202 `{batch_id}`. **Rate limited** |
| GET | `/batches` | любая | Список (фильтр по статусу/поставщику) |
| GET | `/batches/:id` | любая | Батч + счётчики/прогресс |
| GET | `/batches/:id/offers` | любая | Позиции батча (фильтр `?status=needs_review`), с `match_candidates` |
| POST | `/batches/:id/transition` | operator | Явный переход стадии (`{action}`), валидация по таблице §5.2 (напр. `retry`, `finish_review`) |

### Offers (разбор)
| Метод | Путь | Роль | Описание |
|-------|------|------|----------|
| POST | `/offers/:id/resolve` | operator | `{action: confirm｜match｜new｜reject, canonical_product_id?, new_product?}` (§5.6) |

### Export (интеграция с Mini-SRM)
| Метод | Путь | Роль | Описание |
|-------|------|------|----------|
| GET | `/export/catalog?format=json｜csv` | любая | Чистый каталог (товар + лучшие/все цены) в формате под Mini-SRM |

### Service
| Метод | Путь | Роль | Описание |
|-------|------|------|----------|
| GET | `/health` | — | Liveness: БД + Redis |

---

## 9. Стандарт ошибок

Единый формат `{ "message": "...", "statusCode": n }` (стиль Nest exception filter).

| Код | Когда |
|-----|-------|
| 400 | Битый запрос / неподдерживаемый формат файла |
| 401 | Нет/невалидный JWT |
| 403 | Роль не позволяет действие |
| 404 | Ресурс не найден |
| 409 | **Недопустимый переход стадии**; resolve не-`needs_review` позиции; удаление связанной сущности |
| 422 | Нарушение бизнес-правила (нет `canonical_product_id` для `match`, нет данных для `new`) / ошибка валидации DTO |
| 429 | Превышен rate limit |

---

## 10. Структура проекта (предварительно)

```
pet-project/
├── backend/                 # NestJS + TypeScript
│   ├── src/
│   │   ├── auth/ users/ suppliers/ products/ imports/ offers/ export/ health/
│   │   ├── common/          # pipeline (таблица переходов), normalization, matching,
│   │   │                    # errors, cache, rate-limit
│   │   ├── config/
│   │   ├── database/         # TypeORM datasource + миграции
│   │   ├── worker/           # BullMQ processor (parse→normalize→match)
│   │   ├── app.module.ts
│   │   └── main.ts
│   ├── test/                 # Jest (unit + e2e)
│   ├── package.json, tsconfig, nest-cli.json, Dockerfile, .dockerignore
├── frontend/                 # React + TS + Vite + TanStack Query
├── docker-compose.yml        # api, db, redis, worker, web
├── .github/workflows/ci.yml
├── .env.example / .gitignore
├── SPEC.md / DECISIONS.md / README.md
```

---

## 11. Зафиксированные технические решения (детали — в DECISIONS.md)

- ORM: **TypeORM** (+ миграции).
- Форматы v1: **CSV + XLSX** (PDF — вне границ).
- Матчинг: **артикул (точный) → fuzzy по названию** (коэффициент Дайса) с порогами.
- Очередь: **BullMQ** (Redis).
- Интеграция с Mini-SRM: **экспорт-эндпоинт** `GET /export/catalog` (JSON/CSV).
- Переходы стадий: **декларативная таблица** + единый эндпоинт `/batches/:id/transition`.
- Деньги — `numeric`; TS strict; секреты только через env.

---

## 12. План по шагам (с паузами на ревью после каждого)

1. **SPEC.md** — этот документ. ← *сейчас, на ревью*
2. Модели (TypeORM entities) + миграции.
3. API + бизнес-логика: в первую очередь таблица переходов стадий + нормализация + матчинг.
4. Тесты (Jest): переходы стадий (вкл. запрет недопустимого → 409), нормализация, матчинг, ключевые эндпоинты.
5. Redis: кэш каталога + фоновая обработка батча (BullMQ-воркер).
6. Фронтенд: сначала загрузка+список батчей, потом экран разбора матчей, затем каталог и сравнение цен.
7. Docker Compose: api, db, redis, worker, web — одной командой.
8. GitHub Actions `ci.yml` — линтинг + тесты + сборка образов (как в Mini-SRM).
9. README — описание, скриншоты, запуск, схема архитектуры, **+ раздел «Интеграция с Mini-SRM»** (формат `/export/catalog`, как Mini-SRM импортирует каталог, пример запроса/ответа).

Параллельно ведём **DECISIONS.md**: архитектурные решения + раздел «Инциденты» (где AI-код пришлось переписать, найденные баги/уязвимости/неудачные зависимости).

---

## 13. Открытые вопросы к ревью

1. Пороги матчинга по умолчанию: HIGH=0.90, LOW=0.60 — ок?
2. Тесты бэкенда: гонять на **sqlite (better-sqlite3)** для скорости/герметичности или на тестовом Postgres в CI? (предлагаю sqlite для unit/e2e, как sqlite в Mini-SRM)
3. Экспорт `/export/catalog`: отдавать **лучшую цену по каждому товару** или **все цены по поставщикам**? (предлагаю параметр `?mode=best|all`, дефолт `best`)
4. Нужен ли предпросмотр маппинга колонок оператором до обработки, или автоматического маппинга по словарю заголовков достаточно для v1? (предлагаю авто для v1)
