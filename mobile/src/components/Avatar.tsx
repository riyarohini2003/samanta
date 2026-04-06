import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { colors, fontSize, radius } from '../theme';
import { getInitials } from '../utils/formatters';

interface Props {
  name: string;
  photoUrl?: string;
  size?: number;
  color?: string;
}

export default function Avatar({ name, photoUrl, size = 40, color = colors.primary }: Props) {
  if (photoUrl) {
    return (
      <Image
        source={{ uri: photoUrl }}
        style={[styles.image, { width: size, height: size, borderRadius: size / 2 }]}
      />
    );
  }

  return (
    <View
      style={[
        styles.container,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color + '18',
        },
      ]}
    >
      <Text
        style={[
          styles.text,
          {
            color,
            fontSize: size * 0.38,
          },
        ]}
      >
        {getInitials(name)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: {
    backgroundColor: colors.borderLight,
  },
  text: {
    fontWeight: '700',
  },
});
