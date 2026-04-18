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

## 6. Offline detection

Backend має background job, яка:

- регулярно перевіряє `lastSeenAt`
- якщо від пристрою давно не було `heartbeat/status`, він стає `offline`

Керуючі env-параметри:

```env
DEVICE_OFFLINE_THRESHOLD_MS=30000
DEVICE_OFFLINE_CHECK_INTERVAL_MS=10000
```

Це означає:

- якщо пристрій мовчить понад 30 секунд, він переходить в `offline`
- перевірка виконується кожні 10 секунд

## 7. Environment Variables

Основні змінні:

```env
NODE_ENV=development
PORT=4000
CLIENT_ORIGIN=http://localhost:5173

MONGODB_URI=mongodb://localhost:27017/security-room-system

MQTT_URL=mqtt://localhost:1883
MQTT_USERNAME=
MQTT_PASSWORD=
MQTT_CLIENT_ID=security-room-system-backend
MQTT_TOPIC_ROOT=security
MQTT_DEVICE_TOKEN=room101_secure_token

DEVICE_OFFLINE_THRESHOLD_MS=30000
DEVICE_OFFLINE_CHECK_INTERVAL_MS=10000
```

## 8. REST API

## 8.1 Root

### `GET /`

Перевірка, що backend запущений.

Response:

```json
{
  "name": "security-room-system-backend",
  "status": "ok",
  "environment": "development"
}
```

## 8.2 Health

### `GET /api/health`

Сервісний health endpoint.

Response:

```json
{
  "status": "ok",
  "service": "backend",
  "timestamp": "2026-04-16T10:00:00.000Z"
}
```

## 8.3 Devices

### `GET /api/devices`

Повертає список усіх відомих пристроїв.

Query params:

- `online=true|false`
- `provisioned=true|false`

Приклади:

```text
GET /api/devices
GET /api/devices?online=true
GET /api/devices?provisioned=false
GET /api/devices?online=true&provisioned=true
```

Response example:

```json
[
  {
    "_id": "69dfed3e4a0ab23d292b15dc",
    "deviceId": "esp32-A3C9C8",
    "deviceType": "esp32_security_node",
    "firmwareVersion": "1.1.0",
    "provisioned": true,
    "currentRoomId": "room101",
    "lastStatus": "ONLINE",
    "online": true,
    "wifiOk": true,
    "mqttOk": true,
    "lastSeenAt": "2026-04-16T10:00:00.000Z",
    "createdAt": "2026-04-16T09:00:00.000Z",
    "updatedAt": "2026-04-16T10:00:00.000Z"
  }
]
```

### `GET /api/devices/unprovisioned`

Повертає лише ті пристрої, які ще не прив'язані до кімнати.

Response:

```json
[
  {
    "_id": "69dfed3e4a0ab23d292b15dc",
    "deviceId": "esp32-A3C9C8",
    "provisioned": false,
    "currentRoomId": "",
    "online": true
  }
]
```

### `GET /api/devices/:deviceId`

Повертає один пристрій по `deviceId`.

Example:

```text
GET /api/devices/esp32-A3C9C8
```

Response:

```json
{
  "_id": "69dfed3e4a0ab23d292b15dc",
  "deviceId": "esp32-A3C9C8",
  "deviceType": "esp32_security_node",
  "firmwareVersion": "1.1.0",
  "provisioned": true,
  "currentRoomId": "room101",
  "lastStatus": "PROVISIONED",
  "online": true,
  "wifiOk": true,
  "mqttOk": true,
  "lastSeenAt": "2026-04-16T10:00:00.000Z",
  "createdAt": "2026-04-16T09:00:00.000Z",
  "updatedAt": "2026-04-16T10:00:00.000Z"
}
```

404:

```json
{
  "message": "Device not found"
}
```

## 8.4 Rooms

### `GET /api/rooms`

Повертає список кімнат.

Response:

```json
[
  {
    "_id": "69dff0004a0ab23d292b1700",
    "roomId": "room101",
    "roomName": "Server Room 101",
    "zoneType": "server_room",
    "description": "Main server room",
    "deviceId": "esp32-A3C9C8",
    "armed": false,
    "alarmActive": false,
    "alarmReason": "",
    "alarmSilenced": false,
    "lastTelemetryAt": "2026-04-16T10:00:00.000Z",
    "createdAt": "2026-04-16T09:30:00.000Z",
    "updatedAt": "2026-04-16T10:00:00.000Z"
  }
]
```

