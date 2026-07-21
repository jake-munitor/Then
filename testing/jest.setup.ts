import '@testing-library/jest-native/extend-expect';

jest.mock('react-native-safe-area-context', () => {
  const React = require('react');
  const { View } = require('react-native');
  const insets = { top: 0, bottom: 0, left: 0, right: 0 };

  return {
    SafeAreaView: ({ children, style }: any) => React.createElement(View, { style }, children),
    SafeAreaProvider: ({ children }: any) => children,
    SafeAreaInsetsContext: React.createContext(insets),
    SafeAreaFrameContext: React.createContext({ x: 0, y: 0, width: 0, height: 0 }),
    useSafeAreaInsets: () => insets,
    useSafeAreaFrame: () => ({ x: 0, y: 0, width: 0, height: 0 }),
  };
});

jest.mock('react-native-reanimated', () => require('react-native-reanimated/mock'));

jest.mock('react-native-gesture-handler', () => {
  const View = require('react-native/Libraries/Components/View/View');
  return {
    Swipeable: View,
    DrawerLayout: View,
    State: {},
    PanGestureHandler: View,
    TapGestureHandler: View,
    LongPressGestureHandler: View,
    ForceTouchGestureHandler: View,
    RotationGestureHandler: View,
    FlingGestureHandler: View,
    PinchGestureHandler: View,
    NativeViewGestureHandler: View,
    Directions: {},
  };
});

jest.mock('expo-font', () => ({
  isLoaded: jest.fn(() => true),
  loadAsync: jest.fn(async () => {}),
  useFonts: () => [true],
}));

jest.mock('expo-image-picker', () => ({
  requestMediaLibraryPermissionsAsync: jest.fn(async () => ({ status: 'granted' })),
  requestCameraPermissionsAsync: jest.fn(async () => ({ status: 'granted' })),
  launchImageLibraryAsync: jest.fn(async () => ({ canceled: true })),
  launchCameraAsync: jest.fn(async () => ({ canceled: true })),
  MediaTypeOptions: { Images: 'Images' },
}));

jest.mock('@sentry/react-native', () => ({
  init: jest.fn(),
  wrap: jest.fn((component) => component),
  captureException: jest.fn(),
  reactNavigationIntegration: jest.fn(() => ({
    name: 'ReactNavigation',
    registerNavigationContainer: jest.fn(),
  })),
}));

jest.mock('posthog-react-native', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({
    capture: jest.fn(),
    identify: jest.fn(),
    reset: jest.fn(),
    captureException: jest.fn(),
  })),
}));

jest.mock('expo-image-manipulator', () => {
  const makeImage = (width: number, height: number) => ({
    width,
    height,
    saveAsync: jest.fn(async () => ({ uri: 'file://processed.jpg', width, height })),
  });

  const makeContext = (width: number, height: number) => {
    const context: any = {
      resize: jest.fn(() => context),
      rotate: jest.fn(() => context),
      flip: jest.fn(() => context),
      crop: jest.fn(() => context),
      extent: jest.fn(() => context),
      reset: jest.fn(() => context),
      renderAsync: jest.fn(async () => makeImage(width, height)),
    };
    return context;
  };

  return {
    ImageManipulator: { manipulate: jest.fn(() => makeContext(1000, 1000)) },
    SaveFormat: { JPEG: 'jpeg', PNG: 'png', WEBP: 'webp' },
    FlipType: { Vertical: 'vertical', Horizontal: 'horizontal' },
  };
});

jest.mock('expo-notifications', () => ({
  addNotificationResponseReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
  cancelScheduledNotificationAsync: jest.fn(async () => {}),
  getAllScheduledNotificationsAsync: jest.fn(async () => []),
  getExpoPushTokenAsync: jest.fn(async () => ({ data: 'ExponentPushToken[test]' })),
  getLastNotificationResponseAsync: jest.fn(async () => null),
  getPermissionsAsync: jest.fn(async () => ({ status: 'granted' })),
  requestPermissionsAsync: jest.fn(async () => ({ status: 'granted' })),
  scheduleNotificationAsync: jest.fn(async () => 'scheduled-id'),
  setBadgeCountAsync: jest.fn(async () => {}),
  setNotificationHandler: jest.fn(),
  SchedulableTriggerInputTypes: { DATE: 'date' },
}));

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

jest.mock('firebase/app', () => ({
  getApp: jest.fn(() => ({})),
  getApps: jest.fn(() => []),
  initializeApp: jest.fn(() => ({})),
}));

jest.mock('firebase/auth', () => ({
  createUserWithEmailAndPassword: jest.fn(async () => ({
    user: { uid: 'user-1', email: 'jake@example.com', displayName: 'Jake' },
  })),
  deleteUser: jest.fn(async () => {}),
  EmailAuthProvider: { credential: jest.fn(() => ({})) },
  getAuth: jest.fn(() => ({ currentUser: { uid: 'user-1' } })),
  initializeAuth: jest.fn(() => ({ currentUser: { uid: 'user-1' } })),
  getReactNativePersistence: jest.fn(() => ({})),
  onAuthStateChanged: jest.fn((_auth, onChange) => {
    onChange(null);
    return () => {};
  }),
  reauthenticateWithCredential: jest.fn(async () => {}),
  sendPasswordResetEmail: jest.fn(async () => {}),
  signInWithEmailAndPassword: jest.fn(async () => {}),
  signOut: jest.fn(async () => {}),
  updateProfile: jest.fn(async () => {}),
}));

jest.mock('firebase/storage', () => ({
  deleteObject: jest.fn(async () => {}),
  getDownloadURL: jest.fn(async () => 'https://example.com/photo.jpg'),
  getStorage: jest.fn(() => ({})),
  listAll: jest.fn(async () => ({ items: [] })),
  ref: jest.fn(() => ({})),
  uploadBytes: jest.fn(async () => ({})),
}));

jest.mock('firebase/firestore', () => ({
  collection: jest.fn(() => ({})),
  doc: jest.fn(() => ({})),
  query: jest.fn(() => ({})),
  where: jest.fn(() => ({})),
  orderBy: jest.fn(() => ({})),
  limit: jest.fn(() => ({})),
  startAfter: jest.fn(() => ({})),
  increment: jest.fn((n: number) => n),
  serverTimestamp: jest.fn(() => ({ __type: 'serverTimestamp' })),
  writeBatch: jest.fn(() => ({
    delete: jest.fn(),
    set: jest.fn(),
    update: jest.fn(),
    commit: jest.fn(async () => {}),
  })),
  onSnapshot: jest.fn((_ref: any, onNext: any) => {
    if (typeof onNext === 'function') {
      onNext({ docs: [], exists: () => false, data: () => ({}) });
    }
    return () => {};
  }),
  getDoc: jest.fn(async () => ({ exists: () => false, data: () => ({}) })),
  getDocs: jest.fn(async () => ({ docs: [] })),
  setDoc: jest.fn(async () => {}),
  updateDoc: jest.fn(async () => {}),
  addDoc: jest.fn(async () => ({ id: 'test' })),
  deleteDoc: jest.fn(async () => {}),
}));

jest.mock('firebase/functions', () => ({
  getFunctions: jest.fn(() => ({})),
  httpsCallable: jest.fn(() => jest.fn(async () => ({ data: { ok: true } }))),
}));
