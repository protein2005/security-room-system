import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export function formatDateTime(value) {
  if (!value) {
    return "—";
  }

  return new Intl.DateTimeFormat("uk-UA", {
    dateStyle: "short",
    timeStyle: "medium",
  }).format(new Date(value));
}

export function formatNumber(value, digits = 1) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return "—";
  }

  return Number(value).toFixed(digits);
}

export function formatEventName(eventName) {
  if (!eventName) {
    return "Системна подія";
  }

  if (eventName === "DEVICE_PROVISIONED") return "Пристрій прив'язано";
  if (eventName === "LOCAL_ARM") return "Локальне увімкнення охорони";
  if (eventName === "LOCAL_ALARM_SILENCE") return "Локальне приглушення тривоги";
  if (eventName === "LOCAL_DISARM_BLOCKED") return "Локальне вимкнення заблоковано";
  if (eventName === "FACTORY_RESET") return "Заводське скидання";

  return eventName.replaceAll("_", " ");
}

export function formatAlarmReason(reason) {
  if (!reason) {
    return "Тривога";
  }

  if (reason === "SENSOR_FAILURE") return "Помилка сенсора";
  if (reason === "TEMP_OUT_OF_RANGE") return "Температура поза межами";
  if (reason === "HUMIDITY_OUT_OF_RANGE") return "Вологість поза межами";
  if (reason === "DOOR_OPEN") return "Відчинені двері";
  if (reason === "MOTION") return "Виявлено рух";

  return reason.replaceAll("_", " ");
}

export function formatStatusCode(status) {
  if (!status) {
    return "Системний статус";
  }

  if (status === "PROVISIONED") return "Пристрій прив'язано";
  if (status === "UNPROVISIONED") return "Пристрій без прив'язки";
  if (status === "ONLINE") return "Пристрій онлайн";
  if (status === "OFFLINE") return "Пристрій офлайн";
  if (status === "ARMED") return "Охорону увімкнено";
  if (status === "DISARMED") return "Охорону вимкнено";
  if (status === "ALARM") return "Тривога активна";
  if (status === "ALARM_RESET") return "Тривогу скинуто";
  if (status === "ALARM_CLEARED") return "Тривогу очищено";
  if (status === "THRESHOLDS_UPDATED") return "Пороги оновлено";
  if (status === "FACTORY_RESET") return "Заводське скидання";

  return status.replaceAll("_", " ");
}

export function formatCommandAction(action) {
  if (!action) {
    return "Системна команда";
  }

  if (action === "PROVISION") return "Прив'язка пристрою";
  if (action === "ARM") return "Увімкнення охорони";
  if (action === "DISARM") return "Вимкнення охорони";
  if (action === "RESET_ALARM") return "Скидання тривоги";
  if (action === "SET_THRESHOLDS") return "Оновлення порогів";
  if (action === "FACTORY_RESET") return "Заводське скидання";

  return action.replaceAll("_", " ");
}

export function formatEventSource(source) {
  if (!source) {
    return "Система";
  }

  if (source === "system") return "Система";
  if (source === "remote") return "Віддалена команда";
  if (source === "local") return "Локальна дія";

  return source.replaceAll("_", " ");
}

export function formatZoneType(zoneType) {
  if (!zoneType) {
    return "Зона без типу";
  }

  if (zoneType === "server_room") return "Серверна";
  if (zoneType === "office") return "Офіс";
  if (zoneType === "corridor") return "Коридор";
  if (zoneType === "warehouse") return "Склад";
  if (zoneType === "laboratory") return "Лабораторія";
  if (zoneType === "classroom") return "Аудиторія";
  if (zoneType === "hall") return "Зал";
  if (zoneType === "entry") return "Вхідна зона";

  return zoneType.replaceAll("_", " ");
}

export function formatDeviceType(deviceType) {
  if (!deviceType) {
    return "Невідомий тип";
  }

  if (deviceType === "security_room_sensor") return "Сенсор безпеки приміщення";
  if (deviceType === "room_sensor") return "Кімнатний сенсор";
  if (deviceType === "sensor_hub") return "Сенсорний хаб";
  if (deviceType === "esp32") return "ESP32-контролер";

  return deviceType.replaceAll("_", " ");
}

export function formatUserRole(role) {
  if (!role) {
    return "Користувач";
  }

  if (role === "admin") return "Адміністратор";
  if (role === "operator") return "Оператор";
  if (role === "viewer") return "Спостерігач";

  return role.replaceAll("_", " ");
}
