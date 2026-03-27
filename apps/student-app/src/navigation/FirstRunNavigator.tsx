import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import WelcomeScreen from '../features/onboarding/WelcomeScreen';
import OnboardingCarousel from '../features/onboarding/OnboardingCarousel';
import UsernameRegistration from '../features/auth/UsernameRegistration';
import Calibration from '../features/calibration/Calibration';
import MainTabs from './MainTabs';

export type FirstRunStackParamList = {
  WelcomeScreen: undefined;
  OnboardingCarousel: undefined;
  UsernameRegistration: undefined;
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
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="WelcomeScreen" component={WelcomeScreen} />
      <Stack.Screen name="OnboardingCarousel" component={OnboardingCarousel} />
      <Stack.Screen name="UsernameRegistration" component={UsernameRegistration} />
      <Stack.Screen name="Calibration" component={Calibration} />
      <Stack.Screen name="MainApp" component={MainTabs} />
    </Stack.Navigator>
  );
}