### `POST /api/rooms`

Створює нову кімнату.

Request body:

```json
{
  "roomId": "room101",
  "roomName": "Server Room 101",
  "zoneType": "server_room",
  "description": "Main server room"
}
```

Умови:

- `roomId` обов'язковий
- `roomName` обов'язковий
- `zoneType` обов'язковий

Response `201`:

```json
{
  "_id": "69dff0004a0ab23d292b1700",
  "roomId": "room101",
  "roomName": "Server Room 101",
  "zoneType": "server_room",
  "description": "Main server room",
  "deviceId": "",
  "armed": false,
  "alarmActive": false,
  "alarmReason": "",
  "alarmSilenced": false,
  "lastTelemetryAt": null,
  "createdAt": "2026-04-16T09:30:00.000Z",
  "updatedAt": "2026-04-16T09:30:00.000Z"
}
```

Response `400`:

```json
{
  "message": "roomId is required"
}
```

Response `409`:

```json
{
  "message": "Room with this roomId already exists"
}
```

### `GET /api/rooms/:roomId`

Повертає кімнату по `roomId`.

Example:

```text
GET /api/rooms/room101
```

### `PATCH /api/rooms/:roomId`

Частково оновлює кімнату.

Request body:

```json
{
  "roomName": "Server Room 101 Updated",
  "description": "Updated description"
}
```

Можна передавати:

- `roomName`
- `zoneType`
- `description`
- `deviceId`

### `GET /api/rooms/:roomId/state`

Повертає поточний агрегований стан кімнати.

Response example:

```json
{
  "_id": "69dff1004a0ab23d292b1710",
  "roomId": "room101",
  "deviceId": "esp32-A3C9C8",
  "temperature": 24.4,
  "humidity": 46.2,
  "motion": false,
  "door": false,
  "armed": true,
  "alarmActive": false,
  "alarmReason": "",
  "alarmSilenced": false,
  "offline": false,
  "sensorFailure": false,
  "wifiOk": true,
  "mqttOk": true,
  "tempMinThreshold": 18,
  "tempMaxThreshold": 32,
  "humidityMinThreshold": 30,
  "humidityMaxThreshold": 70,
  "updatedAt": "2026-04-16T10:00:00.000Z",
  "lastTelemetryAt": "2026-04-16T10:00:00.000Z"
}
```

### `GET /api/rooms/:roomId/telemetry`

Повертає історію телеметрії для кімнати.

Query params:

- `limit=1..500`

Example:

```text
GET /api/rooms/room101/telemetry
GET /api/rooms/room101/telemetry?limit=50
```

Response example:

```json
[
  {
    "_id": "69dff2004a0ab23d292b1720",
    "deviceId": "esp32-A3C9C8",
    "roomId": "room101",
    "temperature": 24.4,
    "humidity": 46.2,
    "motion": false,
    "door": false,
    "armed": true,
    "offline": false,
    "sensorFailure": false,
    "alarmActive": false,
    "alarmSilenced": false,
    "alarmReason": "",
    "dhtOk": true,
    "receivedAt": "2026-04-16T10:00:00.000Z"
  }
]
```

### `GET /api/rooms/:roomId/alarms`

Повертає alarms для кімнати.

Query params:

- `active=true|false`
- `limit=1..500`

Example:

```text
GET /api/rooms/room101/alarms
GET /api/rooms/room101/alarms?active=true
```

Response example:

```json
[
  {
    "_id": "69dff3004a0ab23d292b1730",
    "deviceId": "esp32-A3C9C8",
    "roomId": "room101",
    "reason": "DOOR_OPEN",
    "isActive": true,
    "armed": true,
    "offline": false,
    "alarmSilenced": false,
    "triggeredAt": "2026-04-16T10:02:00.000Z",
    "acknowledgedAt": null,
    "silencedAt": null,
    "clearedAt": null
  }
]
```

### `GET /api/rooms/:roomId/events`

Повертає журнал подій для кімнати.

Query params:

- `limit=1..500`

