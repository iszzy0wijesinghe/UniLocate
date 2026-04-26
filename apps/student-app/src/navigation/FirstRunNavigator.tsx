import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import WelcomeScreen from "../features/onboarding/WelcomeScreen";
import OnboardingCarousel from "../features/onboarding/OnboardingCarousel";
import UsernameRegistration from "../features/auth/UsernameRegistration";
import AuthWelcome from "../features/auth/AuthWelcome";
import LoginScreen from "../features/auth/LoginScreen";
import RegisterScreen from "../features/auth/RegisterScreen";
import PermissionIntroScreen from "../features/location-logs/PermissionIntroScreen";
import Calibration from "../features/calibration/Calibration";
import MainTabs from "./MainTabs";

export type FirstRunStackParamList = {
  WelcomeScreen: undefined;
  OnboardingCarousel: undefined;
  AuthWelcome: undefined;
  Login: undefined;
  Register: undefined;
  UsernameRegistration: undefined;
  LocationPermissions: undefined;
  Calibration: undefined;
  MainApp: undefined;
};

const Stack = createNativeStackNavigator<FirstRunStackParamList>();

export default function FirstRunNavigator() {
  return (
    <Stack.Navigator
      initialRouteName="WelcomeScreen"
      screenOptions={{
        headerShown: false,
        animation: "slide_from_right",
      }}
    >
      <Stack.Screen name="WelcomeScreen" component={WelcomeScreen} />
      <Stack.Screen name="OnboardingCarousel" component={OnboardingCarousel} />
      <Stack.Screen name="AuthWelcome" component={AuthWelcome} />
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
      <Stack.Screen
        name="UsernameRegistration"
        component={UsernameRegistration}
      />
      <Stack.Screen
        name="LocationPermissions"
        component={PermissionIntroScreen}
      />
      <Stack.Screen name="Calibration" component={Calibration} />
      <Stack.Screen name="MainApp" component={MainTabs} />
    </Stack.Navigator>
  );
}