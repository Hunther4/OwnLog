/**
 * NativeWind Type Declarations
 * Adds className prop to React Native components for Tailwind CSS support
 */

import type {
  ViewProps,
  TextProps,
  TextInputProps,
  TouchableOpacityProps,
  ScrollViewProps,
  KeyboardAvoidingViewProps,
  FlatListProps,
} from 'react-native';

declare module 'react-native' {
  interface ViewProps {
    className?: string;
  }
  interface TextProps {
    className?: string;
  }
  interface TextInputProps {
    className?: string;
  }
  interface TouchableOpacityProps {
    className?: string;
  }
  interface ScrollViewProps {
    className?: string;
  }
  interface KeyboardAvoidingViewProps {
    className?: string;
  }
}