Response example:

```json
[
  {
    "_id": "69dff4004a0ab23d292b1740",
    "deviceId": "esp32-A3C9C8",
    "roomId": "room101",
    "eventName": "DEVICE_PROVISIONED",
    "source": "remote",
    "level": "info",
    "details": "Device was provisioned from backend",
    "armed": false,
    "offline": false,
    "alarmActive": false,
    "alarmSilenced": false,
    "alarmReason": "",
    "createdAt": "2026-04-16T09:45:00.000Z"
  }
]
```

## 8.5 Room Commands

Ці endpoint-и не змінюють стан напряму в MongoDB. Вони відправляють MQTT-команду на прив'язаний пристрій кімнати, а вже потім backend синхронізується по відповідях `status/event/telemetry`.

Усі команди:

- перевіряють, що кімната існує
- перевіряють, що до кімнати прив'язаний `deviceId`
- публікують payload у topic `security/devices/<deviceId>/cmd`
- повертають `202 Accepted`

### `POST /api/rooms/:roomId/arm`

Відправляє команду `ARM`.

Response `202`:

```json
{
  "success": true,
  "topic": "security/devices/esp32-A3C9C8/cmd",
  "payload": {
    "deviceId": "esp32-A3C9C8",
    "deviceToken": "room101_secure_token",
    "action": "ARM",
    "roomId": "room101"
  }
}
```

### `POST /api/rooms/:roomId/disarm`

Відправляє команду `DISARM`.

Response `202`:

```json
{
  "success": true,
  "topic": "security/devices/esp32-A3C9C8/cmd",
  "payload": {
    "deviceId": "esp32-A3C9C8",
    "deviceToken": "room101_secure_token",
    "action": "DISARM",
    "roomId": "room101"
  }
}
```

### `POST /api/rooms/:roomId/reset-alarm`

Відправляє команду `RESET_ALARM`.

Response `202`:

```json
{
  "success": true,
  "topic": "security/devices/esp32-A3C9C8/cmd",
  "payload": {
    "deviceId": "esp32-A3C9C8",
    "deviceToken": "room101_secure_token",
    "action": "RESET_ALARM",
    "roomId": "room101"
  }
}
```

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

Validation:

- усі чотири поля обов'язкові
- усі чотири поля мають бути числами

Response `202`:

```json
{
  "success": true,
  "topic": "security/devices/esp32-A3C9C8/cmd",
  "payload": {
    "deviceId": "esp32-A3C9C8",
    "deviceToken": "room101_secure_token",
    "action": "SET_THRESHOLDS",
    "roomId": "room101",
    "tempMin": 18,
    "tempMax": 32,
    "humidityMin": 30,
    "humidityMax": 70
  }
}
```

Response `400`:

```json
{
  "message": "tempMin, tempMax, humidityMin and humidityMax must be numbers"
}
```

Response `404`:

```json
{
  "message": "Room not found"
}
```

Response `409`:

```json
{
  "message": "Room does not have an assigned device"
}
```

## 8.6 Provisioning

### `POST /api/provisioning/device/:deviceId`

Запускає provisioning device до конкретної кімнати.

Request body:

```json
{
  "roomId": "room101"
}
```

Backend:

1. знаходить `Device`
2. знаходить `Room`
3. перевіряє, що кімната не зайнята іншим пристроєм
4. публікує MQTT-команду `PROVISION`

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

Topic:

```text
security/devices/<deviceId>/cmd
```

Response `202`:

```json
{
  "success": true,
  "topic": "security/devices/esp32-A3C9C8/cmd",
  "payload": {
    "deviceId": "esp32-A3C9C8",
    "deviceToken": "room101_secure_token",
    "action": "PROVISION",
    "roomId": "room101",
    "roomName": "Server Room 101",
    "zoneType": "server_room"
  },
  "deviceId": "esp32-A3C9C8",
  "roomId": "room101"
}
```

Response `400`:

```json
{
  "message": "roomId is required"
}
```

Response `404`:

```json
{
  "message": "Device not found"
}
```

або

```json
{
  "message": "Room not found"
}
```

Response `409`:

```json
{
  "message": "Room is already assigned to another device"
}
```

## 8.7 Alarms

### `GET /api/alarms`

