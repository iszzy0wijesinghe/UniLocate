import React from "react";
import { NavigationContainer } from "@react-navigation/native";

import FirstRunNavigator from "./src/navigation/FirstRunNavigator";
import MainTabs from "./src/navigation/MainTabs";
import { useUserProfileStore } from "./src/store/useUserProfileStore";

export default function App() {
  const hasCompletedFirstRun = useUserProfileStore(
    (state) => state.hasCompletedFirstRun,
  );

  return (
    <NavigationContainer>
      {hasCompletedFirstRun ? <MainTabs /> : <FirstRunNavigator />}
    </NavigationContainer>
  );
}

// import React from "react";
// import { NavigationContainer } from "@react-navigation/native";
// import FirstRunNavigator from "./src/navigation/FirstRunNavigator";

// export default function App() {
//   return (
//     <NavigationContainer>
//       <FirstRunNavigator />
//     </NavigationContainer>
//   );
// }