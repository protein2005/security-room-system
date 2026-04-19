const test = require("node:test");
const assert = require("node:assert/strict");
const http = require("node:http");
const path = require("node:path");
const mongoose = require("mongoose");

function clearBackendModuleCache() {
  const rootPrefix = `${path.resolve(__dirname, "..", "src")}${path.sep}`;

  Object.keys(require.cache).forEach((modulePath) => {
    if (modulePath.startsWith(rootPrefix)) {
      delete require.cache[modulePath];
    }
  });

  Object.keys(mongoose.models).forEach((modelName) => {
    delete mongoose.models[modelName];
  });

  Object.keys(mongoose.connection.models).forEach((modelName) => {
    delete mongoose.connection.models[modelName];
  });
}

function mockModule(relativePath, exports) {
  const filename = require.resolve(relativePath);

  require.cache[filename] = {
    id: filename,
    filename,
    loaded: true,
    exports,
  };
}

async function createTestServer(mocks = {}) {
  clearBackendModuleCache();

  Object.entries(mocks).forEach(([relativePath, exports]) => {
    mockModule(relativePath, exports);
  });

  const { createApp } = require("../src/app");
  const app = createApp();
  const server = http.createServer(app);

  await new Promise((resolve) => server.listen(0, resolve));

  const address = server.address();
  const baseUrl = `http://127.0.0.1:${address.port}`;

  return {
    baseUrl,
    async close() {
      await new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
      clearBackendModuleCache();
    },
  };
}

test("POST /api/auth/login returns access token and user payload", async () => {
  const authServiceMock = {
    async login({ email, password }) {
      assert.equal(email, "admin@example.com");
      assert.equal(password, "secret123");

      return {
        accessToken: "test-token",
        user: {
          email,
          role: "admin",
        },
      };
    },
    verifyAccessToken() {
      throw new Error("verifyAccessToken should not be called in login test");
    },
    getCurrentUser() {
      throw new Error("getCurrentUser should not be called in login test");
    },
  };

  const server = await createTestServer({
    "../src/modules/auth/auth.service": authServiceMock,
  });

  try {
    const response = await fetch(`${server.baseUrl}/api/auth/login`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        email: "admin@example.com",
        password: "secret123",
      }),
    });

    assert.equal(response.status, 200);

    const payload = await response.json();

    assert.equal(payload.accessToken, "test-token");
    assert.equal(payload.user.email, "admin@example.com");
    assert.equal(payload.user.role, "admin");
  } finally {
    await server.close();
  }
});

test("POST /api/provisioning/device/:deviceId uses auth context and returns 202", async () => {
  const captured = [];

  const authServiceMock = {
    verifyAccessToken(token) {
      assert.equal(token, "valid-token");
      return {
        sub: "user-1",
        email: "admin@example.com",
        role: "admin",
        name: "Admin User",
      };
    },
    async login() {
      throw new Error("login should not be called in provisioning test");
    },
    async getCurrentUser() {
      throw new Error("getCurrentUser should not be called in provisioning test");
    },
  };

  const provisioningServiceMock = {
    async provisionDevice(input) {
      captured.push(input);
      return {
        success: true,
        roomId: input.roomId,
        deviceId: input.deviceId,
      };
    },
  };

  const server = await createTestServer({
    "../src/modules/auth/auth.service": authServiceMock,
    "../src/modules/provisioning/provisioning.service": provisioningServiceMock,
  });

  try {
    const response = await fetch(`${server.baseUrl}/api/provisioning/device/esp32-1`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: "Bearer valid-token",
      },
      body: JSON.stringify({ roomId: "room101" }),
    });

    assert.equal(response.status, 202);

    const payload = await response.json();

    assert.equal(payload.deviceId, "esp32-1");
    assert.equal(payload.roomId, "room101");
    assert.deepEqual(captured[0], {
      deviceId: "esp32-1",
      roomId: "room101",
      requestedBy: {
        userId: "user-1",
        email: "admin@example.com",
        role: "admin",
        name: "Admin User",
      },
    });
  } finally {
    await server.close();
  }
});

test("POST /api/rooms/:roomId/arm publishes ARM command through room command service", async () => {
  const captured = [];

  const authServiceMock = {
    verifyAccessToken() {
      return {
        sub: "user-1",
        email: "admin@example.com",
        role: "admin",
        name: "Admin User",
      };
    },
    async login() {
      throw new Error("login should not be called in room command test");
    },
    async getCurrentUser() {
      throw new Error("getCurrentUser should not be called in room command test");
    },
  };

  const commandServiceMock = {
    async sendRoomCommand(roomId, action, payload, requestedBy) {
      captured.push({ roomId, action, payload, requestedBy });
      return { success: true, roomId, action };
    },
    async listCommands() {
      return [];
    },
  };

  const server = await createTestServer({
    "../src/modules/auth/auth.service": authServiceMock,
    "../src/modules/commands/command.service": commandServiceMock,
  });

  try {
    const response = await fetch(`${server.baseUrl}/api/rooms/room101/arm`, {
      method: "POST",
      headers: {
        authorization: "Bearer valid-token",
      },
    });

    assert.equal(response.status, 202);

    const payload = await response.json();

    assert.equal(payload.action, "ARM");
    assert.equal(captured[0].roomId, "room101");
    assert.equal(captured[0].action, "ARM");
    assert.deepEqual(captured[0].payload, {});
    assert.equal(captured[0].requestedBy.role, "admin");
  } finally {
    await server.close();
  }
});

test("POST /api/devices/:deviceId/factory-reset publishes FACTORY_RESET command", async () => {
  const captured = [];

  const authServiceMock = {
    verifyAccessToken() {
      return {
        sub: "user-1",
        email: "admin@example.com",
        role: "admin",
        name: "Admin User",
      };
    },
    async login() {
      throw new Error("login should not be called in factory reset test");
    },
    async getCurrentUser() {
      throw new Error("getCurrentUser should not be called in factory reset test");
    },
  };

  const commandServiceMock = {
    async sendDeviceCommand(deviceId, action, payload, requestedBy) {
      captured.push({ deviceId, action, payload, requestedBy });
      return { success: true, deviceId, action };
    },
    async listCommands() {
      return [];
    },
  };

  const deviceServiceMock = {
    async listDevices() {
      return [];
    },
    async listUnprovisionedDevices() {
      return [];
    },
    async getDeviceByDeviceId(deviceId) {
      return { deviceId };
    },
  };

  const server = await createTestServer({
    "../src/modules/auth/auth.service": authServiceMock,
    "../src/modules/commands/command.service": commandServiceMock,
    "../src/modules/devices/device.service": deviceServiceMock,
  });

  try {
    const response = await fetch(`${server.baseUrl}/api/devices/esp32-1/factory-reset`, {
      method: "POST",
      headers: {
        authorization: "Bearer valid-token",
      },
    });

    assert.equal(response.status, 202);

    const payload = await response.json();

    assert.equal(payload.action, "FACTORY_RESET");
    assert.equal(captured[0].deviceId, "esp32-1");
    assert.equal(captured[0].action, "FACTORY_RESET");
    assert.deepEqual(captured[0].payload, {});
    assert.equal(captured[0].requestedBy.email, "admin@example.com");
  } finally {
    await server.close();
  }
});
