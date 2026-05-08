# Docker-інфраструктура Security Room System

Ця папка містить Docker Compose конфігурації для локального запуску сервісів, потрібних системі охорони приміщення.

Є два сценарії запуску:

- `docker-compose.yml` - інфраструктура для розробки: MongoDB, Mongo Express, Mosquitto MQTT.
- `docker-compose.lan.yml` - повний LAN-запуск: frontend, backend, MongoDB, Mosquitto MQTT. Цей варіант підходить, щоб відкрити систему з телефона або іншого пристрою в тій самій Wi-Fi/LAN мережі.

## Структура

```text
infrastructure/
  docker-compose.yml       # MongoDB + Mongo Express + Mosquitto для dev
  docker-compose.lan.yml   # повний запуск системи в LAN
  lan.env.example          # приклад env-файлу для LAN-запуску
  .env                     # локальний env-файл, не комітиться
  mosquitto/
    config/
      mosquitto.conf       # конфіг MQTT broker
      passwordfile         # генерується автоматично, не комітиться
    data/                  # persistence Mosquitto
    log/                   # logs Mosquitto
```

## Контейнери

### `mongodb`

MongoDB зберігає основні дані системи:

- користувачів;
- кімнати;
- пристрої;
- події;
- тривоги;
- команди;
- Telegram/Web Push налаштування;
- системні налаштування.

У `docker-compose.yml` MongoDB доступна з хоста на:

```text
localhost:27017
```

У `docker-compose.lan.yml` MongoDB не відкривається назовні, бо з нею працює backend всередині Docker-мережі.

Дані MongoDB зберігаються в Docker volume:

```text
mongodb_data
```

Тому після `docker compose down` дані не зникають.

### `mongo-express`

Mongo Express - вебінтерфейс для перегляду MongoDB.

Є тільки у `docker-compose.yml`, тобто в dev-режимі.

Адреса:

```text
http://localhost:8081
```

Через нього можна подивитися колекції, документи користувачів, кімнат, пристроїв тощо.

### `mosquitto-passwords`

Одноразовий init-контейнер. Він запускається перед Mosquitto і генерує файл паролів:

```text
infrastructure/mosquitto/config/passwordfile
```

Він бере значення з env:

```env
MQTT_USERNAME
MQTT_PASSWORD
```

Після генерації контейнер завершується. Основний Mosquitto стартує тільки якщо цей контейнер завершився успішно.

Файл `passwordfile` не треба редагувати вручну і не треба комітити.

### `mosquitto`

Mosquitto - MQTT broker, через який ESP32 і backend обмінюються повідомленнями.

Порти:

```text
1883  # MQTT
9001  # MQTT over WebSocket
```

Анонімний доступ вимкнений:

```conf
allow_anonymous false
password_file /mosquitto/config/passwordfile
```

Тому до broker можуть підключатися тільки клієнти, які знають:

```text
MQTT_USERNAME
MQTT_PASSWORD
```

Backend використовує ці значення з `infrastructure/.env`.

ESP32 має мати ті самі значення у:

```text
firmware/firmware.env
```

Окрім username/password, backend додатково перевіряє `MQTT_DEVICE_TOKEN` у payload пристрою. Це другий рівень захисту.

### `backend`

Backend є тільки у `docker-compose.lan.yml`.

Він:

- обслуговує REST API під `/api`;
- приймає авторизацію користувачів;
- працює з MongoDB;
- підключається до Mosquitto;
- обробляє MQTT повідомлення від ESP32;
- надсилає команди пристроям;
- надсилає Web Push і Telegram сповіщення;
- піднімає Socket.IO realtime канал.

Всередині Docker backend слухає порт:

```text
4000
```

Назовні цей порт не відкривається у LAN compose. До backend звертається `frontend/nginx` через Docker-мережу.

### `frontend`

Frontend є тільки у `docker-compose.lan.yml`.

Це production build React/Vite застосунку, який віддається через Nginx.

Nginx виконує дві ролі:

- віддає frontend;
- проксить backend-запити:

```text
/api       -> backend:4000/api
/socket.io -> backend:4000/socket.io
```

