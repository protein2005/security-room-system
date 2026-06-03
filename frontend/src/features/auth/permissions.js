const pageRoles = {
  dashboard: ["admin", "operator", "viewer"],
  rooms: ["admin", "operator", "viewer"],
  roomDetails: ["admin", "operator", "viewer"],
  alarms: ["admin", "operator", "viewer"],
  events: ["admin", "operator", "viewer"],
  commands: ["admin", "operator", "viewer"],
  devices: ["admin", "operator"],
  provisioning: ["admin", "operator"],
  settings: ["admin", "operator", "viewer"],
};

const actionRoles = {
  roomControl: ["admin", "operator"],
  roomThresholds: ["admin", "operator"],
  deviceFactoryReset: ["admin"],
  deviceArchive: ["admin"],
  roomArchive: ["admin"],
  provisioning: ["admin", "operator"],
  userManagement: ["admin"],
  passwordChange: ["admin"],
};

export function hasRoleAccess(role, allowedRoles = []) {
  return allowedRoles.includes(role);
}

export function canAccessPage(role, pageKey) {
  return hasRoleAccess(role, pageRoles[pageKey] || []);
}

export function canPerformAction(role, actionKey) {
  return hasRoleAccess(role, actionRoles[actionKey] || []);
}
