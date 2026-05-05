# Backend API

Цей документ описує актуальний backend API для `Security Room System` і пояснює, як backend працює разом з `ESP32`, `MQTT`, `MongoDB`, `Socket.IO`, Web Push та Telegram.

## 1. Загальна схема

Система працює так:

1. `ESP32` публікує повідомлення в `MQTT broker`.
2. Backend слухає MQTT topics і обробляє:
   - `status`
   - `heartbeat`
   - `telemetry`
   - `alarm`
   - `event`
3. Backend зберігає дані в `MongoDB`.
4. Backend надає `REST API` для frontend.
5. Backend шле `Socket.IO` події для live-оновлень.
6. Користувачі входять через `JWT`.
7. Backend також може надсилати сповіщення через:
   - `Web Push`
   - `Telegram`

## 2. Base URL

Локально:

```text
http://localhost:4000
```

API-префікс:

```text
/api
```

Приклад:

```text
http://localhost:4000/api/health
```

## 3. Поточні backend-модулі

- `health`
- `auth`
- `users`
- `devices`
- `rooms`
- `provisioning`
- `commands`
- `telemetry`
- `room current state`
- `alarms`
- `events`
- `push-subscriptions`
- `telegram`
- `system-settings`

## 4. MQTT topics

### Device-level

- `security/devices/+/status`
- `security/devices/+/heartbeat`

### Room-level

- `security/rooms/+/status`
- `security/rooms/+/heartbeat`
- `security/rooms/+/telemetry`
- `security/rooms/+/alarm`
- `security/rooms/+/event`

### Command topic

Backend публікує команди в:

```text
security/devices/<deviceId>/cmd
```

## 5. Логіка по типах MQTT-повідомлень

### `status`

Використовується для:

- оновлення `Device`
- підтвердження `PROVISIONED`
- оновлення `room current state`
- обробки `ALARM_RESET`
- обробки `ALARM_CLEARED`
- обробки `FACTORY_RESET`

### `heartbeat`

Використовується для:

- оновлення `lastSeenAt`
- позначення `online: true`
- оновлення `wifiOk`, `mqttOk`
- підтримки `room current state`

### `telemetry`

Використовується для:

- запису в `telemetry_history`
- оновлення `room_current_states`
- оновлення короткого стану кімнати в `rooms`

### `alarm`

Використовується для:

- запису в `alarms`
- оновлення alarm-стану кімнати
- відправки `Socket.IO`
- відправки `Web Push`
- відправки `Telegram`

### `event`

Використовується для:

- запису в `events`
- підтвердження provisioning через `DEVICE_PROVISIONED`
- аудиту подій пристрою на кшталт `FACTORY_RESET`

## 6. Offline detection

Backend має background job, яка:

- регулярно перевіряє `lastSeenAt`
- якщо від пристрою давно не було `heartbeat/status`, він стає `offline`

Керуючі env-параметри:

```env
DEVICE_OFFLINE_THRESHOLD_MS=30000
DEVICE_OFFLINE_CHECK_INTERVAL_MS=10000
```

## 7. Environment variables

Основні змінні:

```env
NODE_ENV=development
PORT=4000
CLIENT_ORIGIN=http://localhost:5173

MONGODB_URI=mongodb://localhost:27017/security-room-system

JWT_SECRET=security-room-system-dev-secret
JWT_EXPIRES_IN=12h

ADMIN_LOGIN=admin
ADMIN_PASSWORD=admin
ADMIN_NAME=System Administrator

WEB_PUSH_SUBJECT=mailto:admin@security-room.local
WEB_PUSH_PUBLIC_KEY=<public vapid key>
WEB_PUSH_PRIVATE_KEY=<private vapid key>

MQTT_URL=mqtt://localhost:1883
MQTT_USERNAME=
MQTT_PASSWORD=
MQTT_CLIENT_ID=security-room-system-backend
MQTT_TOPIC_ROOT=security
MQTT_DEVICE_TOKEN=room101_secure_token

DEVICE_OFFLINE_THRESHOLD_MS=30000
DEVICE_OFFLINE_CHECK_INTERVAL_MS=10000
```

Примітки:

