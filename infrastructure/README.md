# Infrastructure

Локальна інфраструктура для `Security Room System` запускається через Docker Compose.

## Сервіси

- `MongoDB` на `localhost:27017`
- `Mosquitto` MQTT broker на `localhost:1883`
- `Mosquitto WebSocket` на `localhost:9001`

## Запуск

З директорії `infrastructure/`:

```powershell
docker compose up -d
```

## Зупинка

```powershell
docker compose down
```

## Перевірка

Після запуску backend може використовувати такі значення:

```env
MONGODB_URI=mongodb://localhost:27017/security-room-system
MQTT_URL=mqtt://localhost:1883
```

## Примітки

- `MongoDB` зберігає дані у Docker volume `mongodb_data`
- `Mosquitto` використовує локальний конфіг з `infrastructure/mosquitto/config/mosquitto.conf`
- у поточній dev-конфігурації MQTT broker дозволяє анонімне підключення
