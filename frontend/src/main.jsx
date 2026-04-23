import React from "react";
import ReactDOM from "react-dom/client";
import { RouterProvider } from "react-router-dom";

import "@/index.css";
import { router } from "@/app/router";
import { AppProviders } from "@/app/providers";
import { registerPushServiceWorker } from "@/shared/lib/web-push";

if ("serviceWorker" in navigator) {
  registerPushServiceWorker().catch(() => {
    console.warn("Не вийшло зареєструвати сервіс-воркер для пуш-повідомлень");
  });
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <AppProviders>
      <RouterProvider router={router} />
    </AppProviders>
  </React.StrictMode>
);
