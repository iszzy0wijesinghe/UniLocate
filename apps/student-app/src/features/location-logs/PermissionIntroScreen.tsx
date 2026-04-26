/** @format */

import React, { useMemo, useState } from "react";
import {
  Alert,
  Image,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import PermissionExplainModal from "./PermissionExplainModal";
import {
  checkBarometerAvailability,
  checkSensorAvailability,
  requestLocationPermission,
  requestNotificationPermission,
  savePermissionOnboardingState,
  type PermissionFlowResult,
} from "./permissions";
import type { FirstRunStackParamList } from "../../navigation/FirstRunNavigator";

type Props = NativeStackScreenProps<
  FirstRunStackParamList,
  "LocationPermissions"
>;

type PermissionKind =
  | "location"
  | "notifications"
  | "storage"
  | "wifi"
  | "barometer"
  | "sensors";

const permissionCards: {
  key: PermissionKind;
  title: string;
  description: string;
  iconType: "ionicons" | "material";
  iconName: string;
  tint: string;
  bg: string;
}[] = [
  {
    key: "location",
    title: "GPS Location",
    description: "Save campus-only location logs for Lost & Found support.",
    iconType: "ionicons",
    iconName: "location",
    tint: "#0F6CBD",
    bg: "#EAF4FF",
  },
  {
    key: "notifications",
    title: "Notifications",
    description: "Get updates for complaints, alerts, and Lost & Found.",
    iconType: "ionicons",
    iconName: "notifications",
    tint: "#FF7100",
    bg: "#FFF1E7",
  },
  {
    key: "storage",
    title: "Local Storage",
    description: "Securely keep logs, preferences, and offline app data.",
    iconType: "material",
    iconName: "database-outline",
    tint: "#7C4DFF",
    bg: "#F1ECFF",
  },
  {
    key: "wifi",
    title: "Wi-Fi Status",
    description: "Show connection quality and improve smart campus insights.",
    iconType: "ionicons",
    iconName: "wifi",
    tint: "#00A389",
    bg: "#EAFBF7",
  },
  {
    key: "barometer",
    title: "Barometer",
    description: "Support smarter indoor context when your device allows it.",
    iconType: "material",
    iconName: "speedometer",
    tint: "#F08A00",
    bg: "#FFF4E7",
  },
  {
    key: "sensors",
    title: "Device Sensors",
    description: "Enable future movement-aware and smart campus features.",
    iconType: "material",
    iconName: "access-point",
    tint: "#D84B8A",
    bg: "#FDECF4",
  },
];

export default function PermissionIntroScreen({ navigation }: Props) {
  const [activeModal, setActiveModal] = useState<PermissionKind | null>(null);
  const [isRunning, setIsRunning] = useState(false);

  const { width, height } = useWindowDimensions();
  const isSmallScreen = width < 380;
  const isTablet = width >= 768;
  const horizontalPadding = isTablet ? 28 : 16;
  const cardGap = 12;
  const cardWidth = isTablet
    ? (width - horizontalPadding * 2 - cardGap * 2) / 3
    : (width - horizontalPadding * 2 - cardGap) / 2;

  const permissionQueue = useMemo<PermissionKind[]>(
    () => [
      "location",
      "notifications",
      "storage",
      "wifi",
      "barometer",
      "sensors",
    ],
    [],
  );

  const openNextModal = (index: number) => {
    if (index >= permissionQueue.length) {
      setActiveModal(null);
      setIsRunning(false);
      return;
    }

    const nextType = permissionQueue[index];
    setActiveModal(nextType);
  };

  const runPermissionStep = async (
    type: PermissionKind,
  ): Promise<PermissionFlowResult> => {
    switch (type) {
      case "location":
        return await requestLocationPermission();

      case "notifications":
        return await requestNotificationPermission();

      case "storage":
        return { granted: true, available: true };

      case "wifi":
        return { granted: true, available: true };

      case "barometer": {
        const available = await checkBarometerAvailability();
        return { granted: available, available };
      }

      case "sensors": {
        const available = await checkSensorAvailability();
        return { granted: available, available };
      }

      default:
        return { granted: false, available: false };
    }
  };

  const handleAllowAll = () => {
    if (isRunning) return;

    setIsRunning(true);
    setActiveModal("location");
  };

  const handleModalClose = async () => {
    const currentIndex = permissionQueue.findIndex((x) => x === activeModal);

    if (currentIndex === -1) {
      setActiveModal(null);
      setIsRunning(false);
      return;
    }

    const nextIndex = currentIndex + 1;

    if (nextIndex >= permissionQueue.length) {
      setActiveModal(null);
      await savePermissionOnboardingState({
        locationGranted: false,
        notificationsGranted: false,
        storageReady: true,
        wifiReady: true,
        sensorsAvailable: false,
        barometerAvailable: false,
      });
      setIsRunning(false);
      navigation.navigate("Calibration");
      return;
    }

    openNextModal(nextIndex);
  };

  const handleModalAllow = async () => {
    if (!activeModal) return;

    const currentType = activeModal;
    const currentIndex = permissionQueue.findIndex((x) => x === currentType);

    try {
      const result = await runPermissionStep(currentType);
      await savePermissionOnboardingStatePartial(currentType, result);
    } catch (error) {
      console.log("[permissions] step failed:", currentType, error);
    }

    const nextIndex = currentIndex + 1;

    if (nextIndex >= permissionQueue.length) {
      setActiveModal(null);
      setIsRunning(false);
      navigation.navigate("Calibration");
      return;
    }

    openNextModal(nextIndex);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <LinearGradient
        colors={["#F7FBFF", "#EEF5FC", "#F7FBFF"]}
        style={styles.background}
      />

      <View style={[styles.container, { paddingHorizontal: horizontalPadding }]}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          <View
            style={[
              styles.headerArea,
              { paddingTop: height < 750 ? 12 : 24 },
            ]}
          >
            <Image
              source={require("../../assets/images/UniLocateLogo.png")}
              resizeMode="contain"
              style={styles.logo}
            />

            <Text style={styles.title}>Permissions for UniLocate</Text>
            <Text style={styles.subtitle}>
              We only ask for what helps the app work better for you on campus.
            </Text>
          </View>

          <View style={styles.grid}>
            {permissionCards.map((item) => (
              <View
                key={item.key}
                style={[
                  styles.card,
                  {
                    width: cardWidth,
                    minHeight: isSmallScreen ? 126 : 138,
                  },
                ]}
              >
                <View style={[styles.iconBubble, { backgroundColor: item.bg }]}>
                  {item.iconType === "ionicons" ? (
                    <Ionicons
                      name={item.iconName as any}
                      size={24}
                      color={item.tint}
                    />
                  ) : (
                    <MaterialCommunityIcons
                      name={item.iconName as any}
                      size={24}
                      color={item.tint}
                    />
                  )}
                </View>

                <Text style={styles.cardTitle}>{item.title}</Text>
                <Text style={styles.cardDescription}>{item.description}</Text>
              </View>
            ))}
          </View>
        </ScrollView>

        <View style={styles.bottomArea}>
          <Pressable style={styles.allowAllButton} onPress={handleAllowAll}>
            <Text style={styles.allowAllText}>Allow All</Text>
          </Pressable>

          <Pressable
            style={styles.laterButton}
            onPress={() => {
              Alert.alert(
                "Continue without permissions?",
                "Some features may not work properly without these permissions.",
                [
                  { text: "Cancel", style: "cancel" },
                  {
                    text: "Continue",
                    onPress: () => navigation.navigate("Calibration"),
                  },
                ],
              );
            }}
          >
            <Text style={styles.laterText}>Maybe Later</Text>
          </Pressable>
        </View>
      </View>

      {activeModal ? (
        <PermissionExplainModal
          visible={!!activeModal}
          type={activeModal}
          onClose={handleModalClose}
          onAllow={handleModalAllow}
        />
      ) : null}
    </SafeAreaView>
  );
}

async function savePermissionOnboardingStatePartial(
  type: PermissionKind,
  result: PermissionFlowResult,
) {
  const partialMap = {
    location: {
      locationGranted: result.granted,
    },
    notifications: {
      notificationsGranted: result.granted,
    },
    storage: {
      storageReady: true,
    },
    wifi: {
      wifiReady: true,
    },
    barometer: {
      barometerAvailable: result.available,
    },
    sensors: {
      sensorsAvailable: result.available,
    },
  };

  await savePermissionOnboardingState(partialMap[type]);
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F7FBFF",
  },
  background: {
    ...StyleSheet.absoluteFillObject,
  },

  container: {
    flex: 1,
    paddingTop: 10,
    paddingBottom: 18,
  },
  scrollContent: {
    flexGrow: 1,
  },

  headerArea: {
    alignItems: "center",
  },
  logo: {
    width: 140,
    height: 76,
    marginBottom: 10,
  },
  title: {
    fontSize: 26,
    lineHeight: 32,
    fontWeight: "900",
    color: "#053668",
    textAlign: "center",
  },
  subtitle: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 20,
    color: "#6D7C8A",
    textAlign: "center",
    maxWidth: 320,
  },

  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    rowGap: 12,
    marginTop: 18,
    marginBottom: 18,
  },
  card: {
    borderRadius: 18,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 14,
    paddingVertical: 14,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 5,
  },
  iconBubble: {
    width: 50,
    height: 50,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  cardTitle: {
    fontSize: 15,
    lineHeight: 19,
    fontWeight: "800",
    color: "#053668",
  },
  cardDescription: {
    marginTop: 6,
    fontSize: 12.5,
    lineHeight: 17,
    color: "#617281",
    minHeight: 50,
  },

  bottomArea: {
    alignItems: "center",
    paddingTop: 6,
  },
  allowAllButton: {
    width: "100%",
    maxWidth: 320,
    height: 52,
    borderRadius: 14,
    backgroundColor: "#053668",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#053668",
    shadowOpacity: 0.2,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 6,
  },
  allowAllText: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "900",
  },
  laterButton: {
    marginTop: 12,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  laterText: {
    color: "#7B8794",
    fontSize: 14,
    fontWeight: "700",
  },
});