Зовнішній порт задається через:

```env
APP_PORT=80
```

За замовчуванням система відкривається так:

```text
http://IP_КОМПА/
```

## Env-файл

Для LAN-запуску створи env-файл:

```powershell
Copy-Item infrastructure\lan.env.example infrastructure\.env
```

Потім відредагуй:

```text
infrastructure\.env
```

Основні змінні:

```env
APP_PORT=80

JWT_SECRET=change-this-to-a-long-random-secret
JWT_EXPIRES_IN=12h

ADMIN_LOGIN=admin
ADMIN_PASSWORD=change-this-admin-password
ADMIN_NAME=System Administrator

MQTT_DEVICE_TOKEN=change-this-device-token
MQTT_USERNAME=security_device
MQTT_PASSWORD=change-this-mqtt-password

WEB_PUSH_SUBJECT=mailto:admin@security-room.local
WEB_PUSH_PUBLIC_KEY=paste-vapid-public-key-here
WEB_PUSH_PRIVATE_KEY=paste-vapid-private-key-here
```

### Важливі змінні

`JWT_SECRET` - секрет для підпису JWT токенів авторизації. Має бути довгим випадковим рядком.

`ADMIN_LOGIN`, `ADMIN_PASSWORD`, `ADMIN_NAME` - дефолтний адміністратор, який створюється при першому старті, якщо користувача ще немає в MongoDB.

`MQTT_USERNAME`, `MQTT_PASSWORD` - логін і пароль для підключення до Mosquitto.

`MQTT_DEVICE_TOKEN` - токен пристрою, який backend перевіряє всередині MQTT payload.

`WEB_PUSH_PUBLIC_KEY`, `WEB_PUSH_PRIVATE_KEY` - VAPID ключі для Web Push.

## Генерація Web Push ключів

З папки `backend`:

```powershell
cd backend
npm install
npx web-push generate-vapid-keys
```

Скопіюй ключі у:

```text
infrastructure\.env
```

Після цього повернись у корінь:

```powershell
cd ..
```

## Запуск dev-інфраструктури

Цей режим запускає тільки MongoDB, Mongo Express і Mosquitto. Backend і frontend запускаються окремо через `npm`.

З папки `infrastructure/`:

```powershell
docker compose --env-file .env up -d
```

Або з кореня репозиторію:

```powershell
docker compose --env-file infrastructure\.env -f infrastructure\docker-compose.yml up -d
```

Після запуску:

```text
MongoDB:       localhost:27017
Mongo Express: http://localhost:8081
Mosquitto:     localhost:1883
```

Для backend у dev-режимі використовуються такі значення:

```env
MONGODB_URI=mongodb://localhost:27017/security-room-system
MQTT_URL=mqtt://localhost:1883
MQTT_USERNAME=...
MQTT_PASSWORD=...
```

## Запуск повної системи в LAN

З кореня репозиторію:

```powershell
docker compose --env-file infrastructure\.env -f infrastructure\docker-compose.lan.yml up -d --build
```

Після запуску знайди IP комп'ютера:

```powershell
ipconfig
```

На телефоні або іншому пристрої в тій самій мережі відкрий:

```text
http://IP_КОМПА/
```

Наприклад:

```text
http://192.168.0.106/
```

Якщо `APP_PORT` не `80`, вкажи порт:

```text
http://IP_КОМПА:APP_PORT/
```

## Підключення ESP32

У firmware використовується файл:

```text
firmware/firmware.env
```

Створи його з прикладу:

```powershell
Copy-Item firmware\firmware.env.example firmware\firmware.env
```

Вкажи параметри:

```env
WIFI_SSID=назва_wifi
WIFI_PASSWORD=пароль_wifi

MQTT_SERVER=IP_КОМПА
MQTT_PORT=1883
MQTT_TOPIC_ROOT=security
MQTT_USERNAME=значення_MQTT_USERNAME_з_infrastructure_env
MQTT_PASSWORD=значення_MQTT_PASSWORD_з_infrastructure_env

DEVICE_TYPE=esp32_security_node
DEVICE_TOKEN=значення_MQTT_DEVICE_TOKEN_з_infrastructure_env
FIRMWARE_VERSION=1.1.0
```

