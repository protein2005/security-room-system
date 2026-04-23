# Backend API

Цей документ описує поточний backend API для `Security Room System` і пояснює, як backend працює разом з `ESP32`, `MQTT`, `MongoDB` та `Socket.IO`.

## 1. Загальна схема роботи

Система працює так:

1. `ESP32` публікує повідомлення в `MQTT broker`.
2. Backend підписується на MQTT topics і обробляє:
   - `status`
   - `heartbeat`
   - `telemetry`
   - `alarm`
   - `event`
3. Backend зберігає дані в `MongoDB`.
4. Backend надає `REST API` для frontend.
5. Backend шле `Socket.IO` події для live-оновлень.
6. Оператори входять у систему через `JWT` і всі чутливі дії проходять через авторизацію.

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

## 3. Поточні модулі backend

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

## 4. Як backend працює з MQTT

Backend слухає такі topics.

### Device-level

- `security/devices/+/status`
- `security/devices/+/heartbeat`

### Room-level

- `security/rooms/+/status`
- `security/rooms/+/heartbeat`
- `security/rooms/+/telemetry`
- `security/rooms/+/alarm`
- `security/rooms/+/event`

### Командні topics

Backend публікує команди в:

```text
security/devices/<deviceId>/cmd
```

## 5. Основна логіка по типах повідомлень

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

- запису в колекцію `alarms`
- оновлення alarm-стану кімнати

### `event`

Використовується для:

- запису в колекцію `events`
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

## 7. Environment Variables

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

MQTT_URL=mqtt://localhost:1883
MQTT_USERNAME=
MQTT_PASSWORD=
MQTT_CLIENT_ID=security-room-system-backend
MQTT_TOPIC_ROOT=security
MQTT_DEVICE_TOKEN=room101_secure_token