// /** @format */

// import React, { useMemo, useState } from "react";
// import {
//   Alert,
//   Image,
//   Pressable,
//   SafeAreaView,
//   ScrollView,
//   StyleSheet,
//   Text,
//   View,
//   useWindowDimensions,
// } from "react-native";
// import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
// import { LinearGradient } from "expo-linear-gradient";
// import type { NativeStackScreenProps } from "@react-navigation/native-stack";
// import PermissionExplainModal from "./PermissionExplainModal";
// import {
//   checkBarometerAvailability,
//   checkSensorAvailability,
//   requestLocationPermission,
//   requestNotificationPermission,
//   savePermissionOnboardingState,
//   type PermissionFlowResult,
// } from "./permissions";
// import type { FirstRunStackParamList } from "../../navigation/FirstRunNavigator";

// type Props = NativeStackScreenProps<
//   FirstRunStackParamList,
//   "LocationPermissions"
// >;

// type PermissionKind =
//   | "location"
//   | "notifications"
//   | "storage"
//   | "wifi"
//   | "barometer"
//   | "sensors";

// //const { width, height } = Dimensions.get("window");

// const permissionCards: {
//   key: PermissionKind;
//   title: string;
//   description: string;
//   iconType: "ionicons" | "material";
//   iconName: string;
//   tint: string;
//   bg: string;
// }[] = [
//   {
//     key: "location",
//     title: "GPS Location",
//     description: "Save campus-only location logs for Lost & Found support.",
//     iconType: "ionicons",
//     iconName: "location",
//     tint: "#0F6CBD",
//     bg: "#EAF4FF",
//   },
//   {
//     key: "notifications",
//     title: "Notifications",
//     description: "Get updates for complaints, alerts, and Lost & Found.",
//     iconType: "ionicons",
//     iconName: "notifications",
//     tint: "#FF7100",
//     bg: "#FFF1E7",
//   },
//   {
//     key: "storage",
//     title: "Local Storage",
//     description: "Securely keep logs, preferences, and offline app data.",
//     iconType: "material",
//     iconName: "database-outline",
//     tint: "#7C4DFF",
//     bg: "#F1ECFF",
//   },
//   {
//     key: "wifi",
//     title: "Wi-Fi Status",
//     description: "Show connection quality and improve smart campus insights.",
//     iconType: "ionicons",
//     iconName: "wifi",
//     tint: "#00A389",
//     bg: "#EAFBF7",
//   },
//   {
//     key: "barometer",
//     title: "Barometer",
//     description: "Support smarter indoor context when your device allows it.",
//     iconType: "material",
//     iconName: "speedometer",
//     tint: "#F08A00",
//     bg: "#FFF4E7",
//   },
//   {
//     key: "sensors",
//     title: "Device Sensors",
//     description: "Enable future movement-aware and smart campus features.",
//     iconType: "material",
//     iconName: "access-point",
//     tint: "#D84B8A",
//     bg: "#FDECF4",
//   },
// ];