- `Telegram` бот більше не конфігурується через `.env`
- `bot username` і `bot token` задаються адміністратором через `Settings` у UI
- при першому запуску backend автоматично створює дефолтного адміна:
  - `login: admin`
  - `password: admin`
  - `name: System Administrator`

## 8. Auth

Усі захищені маршрути вимагають:

```text
Authorization: Bearer <jwt>
```

### `POST /api/auth/login`

Вхід у систему.

Request body:

```json
{
  "login": "admin",
  "password": "admin"
}
```

Response:

```json
{
  "accessToken": "<jwt>",
  "user": {
    "_id": "6801a3f6f0e5f7b7c7f70001",
    "login": "admin",
    "name": "System Administrator",
    "role": "admin",
    "isActive": true,
    "lastLoginAt": "2026-04-18T12:00:00.000Z",
    "createdAt": "2026-04-18T11:59:00.000Z",
    "updatedAt": "2026-04-18T12:00:00.000Z"
  }
}
```

Response `401`:

```json
{
  "message": "Invalid login or password"
}
```

### `GET /api/auth/me`

Повертає поточного користувача.

## 9. REST API

### `GET /`

Перевірка, що backend запущений.

### `GET /api/health`

Сервісний health endpoint.

## 10. Devices

Усі `devices` endpoints вимагають авторизацію.

### `GET /api/devices`

Повертає список усіх відомих пристроїв.

Query params:

- `online=true|false`
- `provisioned=true|false`

### `GET /api/devices/unprovisioned`

Повертає лише ті пристрої, які ще не прив'язані до кімнати.

### `GET /api/devices/:deviceId`

Повертає один пристрій по `deviceId`.

### `GET /api/devices/:deviceId/commands`

Повертає історію команд для конкретного пристрою.

Query params:

- `limit=1..500`

### `POST /api/devices/:deviceId/factory-reset`

Відправляє команду `FACTORY_RESET`.

Права:

- лише `admin`

Response `202`:

```json
{
  "success": true,
  "topic": "security/devices/esp32-A3C9C8/cmd",
  "payload": {
    "deviceId": "esp32-A3C9C8",
    "deviceToken": "room101_secure_token",
    "action": "FACTORY_RESET",
    "roomId": "room101"
  },
  "command": {
    "_id": "6801a410f0e5f7b7c7f70020",
    "action": "FACTORY_RESET",
    "status": "published"
  }
}
```

## 11. Rooms

Усі `rooms` endpoints вимагають авторизацію.

Права:

- `GET` маршрути доступні будь-якому авторизованому користувачу
- `POST`, `PATCH` і room commands доступні для `admin` або `operator`

### `GET /api/rooms`

Повертає список кімнат.

### `POST /api/rooms`

Створює нову кімнату.

### `GET /api/rooms/:roomId`

Повертає кімнату по `roomId`.

### `PATCH /api/rooms/:roomId`

Частково оновлює кімнату.

### `GET /api/rooms/:roomId/state`

Повертає поточний агрегований стан кімнати.

### `GET /api/rooms/:roomId/telemetry`

Повертає історію телеметрії для кімнати.

### `GET /api/rooms/:roomId/alarms`

Повертає alarms для кімнати.

### `GET /api/rooms/:roomId/events`

Повертає журнал подій для кімнати.

### `GET /api/rooms/:roomId/commands`

Повертає історію команд для кімнати.

## 12. Room commands

Ці endpoints не змінюють стан напряму в MongoDB. Вони відправляють MQTT-команду на прив'язаний пристрій кімнати.

### `POST /api/rooms/:roomId/arm`

Відправляє команду `ARM`.

### `POST /api/rooms/:roomId/disarm`

Відправляє команду `DISARM`.

### `POST /api/rooms/:roomId/reset-alarm`

Відправляє команду `RESET_ALARM`.

### `POST /api/rooms/:roomId/thresholds`

Відправляє команду `SET_THRESHOLDS`.

Request body:

```json
{
  "tempMin": 18,
  "tempMax": 32,
  "humidityMin": 30,
  "humidityMax": 70
}
```

## 13. Provisioning

### `POST /api/provisioning/device/:deviceId`

Запускає provisioning device до конкретної кімнати.

Права:

- `admin`
- `operator`

Request body:

```json
{
  "roomId": "room101"
}
```

## 14. Commands

