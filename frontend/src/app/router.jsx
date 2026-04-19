import { Navigate, createBrowserRouter } from "react-router-dom";

import { ProtectedRoute } from "@/features/auth/protected-route";
import { AppShell } from "@/shared/layouts/app-shell";
import { DashboardPage } from "@/pages/dashboard-page";
import { DevicesPage } from "@/pages/devices-page";
import { RoomsPage } from "@/pages/rooms-page";
import { RoomDetailsPage } from "@/pages/room-details-page";
import { ProvisioningPage } from "@/pages/provisioning-page";
import { AlarmsPage } from "@/pages/alarms-page";
import { EventsPage } from "@/pages/events-page";
import { LoginPage } from "@/pages/login-page";
import { CommandsPage } from "@/pages/commands-page";

export const router = createBrowserRouter([
  {
    path: "/login",
    element: <LoginPage />,
  },
  {
    path: "/",
    element: <ProtectedRoute />,
    children: [
      {
        path: "/",
        element: <AppShell />,
        children: [
          { index: true, element: <Navigate to="/dashboard" replace /> },
          { path: "dashboard", element: <DashboardPage /> },
          { path: "devices", element: <DevicesPage /> },
          { path: "provisioning", element: <ProvisioningPage /> },
          { path: "rooms", element: <RoomsPage /> },
          { path: "rooms/:roomId", element: <RoomDetailsPage /> },
          { path: "alarms", element: <AlarmsPage /> },
          { path: "events", element: <EventsPage /> },
          { path: "commands", element: <CommandsPage /> },
        ],
      },
    ],
  },
]);