// export default function PermissionIntroScreen({ navigation }: Props) {
//   const [activeModal, setActiveModal] = useState<PermissionKind | null>(null);
//   const [isRunning, setIsRunning] = useState(false);

//   const permissionQueue = useMemo<PermissionKind[]>(
//     () => [
//       "location",
//       "notifications",
//       "storage",
//       "wifi",
//       "barometer",
//       "sensors",
//     ],
//     [],
//   );

//   const openNextModal = (index: number) => {
//     if (index >= permissionQueue.length) {
//       setActiveModal(null);
//       setIsRunning(false);
//       return;
//     }

//     const nextType = permissionQueue[index];
//     setActiveModal(nextType);
//   };

//   const runPermissionStep = async (
//     type: PermissionKind,
//   ): Promise<PermissionFlowResult> => {
//     switch (type) {
//       case "location":
//         return await requestLocationPermission();

//       case "notifications":
//         return await requestNotificationPermission();

//       case "storage":
//         return { granted: true, available: true };

//       case "wifi":
//         return { granted: true, available: true };

//       case "barometer": {
//         const available = await checkBarometerAvailability();
//         return { granted: available, available };
//       }

//       case "sensors": {
//         const available = await checkSensorAvailability();
//         return { granted: available, available };
//       }

//       default:
//         return { granted: false, available: false };
//     }
//   };

