## ADDED Requirements

### Requirement: GET /api/forecast/groups returns 3 real months + 3 forecast months by group
The system SHALL provide an authenticated endpoint `GET /api/forecast/groups` that returns monthly spending by budget group (Necessidades, Desejos, Poupança) combining real data from `cube_gastos_mensais` (last 3 months) and predictions from `forecast_predictions` (next 3 months).

#### Scenario: Response combines real and forecast data
- **WHEN** an authenticated request is made to `GET /api/forecast/groups`
- **THEN** the response contains a `months` array where each item has: `year`, `month`, `type` (`'real'` or `'forecast'`), `group_pt`, `amount`
- **AND** items with `type = 'forecast'` also include `lower_bound` and `upper_bound`
- **AND** the array covers the last 3 complete months (real) and the next 3 months (forecast)

#### Scenario: No forecast data returns empty forecast months
- **WHEN** an authenticated request is made and `forecast_predictions` has no rows for the tenant
- **THEN** the response returns `{ "has_forecast": false, "months": [] }` for forecast months
- **AND** real months are still returned normally

#### Scenario: Endpoint requires authentication
- **WHEN** a request is made without a valid Bearer token
- **THEN** the response is 401 Unauthorized

### Requirement: GET /api/forecast/categories returns 3 real months + 3 forecast months by category
The system SHALL provide an authenticated endpoint `GET /api/forecast/categories` that returns monthly spending per category combining real and forecast data, following the same structure as `/api/forecast/groups`.

#### Scenario: Response includes category and group classification
- **WHEN** an authenticated request is made to `GET /api/forecast/categories`
- **THEN** each item in `months` includes: `year`, `month`, `type`, `category_pt`, `group_pt`, `amount`
- **AND** forecast items also include `lower_bound` and `upper_bound`

### Requirement: GET /api/forecast/message returns today's AI message for the tenant
The system SHALL provide an authenticated endpoint `GET /api/forecast/message` that returns the AI-generated forecast message for the current day.

#### Scenario: Message available for today
- **WHEN** an authenticated request is made to `GET /api/forecast/message`
- **AND** `forecast_ai_messages` has a row for the tenant and today's date
- **THEN** the response contains: `{ "has_message": true, "message_pt": "...", "message_date": "YYYY-MM-DD" }`

#### Scenario: No message available
- **WHEN** an authenticated request is made and no message exists for today
- **THEN** the response is `{ "has_message": false, "message_pt": null, "message_date": null }`
