/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import { Platform } from 'react-native';

const tintColorLight = '#165290';
const tintColorDark = '#ea7c37';

export const Colors = {
  light: {
    text: '#165290',
    background: '#ffffff',
    tint: tintColorLight,
    icon: '#165290',
    tabIconDefault: '#165290',
    tabIconSelected: tintColorLight,
    primary: '#165290',
    secondary: '#ea7c37',
    white: '#ffffff',
  },
  dark: {
    text: '#ffffff',
    background: '#165290',
    tint: tintColorDark,
    icon: '#ea7c37',
    tabIconDefault: '#ea7c37',
    tabIconSelected: tintColorDark,
    primary: '#ea7c37',
    secondary: '#165290',
    white: '#ffffff',
  },
};

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