Під час PlatformIO build автоматично генерується:

```text
firmware/include/generated_config.h
```

Його не потрібно редагувати вручну.

## Перевірка стану

Подивитися контейнери:

```powershell
docker compose --env-file infrastructure\.env -f infrastructure\docker-compose.lan.yml ps
```

Подивитися логи backend:

```powershell
docker compose --env-file infrastructure\.env -f infrastructure\docker-compose.lan.yml logs -f backend
```

Подивитися логи Mosquitto:

```powershell
docker compose --env-file infrastructure\.env -f infrastructure\docker-compose.lan.yml logs -f mosquitto
```

Подивитися логи frontend/nginx:

```powershell
docker compose --env-file infrastructure\.env -f infrastructure\docker-compose.lan.yml logs -f frontend
```

Перевірити MQTT broker з credentials:

```powershell
docker compose --env-file infrastructure\.env -f infrastructure\docker-compose.lan.yml exec mosquitto mosquitto_sub -h localhost -p 1883 -u "$env:MQTT_USERNAME" -P "$env:MQTT_PASSWORD" -t '$SYS/broker/version' -C 1
```

Якщо ця команда незручна через PowerShell env, можна просто дивитися health status:

```powershell
docker compose --env-file infrastructure\.env -f infrastructure\docker-compose.lan.yml ps mosquitto
```

## Зупинка

Зупинити контейнери, але залишити дані:

```powershell
docker compose --env-file infrastructure\.env -f infrastructure\docker-compose.lan.yml down
```

Повністю видалити дані MongoDB:

```powershell
docker compose --env-file infrastructure\.env -f infrastructure\docker-compose.lan.yml down -v
```

Увага: `down -v` видалить Docker volume `mongodb_data`, тобто користувачів, кімнати, пристрої, події, Telegram config і всі інші дані.

## Типові проблеми

### `mosquitto-passwords didn't complete successfully`

Перевір, що в `infrastructure/.env` є:

```env
MQTT_USERNAME=...
MQTT_PASSWORD=...
```

Після зміни env перезапусти:

```powershell
docker compose --env-file infrastructure\.env -f infrastructure\docker-compose.lan.yml up -d --build
```

### `security-room-system-mosquitto is unhealthy`

Подивись логи:

```powershell
docker compose --env-file infrastructure\.env -f infrastructure\docker-compose.lan.yml logs --tail=100 mosquitto
```

Якщо контейнер застряг у restart-loop, пересоздай його:

```powershell
docker compose --env-file infrastructure\.env -f infrastructure\docker-compose.lan.yml rm -sf mosquitto
docker compose --env-file infrastructure\.env -f infrastructure\docker-compose.lan.yml up -d mosquitto
```

### Система відкривається на комп'ютері, але не з телефона

Перевір:

- телефон і комп'ютер в одній Wi-Fi/LAN мережі;
- відкриваєш `http://IP_КОМПА/`, а не `localhost`;
- firewall дозволяє порт `APP_PORT`, за замовчуванням `80`;
- контейнер `frontend` запущений.

### ESP32 не підключається до MQTT

Перевір:

- `MQTT_SERVER` у `firmware/firmware.env` дорівнює IP комп'ютера;
- `MQTT_USERNAME` і `MQTT_PASSWORD` збігаються з `infrastructure/.env`;
- `DEVICE_TOKEN` збігається з `MQTT_DEVICE_TOKEN`;
- порт `1883` дозволений у firewall;
- ESP32 підключений до тієї самої Wi-Fi/LAN мережі.

## Безпека

- Не коміть `infrastructure/.env`.
- Не коміть `firmware/firmware.env`.
- Не коміть `infrastructure/mosquitto/config/passwordfile`.
- Не відкривай порт `1883` в інтернет.
- Для LAN достатньо, щоб порт `1883` був доступний тільки у локальній мережі.
- Міняй дефолтні паролі перед передачею системи іншому користувачу.
