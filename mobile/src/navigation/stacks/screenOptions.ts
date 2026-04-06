import { NativeStackNavigationOptions } from '@react-navigation/native-stack';
import { colors, fontSize } from '../../theme';

export const defaultScreenOptions: NativeStackNavigationOptions = {
  headerStyle: { backgroundColor: colors.surface },
  headerTintColor: colors.text,
  headerTitleStyle: { fontSize: fontSize.md, fontWeight: '600' },
  headerShadowVisible: false,
  headerBackTitleVisible: false,
  contentStyle: { backgroundColor: colors.background },
};
