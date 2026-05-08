from pathlib import Path

Import("env")


PROJECT_DIR = Path(env.subst("$PROJECT_DIR"))
DEFAULT_ENV_FILE = PROJECT_DIR / "firmware" / "firmware.env"
OUTPUT_FILE = PROJECT_DIR / "firmware" / "include" / "generated_config.h"

DEFAULTS = {
    "WIFI_SSID": "Wokwi-GUEST",
    "WIFI_PASSWORD": "",
    "MQTT_SERVER": "192.168.0.106",
    "MQTT_PORT": "1883",
    "MQTT_TOPIC_ROOT": "security",
    "MQTT_USERNAME": "security_device",
    "MQTT_PASSWORD": "change-this-mqtt-password",
    "DEVICE_TYPE": "esp32_security_node",
    "DEVICE_TOKEN": "room101_secure_token",
    "FIRMWARE_VERSION": "1.1.0",
}


def parse_env_file(path):
    values = {}

    if not path.exists():
        return values

    for raw_line in path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()

        if not line or line.startswith("#") or "=" not in line:
            continue

        key, value = line.split("=", 1)
        key = key.strip()
        value = value.strip()

        if (value.startswith('"') and value.endswith('"')) or (value.startswith("'") and value.endswith("'")):
            value = value[1:-1]

        values[key] = value

    return values


def escape_cpp_string(value):
    return value.replace("\\", "\\\\").replace('"', '\\"')


def parse_ip(value):
    parts = value.split(".")

    if len(parts) != 4:
        raise ValueError(f"MQTT_SERVER must be an IPv4 address, got: {value}")

    octets = []

    for part in parts:
        number = int(part)

        if number < 0 or number > 255:
            raise ValueError(f"MQTT_SERVER octet out of range: {value}")

        octets.append(str(number))

    return ", ".join(octets)


env_file_value = env.GetProjectOption("custom_firmware_env_file", "")
env_file = PROJECT_DIR / env_file_value if env_file_value else DEFAULT_ENV_FILE
config = {**DEFAULTS, **parse_env_file(env_file)}

try:
    mqtt_port = int(config["MQTT_PORT"])
    mqtt_server = parse_ip(config["MQTT_SERVER"])
except ValueError as error:
    raise SystemExit(f"Invalid firmware env: {error}") from error

OUTPUT_FILE.write_text(
    "\n".join(
        [
            "#ifndef GENERATED_CONFIG_H",
            "#define GENERATED_CONFIG_H",
            "",
            "#include <Arduino.h>",
            "#include <IPAddress.h>",
            "",
            f'static const char *WIFI_SSID = "{escape_cpp_string(config["WIFI_SSID"])}";',
            f'static const char *WIFI_PASSWORD = "{escape_cpp_string(config["WIFI_PASSWORD"])}";',
            "",
            f"static const IPAddress MQTT_SERVER({mqtt_server});",
            f"static const uint16_t MQTT_PORT = {mqtt_port};",
            f'static const char *MQTT_TOPIC_ROOT = "{escape_cpp_string(config["MQTT_TOPIC_ROOT"])}";',
            f'static const char *MQTT_USERNAME = "{escape_cpp_string(config["MQTT_USERNAME"])}";',
            f'static const char *MQTT_PASSWORD = "{escape_cpp_string(config["MQTT_PASSWORD"])}";',
            "",
            f'static const char *DEVICE_TYPE = "{escape_cpp_string(config["DEVICE_TYPE"])}";',
            f'static const char *DEVICE_TOKEN = "{escape_cpp_string(config["DEVICE_TOKEN"])}";',
            f'static const char *FIRMWARE_VERSION = "{escape_cpp_string(config["FIRMWARE_VERSION"])}";',
            "",
            "#endif",
            "",
        ]
    ),
    encoding="utf-8",
)

print(f"Generated firmware config: {OUTPUT_FILE.relative_to(PROJECT_DIR)}")
