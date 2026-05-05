function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replaceAll("-", "+").replaceAll("_", "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let index = 0; index < rawData.length; index += 1) {
    outputArray[index] = rawData.charCodeAt(index);
  }

  return outputArray;
}

export async function registerPushServiceWorker() {
  if (!("serviceWorker" in navigator)) {
    throw new Error("Service workers are not supported in this browser");
  }

  return navigator.serviceWorker.register("/sw.js");
}

export async function createBrowserPushSubscription(publicKey) {
  if (!("Notification" in window) || !("serviceWorker" in navigator)) {
    throw new Error("Push notifications are not supported in this browser");
  }

  const permission = await Notification.requestPermission();

  if (permission !== "granted") {
    throw new Error("Notification permission was not granted");
  }

  const registration = await registerPushServiceWorker();
  const existingSubscription = await registration.pushManager.getSubscription();

  if (existingSubscription) {
    return existingSubscription.toJSON();
  }

  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(publicKey),
  });

  return subscription.toJSON();
}

export async function removeBrowserPushSubscription() {
  if (!("serviceWorker" in navigator)) {
    return null;
  }

  const registration = await navigator.serviceWorker.getRegistration("/sw.js");

  if (!registration) {
    return null;
  }

  const subscription = await registration.pushManager.getSubscription();

  if (!subscription) {
    return null;
  }

  const payload = subscription.toJSON();
  await subscription.unsubscribe();
  return payload;
}
