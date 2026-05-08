const { env } = require("./env");

function isLocalhost(hostname) {
  return hostname === "localhost" || hostname === "127.0.0.1";
}

function isPrivateLanHost(hostname) {
  return (
    hostname.startsWith("192.168.") ||
    hostname.startsWith("10.") ||
    /^172\.(1[6-9]|2\d|3[0-1])\./.test(hostname)
  );
}

function isAllowedLanOrigin(origin) {
  try {
    const url = new URL(origin);
    const allowedProtocols = ["http:", "https:"];
    const allowedPorts = ["", "80", "443", "5173"];

    return (
      allowedProtocols.includes(url.protocol) &&
      allowedPorts.includes(url.port) &&
      (isLocalhost(url.hostname) || isPrivateLanHost(url.hostname))
    );
  } catch {
    return false;
  }
}

function isAllowedOrigin(origin) {
  if (!origin) {
    return true;
  }

  return env.clientOrigins.includes(origin) || isAllowedLanOrigin(origin);
}

function corsOrigin(origin, callback) {
  if (isAllowedOrigin(origin)) {
    callback(null, true);
    return;
  }

  callback(new Error("Origin is not allowed by CORS"));
}

module.exports = {
  corsOrigin,
  isAllowedOrigin,
};
