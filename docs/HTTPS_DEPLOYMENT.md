# HTTPS для вебінтерфейсу

Вебінтерфейс віддається контейнером `frontend` через nginx. У LAN deployment nginx слухає порти `80` і `443`: порт `80` автоматично перенаправляє на HTTPS, а порт `443` віддає React frontend і проксирує `/api` та `/socket.io` у backend.

## Self-signed сертифікат

Якщо в `infrastructure/certs` немає сертифіката, контейнер `frontend` сам створить локальний self-signed сертифікат:

```text
infrastructure/certs/server.crt
infrastructure/certs/server.key
```

Після запуску відкривай вебінтерфейс так:

```text
https://IP_АДРЕСА_UBUNTU_SERVER/
```

Для self-signed сертифіката браузер покаже попередження про недовірений сертифікат. Це нормально для локальної мережі без домену або власного CA.

Перед першим запуском на Ubuntu Server можна вписати IP сервера у `infrastructure/.env`, щоб він потрапив у Subject Alternative Name сертифіката:

```env
TLS_CERT_COMMON_NAME=192.168.1.25
TLS_CERT_SUBJECT_ALT_NAME=DNS:localhost,IP:127.0.0.1,IP:192.168.1.25
```

Якщо сертифікат уже був створений, після зміни цих значень видали `infrastructure/certs/server.crt` і `infrastructure/certs/server.key`, а потім перезапусти frontend.

## Справжній сертифікат

Щоб використати власний або Let's Encrypt сертифікат, поклади файли з такими іменами:

```text
infrastructure/certs/server.crt
infrastructure/certs/server.key
```

Після цього перезапусти frontend:

```bash
docker compose --env-file infrastructure/.env -f infrastructure/docker-compose.lan.yml up -d --build frontend
```

## Firewall Ubuntu

На Ubuntu Server відкрий HTTPS-порт:

```bash
sudo ufw allow 443/tcp
sudo ufw allow 80/tcp
```

Порт `80` потрібен тільки для автоматичного перенаправлення з HTTP на HTTPS.
