# Security Room System

Monorepo для системи моніторингу та охорони приміщень на базі ESP32, MQTT, backend, frontend та інфраструктури розгортання.

## Поточна структура

```text
security-room-system/
  firmware/        # прошивка ESP32
  simulation/      # Wokwi-конфігурація та схема симуляції
  backend/         # майбутній backend
  frontend/        # майбутній frontend
  infrastructure/  # docker-compose, broker, deployment configs
  docs/            # загальна документація проєкту
```

## Походження firmware-частини

Поточна firmware- та simulation-основа взята з репозиторію:

`https://github.com/protein2005/esp32_security_system/`

Ця кодова база перенесена в нову monorepo-структуру та буде поетапно підлаштовуватись під нову архітектуру розробки:

- `firmware/` містить ESP32 / PlatformIO код
- `simulation/` містить Wokwi-конфігурацію
- `backend/`, `frontend/` та `infrastructure/` будуть розвиватись у межах цього ж репозиторію
- документація буде поступово переноситись у спільну структуру для всієї системи

## Поточний стан

На цьому етапі в репозиторій вже перенесено:

- прошивку ESP32
- Wokwi simulation files
- базову monorepo-структуру
- root-level PlatformIO wrapper для роботи з firmware у новій структурі

Далі репозиторій буде розширюватись backend-, frontend- та infrastructure-частиною.
