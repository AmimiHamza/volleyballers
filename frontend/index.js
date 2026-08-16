import { registerRootComponent } from 'expo';

// Installed before anything else so it catches errors during early module init.
import { installGlobalErrorHandler } from './src/components/ErrorBoundary';
installGlobalErrorHandler();

import App from './App';

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
