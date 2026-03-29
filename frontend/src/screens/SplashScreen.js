import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Image,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
  StatusBar,
} from "react-native";
import { Video, ResizeMode } from "expo-av";

const { width, height } = Dimensions.get("window");

const DOTS = [".", "..", "..."];

export default function SplashScreen({ onFinish }) {
  const logoScale = useRef(new Animated.Value(0)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const videoOpacity = useRef(new Animated.Value(0)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;
  const textPulse = useRef(new Animated.Value(1)).current;
  const fadeOut = useRef(new Animated.Value(1)).current;
  const [dotIndex, setDotIndex] = useState(0);
  const [minTimeReached, setMinTimeReached] = useState(false);
  const [videoReady, setVideoReady] = useState(false);
  const [readyToFinish, setReadyToFinish] = useState(false);

  useEffect(() => {
    // Animate logo: scale up + fade in
    Animated.parallel([
      Animated.spring(logoScale, {
        toValue: 1,
        friction: 6,
        tension: 40,
        useNativeDriver: true,
      }),
      Animated.timing(logoOpacity, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();

    // Fade in video after 400ms
    setTimeout(() => {
      Animated.timing(videoOpacity, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }).start();
    }, 400);

    // Fade in loading text after 800ms
    setTimeout(() => {
      Animated.timing(textOpacity, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }).start();
    }, 800);

    // Pulse animation for loading text
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(textPulse, {
          toValue: 0.4,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(textPulse, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();

    // Animate dots
    const dotInterval = setInterval(() => {
      setDotIndex((prev) => (prev + 1) % 3);
    }, 500);

    // Minimum 3 seconds
    const timer = setTimeout(() => {
      setMinTimeReached(true);
    }, 3000);

    return () => {
      pulse.stop();
      clearInterval(dotInterval);
      clearTimeout(timer);
    };
  }, []);

  // Only finish when BOTH video is loaded AND 3s have passed
  useEffect(() => {
    if (minTimeReached && videoReady && !readyToFinish) {
      setReadyToFinish(true);
    }
  }, [minTimeReached, videoReady]);

  // Start 3s countdown AFTER video loads (so user always sees 3s of video)
  const handleVideoLoad = () => {
    setVideoReady(true);
  };

  useEffect(() => {
    if (!videoReady) return;
    // Once video is ready, ensure at least 3s of video playback
    const playTimer = setTimeout(() => {
      setReadyToFinish(true);
    }, 3000);
    return () => clearTimeout(playTimer);
  }, [videoReady]);

  useEffect(() => {
    if (readyToFinish) {
      Animated.timing(fadeOut, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }).start(() => {
        onFinish();
      });
    }
  }, [readyToFinish]);

  return (
    <Animated.View style={[styles.container, { opacity: fadeOut }]}>
      <StatusBar barStyle="light-content" backgroundColor="#FF6B35" />

      {/* Logo centered */}
      <Animated.View
        style={[
          styles.logoWrap,
          {
            opacity: logoOpacity,
            transform: [{ scale: logoScale }],
          },
        ]}
      >
        <Image
          source={require("../../assets/logo.png")}
          style={styles.logo}
          resizeMode="contain"
        />
        <Text style={styles.appName}>VolleyUp</Text>
      </Animated.View>

      {/* Bottom section: video + loading text */}
      <Animated.View style={[styles.bottomSection, { opacity: videoOpacity }]}>
        <View style={styles.videoWrap}>
          <Video
            source={require("../../assets/animation.mp4")}
            style={styles.video}
            resizeMode={ResizeMode.CONTAIN}
            shouldPlay
            isLooping
            isMuted
            onLoad={handleVideoLoad}
          />
        </View>

        <Animated.Text style={[styles.loadingText, { opacity: textPulse }]}>
          Loading{DOTS[dotIndex]}
        </Animated.Text>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FF6B35",
    justifyContent: "center",
    alignItems: "center",
  },
  logoWrap: {
    alignItems: "center",
    marginBottom: 40,
  },
  logo: {
    width: 140,
    height: 140,
  },
  appName: {
    fontSize: 36,
    fontWeight: "800",
    color: "#fff",
    marginTop: 16,
    letterSpacing: 1,
  },
  bottomSection: {
    position: "absolute",
    bottom: 40,
    alignItems: "center",
    width: "100%",
  },
  videoWrap: {
    width: width * 0.65,
    height: 140,
    borderRadius: 16,
    overflow: "hidden",
  },
  video: {
    width: "100%",
    height: "100%",
  },
  loadingText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
    marginTop: 16,
    letterSpacing: 2,
  },
});
