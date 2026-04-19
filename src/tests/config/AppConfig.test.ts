import fs from 'fs';
import path from 'path';

describe('App Configuration', () => {
  const appJsonPath = path.resolve(__dirname, '../../../app.json');

  it('should have app.json file', () => {
    expect(fs.existsSync(appJsonPath)).toBe(true);
  });

  it('should contain expo configuration with scheme', () => {
    const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));
    expect(appJson.expo).toBeDefined();
    expect(appJson.expo.scheme).toBe('com.huntherwallet.app');
  });

  it('should have Android Google Sign-In configuration', () => {
    const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));
    expect(appJson.expo.android).toBeDefined();
    expect(appJson.expo.android.config.googleSignIn.androidClientId).toBeDefined();
    // Should be a placeholder or actual ID
    expect(typeof appJson.expo.android.config.googleSignIn.androidClientId).toBe('string');
  });

  it('should have iOS Google Sign-In configuration', () => {
    const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));
    expect(appJson.expo.ios).toBeDefined();
    expect(appJson.expo.ios.config.googleSignIn.iosClientId).toBeDefined();
    expect(typeof appJson.expo.ios.config.googleSignIn.iosClientId).toBe('string');
  });
});