//   const handleAllowAll = () => {
//     if (isRunning) return;

//     setIsRunning(true);
//     setActiveModal("location");
//   };

//   const handleModalClose = async () => {
//     const currentIndex = permissionQueue.findIndex((x) => x === activeModal);

//     if (currentIndex === -1) {
//       setActiveModal(null);
//       setIsRunning(false);
//       return;
//     }

//     const nextIndex = currentIndex + 1;

//     if (nextIndex >= permissionQueue.length) {
//       setActiveModal(null);
//       await savePermissionOnboardingState({
//         locationGranted: false,
//         notificationsGranted: false,
//         storageReady: true,
//         wifiReady: true,
//         sensorsAvailable: false,
//         barometerAvailable: false,
//       });
//       setIsRunning(false);
//       navigation.navigate("Calibration");
//       return;
//     }

//     openNextModal(nextIndex);
//   };

//   const handleModalAllow = async () => {
//     if (!activeModal) return;

//     const currentType = activeModal;
//     const currentIndex = permissionQueue.findIndex((x) => x === currentType);

//     try {
//       const result = await runPermissionStep(currentType);
//       await savePermissionOnboardingStatePartial(currentType, result);
//     } catch (error) {
//       console.log("[permissions] step failed:", currentType, error);
//     }

//     const nextIndex = currentIndex + 1;

//     if (nextIndex >= permissionQueue.length) {
//       setActiveModal(null);
//       setIsRunning(false);
//       navigation.navigate("Calibration");
//       return;
//     }

//     openNextModal(nextIndex);
//   };

//   return (
//     <SafeAreaView style={styles.safeArea}>
//       <LinearGradient
//         colors={["#F7FBFF", "#EEF5FC", "#F7FBFF"]}
//         style={styles.background}
//       />

//       <View style={styles.container}>
//         <View style={styles.headerArea}>
//           <Image
//             source={require("../../assets/images/UniLocateLogo.png")}
//             resizeMode="contain"
//             style={styles.logo}
//           />

//           <Text style={styles.title}>Permissions for UniLocate</Text>
//           <Text style={styles.subtitle}>
//             We only ask for what helps the app work better for you on campus.
//           </Text>
//         </View>

//         <View style={styles.grid}>
//           {permissionCards.map((item) => (
//             <View key={item.key} style={styles.card}>
//               <View style={[styles.iconBubble, { backgroundColor: item.bg }]}>
//                 {item.iconType === "ionicons" ? (
//                   <Ionicons
//                     name={item.iconName as any}
//                     size={24}
//                     color={item.tint}
//                   />
//                 ) : (
//                   <MaterialCommunityIcons
//                     name={item.iconName as any}
//                     size={24}
//                     color={item.tint}
//                   />
//                 )}
//               </View>

//               <Text style={styles.cardTitle}>{item.title}</Text>
//               <Text style={styles.cardDescription}>{item.description}</Text>
//             </View>
//           ))}
//         </View>

//         <View style={styles.bottomArea}>
//           <Pressable style={styles.allowAllButton} onPress={handleAllowAll}>
//             <Text style={styles.allowAllText}>Allow All</Text>
//           </Pressable>

