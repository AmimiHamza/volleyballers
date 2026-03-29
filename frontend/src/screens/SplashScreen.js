import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Image,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
  StatusBar,
  Platform,
} from "react-native";

// Only import expo-av on native (it breaks on web)
let Video, ResizeMode;
if (Platform.OS !== "web") {
  const av = require("expo-av");
  Video = av.Video;
  ResizeMode = av.ResizeMode;
}

const { width } = Dimensions.get("window");
const DOTS = [".", "..", "..."];

// Web video component using HTML5 video tag
function WebVideo({ onLoad }) {
  const videoSource = require("../../assets/animation.mp4");
  return (
    <video
      src={videoSource}
      autoPlay
      loop
      muted
      playsInline
      onLoadedData={onLoad}
      style={{
        width: "100%",
        height: "100%",
        objectFit: "contain",
        borderRadius: 16,
      }}
    />
  );
}

// Native video component using expo-av
function NativeVideo({ onLoad }) {
  if (!Video) return null;
  return (
    <Video
      source={require("../../assets/animation.mp4")}
      style={{ width: "100%", height: "100%" }}
      resizeMode={ResizeMode.CONTAIN}
      shouldPlay
      isLooping
      isMuted
      onLoad={onLoad}
    />
  );
}

export default function SplashScreen({ onFinish }) {
  const logoScale = useRef(new Animated.Value(0)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const videoOpacity = useRef(new Animated.Value(0)).current;
  const textPulse = useRef(new Animated.Value(1)).current;
  const fadeOut = useRef(new Animated.Value(1)).current;
  const [dotIndex, setDotIndex] = useState(0);
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

    // Fade in video area after 400ms
    setTimeout(() => {
      Animated.timing(videoOpacity, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }).start();
    }, 400);

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

    return () => {
      pulse.stop();
      clearInterval(dotInterval);
    };
  }, []);

  // Once video is loaded, play for 3 seconds then finish
  useEffect(() => {
    if (!videoReady) return;
    const timer = setTimeout(() => {
      setReadyToFinish(true);
    }, 3000);
    return () => clearTimeout(timer);
  }, [videoReady]);

  // Fade out and finish
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

  const handleVideoLoad = () => {
    setVideoReady(true);
  };

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
        <Text style={styles.appName}>VolleyConnect</Text>
      </Animated.View>

      {/* Bottom section: video + loading text */}
      <Animated.View style={[styles.bottomSection, { opacity: videoOpacity }]}>
        <View style={styles.videoWrap}>
          {Platform.OS === "web" ? (
            <WebVideo onLoad={handleVideoLoad} />
          ) : (
            <NativeVideo onLoad={handleVideoLoad} />
          )}
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
    backgroundColor: "rgb(212, 206, 194)",
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
    color: "#FF6B35",
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
  loadingText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FF6B35",
    marginTop: 16,
    letterSpacing: 2,
  },
});