### `GET /api/commands`

Глобальний журнал усіх відправлених команд.

Query params:

- `roomId=<roomId>`
- `deviceId=<deviceId>`
- `action=<action>`
- `status=pending|published|failed`
- `limit=1..500`

## 15. Users

Усі `users` endpoints вимагають авторизацію.

### `GET /api/users`

Повертає список користувачів.

Права:

- лише `admin`

### `POST /api/users`

Створює нового користувача.

Права:

- лише `admin`

Request body:

```json
{
  "login": "operator-night",
  "password": "secure-pass-1",
  "name": "Night Operator",
  "role": "operator"
}
```

### `PATCH /api/users/me`

Оновлює профіль поточного користувача.

Request body:

```json
{
  "login": "viewer-1",
  "name": "Main Viewer"
}
```

Адмін також може змінити власний пароль:

```json
{
  "currentPassword": "admin",
  "newPassword": "new-admin-password"
}
```

Права:

- `login` і `name` може змінити будь-який авторизований користувач
- пароль може змінювати лише `admin`

### `DELETE /api/users/:userId`

Видаляє користувача.

Права:

- лише `admin`

Обмеження:

- адмін не може видалити сам себе

## 16. Alarms

### `GET /api/alarms`

Глобальний список alarms.

Типові query params:

- `roomId`
- `deviceId`
- `reason`
- `active=true`
- `silenced=true|false`
- `search`
- `sortBy=triggeredAt|reason`
- `sortOrder=asc|desc`
- `limit=1..500`

## 17. Events

### `GET /api/events`

Глобальний список events.

Типові query params:

- `roomId`
- `deviceId`
- `source`
- `eventNames=...`
- `search`
- `sortBy=createdAt|eventName`
- `sortOrder=asc|desc`
- `limit=1..500`

## 18. Push subscriptions

Усі `push-subscriptions` endpoints вимагають авторизацію.

### `GET /api/push-subscriptions/me`

Повертає:

- `publicKey` для browser subscription
- список поточних subscriptions користувача

Response example:

```json
{
  "publicKey": "<vapid-public-key>",
  "subscriptions": [
    {
      "_id": "6805c9a4f0e5f7b7c7f70111",
      "endpoint": "https://fcm.googleapis.com/fcm/send/...",
      "expirationTime": null,
      "createdAt": "2026-04-23T10:00:00.000Z",
      "updatedAt": "2026-04-23T10:00:00.000Z"
    }
  ]
}
```

### `POST /api/push-subscriptions/subscribe`

Зберігає або оновлює browser push subscription.

Request body:

```json
{
  "endpoint": "https://fcm.googleapis.com/fcm/send/...",
  "expirationTime": null,
  "keys": {
    "p256dh": "<p256dh>",
    "auth": "<auth>"
  }
}
```

### `POST /api/push-subscriptions/unsubscribe`

Видаляє browser push subscription.

Request body:

```json
{
  "endpoint": "https://fcm.googleapis.com/fcm/send/...",
  "keys": {
    "p256dh": "<p256dh>",
    "auth": "<auth>"
  }
}
```

## 19. Telegram

Усі `telegram` endpoints вимагають авторизацію.

### `GET /api/telegram/config`

Повертає системний Telegram-конфіг.

Права:

- лише `admin`

Response example:

```json
{
  "isConfigured": true,
  "botName": "security_room_alerts_bot",
  "hasToken": true,
  "maskedToken": "123456...ABCD"
}
```

### `PATCH /api/telegram/config`

Оновлює системний Telegram-конфіг.

Права:

- лише `admin`

Request body:

```json
{
  "botName": "security_room_alerts_bot",
  "botToken": "1234567890:AAExampleToken"
}
```

Примітки:

- `botName` можна передавати з `@` або без, backend нормалізує значення
- якщо змінити бота, усі поточні Telegram-прив'язки користувачів скидаються
- якщо передати порожні `botName` і `botToken`, Telegram-конфіг очищається

### `GET /api/telegram/me`

Повертає статус Telegram для поточного користувача.

Response example:

```json
{
  "isConfigured": true,
  "isLinked": true,
  "isEnabled": true,
  "botName": "security_room_alerts_bot",
  "telegramUsername": "operator_night",
  "linkedAt": "2026-04-24T09:15:00.000Z",
  "linkUrl": "https://t.me/security_room_alerts_bot?start=<token>"
}
```