//           <Pressable
//             style={styles.laterButton}
//             onPress={() => {
//               Alert.alert(
//                 "Continue without permissions?",
//                 "Some features may not work properly without these permissions.",
//                 [
//                   { text: "Cancel", style: "cancel" },
//                   {
//                     text: "Continue",
//                     onPress: () => navigation.navigate("Calibration"),
//                   },
//                 ],
//               );
//             }}>
//             <Text style={styles.laterText}>Maybe Later</Text>
//           </Pressable>
//         </View>
//       </View>

//       {activeModal ? (
//         <PermissionExplainModal
//           visible={!!activeModal}
//           type={activeModal}
//           onClose={handleModalClose}
//           onAllow={handleModalAllow}
//         />
//       ) : null}
//     </SafeAreaView>
//   );
// }

// async function savePermissionOnboardingStatePartial(
//   type: PermissionKind,
//   result: PermissionFlowResult,
// ) {
//   const partialMap = {
//     location: {
//       locationGranted: result.granted,
//     },
//     notifications: {
//       notificationsGranted: result.granted,
//     },
//     storage: {
//       storageReady: true,
//     },
//     wifi: {
//       wifiReady: true,
//     },
//     barometer: {
//       barometerAvailable: result.available,
//     },
//     sensors: {
//       sensorsAvailable: result.available,
//     },
//   };

//   await savePermissionOnboardingState(partialMap[type]);
// }

// // const cardGap = 12;
// // const horizontalPadding = 20;
// // const cardWidth = (width - horizontalPadding * 2 - cardGap) / 2;

// const styles = StyleSheet.create({
//   safeArea: {
//     flex: 1,
//     backgroundColor: "#F7FBFF",
//   },
//   background: {
//     ...StyleSheet.absoluteFillObject,
//   },

//   container: {
//     flex: 1,
//     paddingHorizontal: horizontalPadding,
//     paddingTop: 10,
//     paddingBottom: 22,
//     justifyContent: "space-between",
//   },

//   headerArea: {
//     alignItems: "center",
//     paddingTop: height < 750 ? 16 : 28,
//   },
//   logo: {
//     width: 150,
//     height: 84,
//     marginBottom: 12,
//   },
//   title: {
//     fontSize: 28,
//     lineHeight: 34,
//     fontWeight: "900",
//     color: "#053668",
//     textAlign: "center",
//   },
//   subtitle: {
//     marginTop: 8,
//     fontSize: 14,
//     lineHeight: 20,
//     color: "#6D7C8A",
//     textAlign: "center",
//     maxWidth: 300,
//   },

//   grid: {
//     flexDirection: "row",
//     flexWrap: "wrap",
//     justifyContent: "space-between",
//     rowGap: 12,
//     marginTop: 10,
//     marginBottom: 12,
//   },
//   card: {
//     width: cardWidth,
//     minHeight: 138,
//     borderRadius: 24,
//     backgroundColor: "#FFFFFF",
//     paddingHorizontal: 14,
//     paddingVertical: 14,
//     shadowColor: "#000",
//     shadowOpacity: 0.08,
//     shadowRadius: 12,
//     shadowOffset: { width: 0, height: 6 },
//     elevation: 6,
//   },
//   iconBubble: {
//     width: 50,
//     height: 50,
//     borderRadius: 25,
//     alignItems: "center",
//     justifyContent: "center",
//     marginBottom: 10,
//   },
//   cardTitle: {
//     fontSize: 15,
//     lineHeight: 19,
//     fontWeight: "800",
//     color: "#053668",
//   },
//   cardDescription: {
//     marginTop: 6,
//     fontSize: 12.5,
//     lineHeight: 17,
//     color: "#617281",
//     minHeight: 50,
//   },

//   bottomArea: {
//     alignItems: "center",
//     paddingTop: 6,
//   },
//   allowAllButton: {
//     width: 220,
//     height: 54,
//     borderRadius: 18,
//     backgroundColor: "#053668",
//     alignItems: "center",
//     justifyContent: "center",
//     shadowColor: "#053668",
//     shadowOpacity: 0.22,
//     shadowRadius: 12,
//     shadowOffset: { width: 0, height: 6 },
//     elevation: 8,
//   },
//   allowAllText: {
//     color: "#FFFFFF",
//     fontSize: 17,
//     fontWeight: "900",
//   },
//   laterButton: {
//     marginTop: 12,
//     paddingHorizontal: 14,
//     paddingVertical: 8,
//   },
//   laterText: {
//     color: "#7B8794",
//     fontSize: 14,
//     fontWeight: "700",
//   },
// });
