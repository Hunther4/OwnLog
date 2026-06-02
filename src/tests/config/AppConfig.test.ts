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
    expect(appJson.expo.scheme).toBe('com.drack.ownlog');
  });

  it('should have Android package configuration', () => {
    const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));
    expect(appJson.expo.android).toBeDefined();
    expect(appJson.expo.android.package).toBe('com.drack.ownlog');
  });

  it('should have iOS bundle identifier configuration', () => {
    const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));
    expect(appJson.expo.ios).toBeDefined();
    expect(appJson.expo.ios.bundleIdentifier).toBe('com.drack.ownlog');
  });
});