DEVICE_OFFLINE_THRESHOLD_MS=30000
DEVICE_OFFLINE_CHECK_INTERVAL_MS=10000
```

## 8. Auth

## 8.1 `POST /api/auth/login`

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

## 8.2 `GET /api/auth/me`

Повертає поточного користувача.

Headers:

```text
Authorization: Bearer <jwt>
```

Response:

```json
{
  "_id": "6801a3f6f0e5f7b7c7f70001",
  "login": "admin",
  "name": "System Administrator",
  "role": "admin",
  "isActive": true
}
```

Примітка:

- при першому запуску backend автоматично створює дефолтний акаунт:
  - `login: admin`
  - `password: admin`
  - `name: System Administrator`

## 9. REST API

## 9.1 Root

### `GET /`

Перевірка, що backend запущений.

## 9.2 Health

### `GET /api/health`

Сервісний health endpoint.

## 9.3 Devices

Усі `devices` endpoints вимагають `Authorization: Bearer <jwt>`.

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

Response example:

```json
[
  {
    "_id": "6801a410f0e5f7b7c7f70020",
    "targetDeviceId": "esp32-A3C9C8",
    "targetRoomId": "room101",
    "action": "FACTORY_RESET",
    "payload": {
      "deviceId": "esp32-A3C9C8",
      "deviceToken": "room101_secure_token",
      "action": "FACTORY_RESET",
      "roomId": "room101"
    },
    "requestedBy": {
      "userId": "6801a3f6f0e5f7b7c7f70001",
      "login": "admin",
      "name": "System Administrator",
      "role": "admin"
    },
    "status": "published",
    "mqttTopic": "security/devices/esp32-A3C9C8/cmd",
    "publishedAt": "2026-04-18T12:15:00.000Z",
    "createdAt": "2026-04-18T12:15:00.000Z"
  }
]
```

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

Response `403`:

```json
{
  "message": "You do not have permission to perform this action"
}
```

## 9.4 Rooms

Усі `rooms` endpoints вимагають `Authorization: Bearer <jwt>`.

Права:

- `GET` маршрути доступні для будь-якого авторизованого користувача
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

Response example:

```json
[
  {
    "_id": "6801a410f0e5f7b7c7f70021",
    "targetDeviceId": "esp32-A3C9C8",
    "targetRoomId": "room101",
    "action": "SET_THRESHOLDS",
    "status": "published",
    "requestedBy": {
      "login": "operator-night",
      "name": "Night Operator",
      "role": "operator"
    },
    "publishedAt": "2026-04-18T12:20:00.000Z"
  }
]
```

## 9.5 Room Commands

Ці endpoint-и не змінюють стан напряму в MongoDB. Вони відправляють MQTT-команду на прив'язаний пристрій кімнати, а вже потім backend синхронізується по відповідях `status/event/telemetry`.

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

Response `202` для room commands:

```json
{
  "success": true,
  "topic": "security/devices/esp32-A3C9C8/cmd",
  "payload": {
    "deviceId": "esp32-A3C9C8",
    "deviceToken": "room101_secure_token",
    "action": "ARM",
    "roomId": "room101"
  },
  "command": {
    "_id": "6801a410f0e5f7b7c7f70022",
    "status": "published"
  }
}
```

## 9.6 Provisioning

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

Payload, який backend відправляє у broker:

```json
{
  "deviceId": "esp32-A3C9C8",
  "deviceToken": "room101_secure_token",
  "action": "PROVISION",
  "roomId": "room101",
  "roomName": "Server Room 101",
  "zoneType": "server_room"
}
```

## 9.7 Commands

### `GET /api/commands`

Глобальний журнал усіх відправлених команд.

Query params:

- `roomId=<roomId>`
- `deviceId=<deviceId>`
- `action=<action>`
- `status=pending|published|failed`
- `limit=1..500`

Example:

```text
GET /api/commands
GET /api/commands?roomId=room101
GET /api/commands?deviceId=esp32-A3C9C8
GET /api/commands?action=FACTORY_RESET
```

## 9.8 Users

Усі `users` endpoints вимагають `Authorization: Bearer <jwt>`.

### `GET /api/users`

Повертає список користувачів.

Права:

- лише `admin`

Response example:

```json
[
  {
    "_id": "6801a3f6f0e5f7b7c7f70001",
    "login": "admin",
    "name": "System Administrator",
    "role": "admin",
    "isActive": true,
    "lastLoginAt": "2026-04-18T12:00:00.000Z",
    "createdAt": "2026-04-18T11:59:00.000Z",
    "updatedAt": "2026-04-18T12:00:00.000Z"
  }
]
```

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

## 9.9 Alarms

### `GET /api/alarms`

Глобальний список alarms.

## 9.10 Events

### `GET /api/events`

Глобальний список events.

## 10. Авторизація і ролі

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
- `admin` може все, включно з `factory reset`, керуванням користувачами і зміною власного пароля

## 11. Socket.IO Events

Backend шле такі події:

- `device:seen`
- `device:status-changed`
- `room:state-updated`
- `room:telemetry`
- `alarm:triggered`
- `event:created`
- `command:updated`

## 12. Структура даних у MongoDB

Основні колекції:

- `users`
- `devices`
- `rooms`
- `room_current_states`
- `telemetry_history`
- `alarms`
- `events`
- `commands`

## 13. Життєвий цикл provisioning

1. `ESP32` з'являється як `UNPROVISIONED`
2. backend створює або оновлює `Device`
3. оператор викликає `POST /api/provisioning/device/:deviceId`
4. backend публікує `PROVISION` у MQTT
5. команда потрапляє в `commands`
6. пристрій зберігає `roomId`, `roomName`, `zoneType`
7. пристрій публікує:
   - `DEVICE_PROVISIONED` у `event`
   - `PROVISIONED` у `status`
8. backend підтверджує provisioning у БД

## 14. Життєвий цикл room commands

1. оператор викликає один із command endpoint-ів кімнати
2. backend перевіряє `JWT`, роль, `roomId` і прив'язаний `deviceId`
3. backend формує payload з `deviceId`, `deviceToken`, `action`, `roomId`
4. backend створює запис у `commands`
5. backend публікує payload у `security/devices/<deviceId>/cmd`
6. ESP32 виконує команду
7. backend отримує нові `status`, `event` або `telemetry` і відображає фактичний стан у БД

## 15. Життєвий цикл factory reset

1. `admin` викликає `POST /api/devices/:deviceId/factory-reset`
2. backend створює запис у `commands`
3. backend публікує `FACTORY_RESET` у MQTT
4. пристрій очищає `Preferences` і перезапускається
5. після повернення пристрій знову надсилає `UNPROVISIONED`
6. backend прибирає стару прив'язку з кімнати і переводить пристрій назад у стан `unprovisioned`

## 16. Типові кроки тестування

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

### Оновити свій профіль

```http
PATCH /api/users/me
Authorization: Bearer <jwt>
Content-Type: application/json

{
  "login": "operator-1",
  "name": "Updated Operator"
}
```

### Створити кімнату

```http
POST /api/rooms
Authorization: Bearer <jwt>
Content-Type: application/json

{
  "roomId": "room101",
  "roomName": "Server Room 101",
  "zoneType": "server_room",
  "description": "Main server room"
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
Authorization: Bearer <jwt>
```

### Перевірити history команд

```text
GET /api/commands
GET /api/rooms/room101/commands
GET /api/devices/esp32-A3C9C8/commands
```

## 17. Поточні обмеження

- немає refresh token flow
- немає pagination metadata, лише `limit`
- немає OpenAPI/Swagger
- команди повертають факт успішного publish у MQTT, а не гарантію фізичного виконання на пристрої
