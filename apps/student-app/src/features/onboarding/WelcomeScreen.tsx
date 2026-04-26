import React from 'react';
import {
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import type { FirstRunStackParamList } from '../../navigation/FirstRunNavigator';

type Props = NativeStackScreenProps<FirstRunStackParamList, 'WelcomeScreen'>;

export default function WelcomeScreen({ navigation }: Props) {
  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <View style={styles.container}>
        <View style={styles.topSpacer} />

        <View style={styles.centerContent}>
          <Text style={styles.greeting}>Hello, Homie</Text>

          <Image
            source={require('../../assets/images/UniLocateLogo.png')}
            style={styles.logo}
            resizeMode="contain"
          />

          <Text style={styles.title}>Welcome to UniLocate</Text>
          <Text style={styles.subtitle}>
            Your friendly campus companion for navigation, lost & found, and private student support.
          </Text>
        </View>

        <View style={styles.bottomArea}>
          <Pressable
            style={styles.startButton}
            onPress={() => navigation.navigate('OnboardingCarousel')}
          >
            <Text style={styles.startButtonText}>Let&apos;s start</Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F7F8FA',
  },
  container: {
    flex: 1,
    backgroundColor: '#F7F8FA',
    paddingHorizontal: 24,
  },
  topSpacer: {
    flex: 1,
  },
  centerContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  greeting: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 22,
  },
  logo: {
    height: 150,
  },
  title: {
    marginTop: 22,
    fontSize: 30,
    lineHeight: 36,
    fontWeight: '800',
    color: '#053668',
    textAlign: 'center',
  },
  subtitle: {
    marginTop: 14,
    fontSize: 16,
    lineHeight: 25,
    color: '#667085',
    textAlign: 'center',
    maxWidth: 320,
  },
  bottomArea: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingBottom: 28,
  },
  startButton: {
    height: 56,
    borderRadius: 999,
    backgroundColor: '#FF7100',
    alignItems: 'center',
    justifyContent: 'center',
  },
  startButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});