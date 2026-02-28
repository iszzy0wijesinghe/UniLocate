import React, { useEffect } from "react";
import RootNavigator from "./src/navigation/RootNavigator";
import { ensureNotificationPermissions } from "./src/notifications";

export default function App() {
  useEffect(() => {
    ensureNotificationPermissions();
  }, []);

  return <RootNavigator />;
}