Глобальний список alarms.

Query params:

- `roomId=<roomId>`
- `active=true|false`
- `limit=1..500`

Examples:

```text
GET /api/alarms
GET /api/alarms?active=true
GET /api/alarms?roomId=room101
```

## 8.8 Events

### `GET /api/events`

Глобальний список events.

Query params:

- `roomId=<roomId>`
- `limit=1..500`

Examples:

```text
GET /api/events
GET /api/events?roomId=room101
GET /api/events?limit=50
```

## 9. Socket.IO Events

Backend шле такі події:

- `device:seen`
- `device:status-changed`
- `room:state-updated`
- `room:telemetry`
- `alarm:triggered`
- `event:created`

Для frontend це означає:

- список пристроїв можна оновлювати без polling
- сторінка кімнати може live-оновлювати current state
- dashboard може live-оновлювати alarms і recent events

## 10. Структура даних у MongoDB

Основні колекції:

- `devices`
- `rooms`
- `room_current_states`
- `telemetry_history`
- `alarms`
- `events`

## 11. Життєвий цикл provisioning

1. `ESP32` з'являється як `UNPROVISIONED`
2. backend створює або оновлює `Device`
3. оператор викликає `POST /api/provisioning/device/:deviceId`
4. backend публікує `PROVISION` у MQTT
5. пристрій зберігає `roomId`, `roomName`, `zoneType`
6. пристрій публікує:
   - `DEVICE_PROVISIONED` у `event`
   - `PROVISIONED` у `status`
7. backend підтверджує provisioning у БД

## 12. Життєвий цикл telemetry

1. пристрій публікує `telemetry`
2. backend створює запис у `telemetry_history`
3. backend оновлює `room_current_states`
4. backend оновлює частину полів у `rooms`
5. backend шле `room:telemetry` і `room:state-updated`

## 13. Життєвий цикл alarm

1. пристрій публікує `alarm`
2. backend створює запис у `alarms`
3. backend оновлює current state кімнати
4. backend шле `alarm:triggered`
5. якщо приходить `ALARM_RESET`, активні alarms помічаються як silenced
6. якщо приходить `ALARM_CLEARED`, активні alarms закриваються

## 14. Життєвий цикл room commands

1. оператор викликає один із command endpoint-ів кімнати
2. backend перевіряє `roomId` і прив'язаний `deviceId`
3. backend формує payload з `deviceId`, `deviceToken`, `action`, `roomId`
4. backend публікує payload у `security/devices/<deviceId>/cmd`
5. ESP32 виконує команду
6. backend отримує нові `status`, `event` або `telemetry` і відображає фактичний стан у БД

## 15. Типові кроки тестування

### Створити кімнату

```http
POST /api/rooms
Content-Type: application/json

{
  "roomId": "room101",
  "roomName": "Server Room 101",
  "zoneType": "server_room",
  "description": "Main server room"
}
```

### Перевірити новий пристрій

```text
GET /api/devices/unprovisioned
```

### Запустити provisioning

```http
POST /api/provisioning/device/esp32-A3C9C8
Content-Type: application/json

{
  "roomId": "room101"
}
```

### Увімкнути охорону

```http
POST /api/rooms/room101/arm
```

### Оновити thresholds

```http
POST /api/rooms/room101/thresholds
Content-Type: application/json

{
  "tempMin": 18,
  "tempMax": 32,
  "humidityMin": 30,
  "humidityMax": 70
}
```

### Перевірити room state

```text
GET /api/rooms/room101/state
```

### Перевірити telemetry

```text
GET /api/rooms/room101/telemetry?limit=20
```

### Перевірити alarms

```text
GET /api/rooms/room101/alarms
```

### Перевірити events

```text
GET /api/rooms/room101/events
```

## 16. Поточні обмеження

- автентифікація ще не реалізована
- немає pagination metadata, лише `limit`
- немає OpenAPI/Swagger
- команди повертають факт успішного publish у MQTT, а не гарантію фізичного виконання на пристрої

## 17. Що логічно далі

Після цього документа і поточного backend-шару можна переходити до frontend:

- `React + Vite`
- `Tailwind CSS + shadcn/ui`
- dashboard
- rooms list
- room details
- alarms/events pages