### `POST /api/telegram/me/enabled`

Увімкнути або вимкнути Telegram-сповіщення для поточного користувача.

Request body:

```json
{
  "enabled": true
}
```

### `POST /api/telegram/me/unlink`

Відв'язує Telegram від поточного користувача і генерує новий link token.

## 20. Ролі й доступ

Система підтримує ролі:

- `admin`
- `operator`
- `viewer`

Поточні правила:

- `viewer` може читати `dashboard`, `rooms`, `room details`, `alarms`, `events`, `commands`
- `viewer` не має доступу до `devices` і `provisioning`
- `viewer` не може керувати кімнатами, змінювати thresholds або скидати тривогу
- `operator` може читати всі operational сторінки, виконувати room commands і provisioning
- `operator` не може виконувати `factory reset`
- `operator` не може керувати користувачами
- `operator` і `viewer` не можуть змінювати пароль
- `admin` може все, включно з `factory reset`, user management і системним Telegram-конфігом

## 21. Socket.IO events

Backend шле такі події:

- `device:seen`
- `device:status-changed`
- `room:state-updated`
- `room:telemetry`
- `alarm:triggered`
- `event:created`
- `command:updated`

## 22. MongoDB collections

Основні колекції:

- `users`
- `devices`
- `rooms`
- `room_current_states`
- `telemetry_history`
- `alarms`
- `events`
- `commands`
- `pushsubscriptions`
- `systemsettings`

## 23. Життєвий цикл Telegram-сповіщень

1. Адмін у `Settings` задає `bot username` і `bot token`
2. Backend зберігає ці дані в `system settings`
3. Backend запускає або продовжує `long polling`
4. Користувач відкриває `GET /api/telegram/me` і отримує `linkUrl`
5. Користувач відкриває deep link і натискає `Start` у боті
6. Backend ловить `/start <token>` через long polling
7. Backend прив'язує `chatId` до користувача
8. При новій тривозі backend надсилає Telegram-повідомлення
9. При `ALARM_CLEARED` backend надсилає Telegram-повідомлення про завершення

## 24. Типові кроки тестування

### Login

```http
POST /api/auth/login
Content-Type: application/json

{
  "login": "admin",
  "password": "admin"
}
```

### Створити користувача

```http
POST /api/users
Authorization: Bearer <jwt>
Content-Type: application/json

{
  "login": "viewer-1",
  "password": "viewer-pass",
  "name": "Main Viewer",
  "role": "viewer"
}
```

### Налаштувати Telegram-бота

```http
PATCH /api/telegram/config
Authorization: Bearer <jwt-admin>
Content-Type: application/json

{
  "botName": "security_room_alerts_bot",
  "botToken": "1234567890:AAExampleToken"
}
```

### Увімкнути Web Push

```http
POST /api/push-subscriptions/subscribe
Authorization: Bearer <jwt>
Content-Type: application/json

{
  "endpoint": "https://fcm.googleapis.com/fcm/send/...",
  "expirationTime": null,
  "keys": {
    "p256dh": "<p256dh>",
    "auth": "<auth>"
  }
}
```

### Запустити provisioning

```http
POST /api/provisioning/device/esp32-A3C9C8
Authorization: Bearer <jwt>
Content-Type: application/json

{
  "roomId": "room101"
}
```

### Увімкнути охорону

```http
POST /api/rooms/room101/arm
Authorization: Bearer <jwt>
```

### Оновити thresholds

```http
POST /api/rooms/room101/thresholds
Authorization: Bearer <jwt>
Content-Type: application/json

{
  "tempMin": 18,
  "tempMax": 32,
  "humidityMin": 30,
  "humidityMax": 70
}
```

### Виконати factory reset

```http
POST /api/devices/esp32-A3C9C8/factory-reset
Authorization: Bearer <jwt-admin>
```

## 25. Поточні обмеження

- немає refresh token flow
- немає pagination metadata, лише `limit`
- немає OpenAPI/Swagger
- команди повертають факт publish у MQTT, а не гарантію фізичного виконання на пристрої
- Telegram працює через `long polling`, а не через webhook
