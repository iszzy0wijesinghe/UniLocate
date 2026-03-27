import React from 'react';
import {
  Animated,
  Dimensions,
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

import type { FirstRunStackParamList } from '../../navigation/FirstRunNavigator';

const { width } = Dimensions.get('window');

type Props = NativeStackScreenProps<FirstRunStackParamList, 'OnboardingCarousel'>;

type Slide = {
  id: string;
  eyebrow: string;
  title: string;
  subtitle: string;
  iconType: 'welcome' | 'geo' | 'lost-found' | 'complaints';
};

const slides: Slide[] = [
  {
    id: 'welcome',
    eyebrow: 'Welcome to UniLocate',
    title: 'Your smart campus companion',
    subtitle:
      'Move around campus with more confidence using indoor-aware location support, student safety tools, and privacy-first design.',
    iconType: 'welcome',
  },
  {
    id: 'geo',
    eyebrow: 'Geo-location & floor detection',
    title: 'Find where you are more accurately',
    subtitle:
      'UniLocate combines GPS, Wi-Fi, compass, and supported device sensors to improve campus navigation and floor-level awareness.',
    iconType: 'geo',
  },
  {
    id: 'lost-found',
    eyebrow: 'Smart Lost & Found',
    title: 'Reconnect students with their belongings',
    subtitle:
      'Post what you lost, report what you found, and make campus recovery faster through a simple shared student flow.',
    iconType: 'lost-found',
  },
  {
    id: 'complaints',
    eyebrow: 'Anonymous complaints',
    title: 'Report concerns privately',
    subtitle:
      'Raise sensitive issues without exposing your identity. UniLocate supports a safer and more private complaint experience.',
    iconType: 'complaints',
  },
];

function HeroArtwork({
  type,
  scrollX,
  index,
}: {
  type: Slide['iconType'];
  scrollX: Animated.Value;
  index: number;
}) {
  const inputRange = [(index - 1) * width, index * width, (index + 1) * width];

  const mainTranslateY = scrollX.interpolate({
    inputRange,
    outputRange: [30, 0, 30],
    extrapolate: 'clamp',
  });

  const mainScale = scrollX.interpolate({
    inputRange,
    outputRange: [0.82, 1, 0.82],
    extrapolate: 'clamp',
  });

  const mainOpacity = scrollX.interpolate({
    inputRange,
    outputRange: [0.25, 1, 0.25],
    extrapolate: 'clamp',
  });

  const glowScale = scrollX.interpolate({
    inputRange,
    outputRange: [0.85, 1.08, 0.85],
    extrapolate: 'clamp',
  });

  const accentTranslateX = scrollX.interpolate({
    inputRange,
    outputRange: [-24, 0, 24],
    extrapolate: 'clamp',
  });

  const accentRotate = scrollX.interpolate({
    inputRange,
    outputRange: ['-12deg', '0deg', '12deg'],
    extrapolate: 'clamp',
  });

  return (
    <Animated.View
      style={[
        styles.heroGraphicWrap,
        {
          opacity: mainOpacity,
          transform: [{ translateY: mainTranslateY }, { scale: mainScale }],
        },
      ]}
    >
      <Animated.View
        style={[
          styles.glowCircleLarge,
          {
            transform: [{ scale: glowScale }],
          },
        ]}
      />
      <Animated.View
        style={[
          styles.glowCircleSmall,
          {
            transform: [{ translateX: accentTranslateX }, { rotate: accentRotate }],
          },
        ]}
      />

      {type === 'welcome' ? (
        <View style={styles.iconBubblePrimary}>
          <Ionicons name="location-outline" size={88} color="#053668" />
        </View>
      ) : type === 'geo' ? (
        <View style={styles.iconStack}>
          <View style={styles.iconBubblePrimary}>
            <Ionicons name="navigate-circle-outline" size={86} color="#053668" />
          </View>
          <Animated.View
            style={[
              styles.iconBubbleAccent,
              {
                transform: [{ translateX: accentTranslateX }],
              },
            ]}
          >
            <MaterialCommunityIcons name="layers-outline" size={34} color="#FF7100" />
          </Animated.View>
        </View>
      ) : type === 'lost-found' ? (
        <View style={styles.iconStack}>
          <View style={styles.iconBubblePrimary}>
            <Ionicons name="search-outline" size={82} color="#053668" />
          </View>
          <Animated.View
            style={[
              styles.iconBubbleAccent,
              {
                transform: [{ translateX: accentTranslateX }],
              },
            ]}
          >
            <Ionicons name="cube-outline" size={32} color="#FF7100" />
          </Animated.View>
        </View>
      ) : (
        <View style={styles.iconStack}>
          <View style={styles.iconBubblePrimary}>
            <Ionicons name="shield-outline" size={84} color="#053668" />
          </View>
          <Animated.View
            style={[
              styles.iconBubbleAccent,
              {
                transform: [{ translateX: accentTranslateX }],
              },
            ]}
          >
            <Ionicons name="chatbubble-ellipses-outline" size={32} color="#FF7100" />
          </Animated.View>
        </View>
      )}
    </Animated.View>
  );
}

export default function OnboardingCarousel({ navigation }: Props) {
  const flatListRef = React.useRef<FlatList<Slide>>(null);
  const scrollX = React.useRef(new Animated.Value(0)).current;
  const [currentIndex, setCurrentIndex] = React.useState(0);

  const handleNext = () => {
    if (currentIndex === slides.length - 1) {
      navigation.navigate('UsernameRegistration');
      return;
    }

    flatListRef.current?.scrollToIndex({
      index: currentIndex + 1,
      animated: true,
    });
  };

  const handleSkip = () => {
    navigation.navigate('UsernameRegistration');
  };

  const handleMomentumEnd = (event: any) => {
    const nextIndex = Math.round(event.nativeEvent.contentOffset.x / width);
    setCurrentIndex(nextIndex);
  };

  const renderItem = ({
    item,
    index,
  }: {
    item: Slide;
    index: number;
  }) => {
    const inputRange = [(index - 1) * width, index * width, (index + 1) * width];

    const textOpacity = scrollX.interpolate({
      inputRange,
      outputRange: [0.2, 1, 0.2],
      extrapolate: 'clamp',
    });

    const textTranslateY = scrollX.interpolate({
      inputRange,
      outputRange: [28, 0, 28],
      extrapolate: 'clamp',
    });

    return (
      <View style={styles.slide}>
        <View style={styles.heroCard}>
          <View style={styles.logoWrap}>
            <Image
              source={require('../../assets/images/UniLocateLogo.png')}
              style={styles.logo}
              resizeMode="contain"
            />
          </View>

          <HeroArtwork type={item.iconType} scrollX={scrollX} index={index} />
        </View>

        <Animated.View
          style={[
            styles.textBlock,
            {
              opacity: textOpacity,
              transform: [{ translateY: textTranslateY }],
            },
          ]}
        >
          <Text style={styles.eyebrow}>{item.eyebrow}</Text>
          <Text style={styles.title}>{item.title}</Text>
          <Text style={styles.subtitle}>{item.subtitle}</Text>
        </Animated.View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <View style={styles.container}>
        <Animated.FlatList
          ref={flatListRef}
          data={slides}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          bounces={false}
          onMomentumScrollEnd={handleMomentumEnd}
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { x: scrollX } } }],
            { useNativeDriver: true }
          )}
          scrollEventThrottle={16}
          getItemLayout={(_, index) => ({
            length: width,
            offset: width * index,
            index,
          })}
        />

        <View style={styles.footer}>
          <Pressable onPress={handleSkip} style={styles.skipButton}>
            <Text style={styles.skipText}>Skip</Text>
          </Pressable>

          <View style={styles.dotsWrap}>
            {slides.map((slide, index) => {
              const active = index === currentIndex;
              return (
                <View
                  key={slide.id}
                  style={[styles.dot, active ? styles.dotActive : styles.dotInactive]}
                />
              );
            })}
          </View>

          <Pressable style={styles.nextButton} onPress={handleNext}>
            <Ionicons
              name={currentIndex === slides.length - 1 ? 'checkmark' : 'arrow-forward'}
              size={20}
              color="#053668"
            />
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
  },
  slide: {
    width,
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  heroCard: {
    height: 410,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    borderBottomLeftRadius: 72,
    borderBottomRightRadius: 72,
    backgroundColor: '#EAF0F5',
    paddingTop: 20,
    paddingHorizontal: 22,
    paddingBottom: 24,
    overflow: 'hidden',
  },
  logoWrap: {
    alignItems: 'center',
    marginTop: 8,
  },
  logo: {
    width: 210,
    height: 58,
  },
  heroGraphicWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glowCircleLarge: {
    position: 'absolute',
    width: 250,
    height: 250,
    borderRadius: 125,
    backgroundColor: 'rgba(5,54,104,0.08)',
  },
  glowCircleSmall: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255,113,0,0.12)',
    top: 48,
    left: 34,
  },
  iconStack: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBubblePrimary: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#053668',
    shadowOpacity: 0.08,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  iconBubbleAccent: {
    position: 'absolute',
    right: -10,
    bottom: -6,
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#FFF3E8',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,113,0,0.16)',
  },
  textBlock: {
    paddingHorizontal: 10,
    paddingTop: 36,
  },
  eyebrow: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: '#FF7100',
  },
  title: {
    marginTop: 10,
    fontSize: 30,
    lineHeight: 36,
    fontWeight: '800',
    color: '#053668',
  },
  subtitle: {
    marginTop: 14,
    fontSize: 16,
    lineHeight: 25,
    color: '#667085',
  },
  footer: {
    paddingHorizontal: 24,
    paddingTop: 18,
    paddingBottom: 28,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  skipButton: {
    minWidth: 54,
  },
  skipText: {
    fontSize: 17,
    fontWeight: '500',
    color: '#111827',
  },
  dotsWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: '#EEF1F5',
  },
  dot: {
    height: 8,
    borderRadius: 999,
  },
  dotActive: {
    width: 26,
    backgroundColor: '#111827',
  },
  dotInactive: {
    width: 8,
    backgroundColor: '#C7CED8',
  },
  nextButton: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
});