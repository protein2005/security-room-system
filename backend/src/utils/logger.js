function formatMeta(meta) {
  if (meta === undefined) {
    return "";
  }

  if (meta instanceof Error) {
    return JSON.stringify(
      {
        name: meta.name,
        message: meta.message,
        stack: meta.stack,
      },
      null,
      2
    );
  }

  if (typeof meta === "object" && meta !== null) {
    try {
      return JSON.stringify(meta, null, 2);
    } catch (_error) {
      return String(meta);
    }
  }

  return String(meta);
}

function write(level, message, meta) {
  const prefix = `${new Date().toISOString()} [${level}]`;
  const suffix = formatMeta(meta);
  const line = suffix ? `${prefix} ${message} ${suffix}` : `${prefix} ${message}`;

  if (level === "ERROR") {
    console.error(line);
    return;
  }

  if (level === "WARN") {
    console.warn(line);
    return;
  }

  console.log(line);
}

const logger = {
  info(message, meta) {
    write("INFO", message, meta);
  },
  warn(message, meta) {
    write("WARN", message, meta);
  },
  error(message, meta) {
    write("ERROR", message, meta);
  },
};

module.exports = { logger };
