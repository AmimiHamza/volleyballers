import React, { useRef } from "react";
import { Animated, Pressable } from "react-native";

export default function PressableScale({
  children,
  onPress,
  onLongPress,
  scaleTo = 0.96,
  style,
  disabled,
  android_ripple,
  ...rest
}) {
  const scale = useRef(new Animated.Value(1)).current;

  const animateTo = (v) => {
    Animated.spring(scale, {
      toValue: v,
      useNativeDriver: true,
      friction: 7,
      tension: 100,
    }).start();
  };

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      onPressIn={() => animateTo(scaleTo)}
      onPressOut={() => animateTo(1)}
      disabled={disabled}
      android_ripple={android_ripple}
      {...rest}
    >
      <Animated.View style={[{ transform: [{ scale }] }, style]}>{children}</Animated.View>
    </Pressable>
  );
}
