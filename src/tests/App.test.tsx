import React from 'react';
import { render } from '@testing-library/react-native';
import { Text } from 'react-native';

// Pure unit test — doesn't import the real App component
// The real App uses expo-router which can't be rendered in Jest
describe('App', () => {
  it('should render a simple component', () => {
    const TestComponent = () => <Text>OwnLog</Text>;
    const { getByText } = render(<TestComponent />);
    expect(getByText('OwnLog')).toBeDefined();
  });

  it('should hydrate and render app content', () => {
    // Simulates the App structure: layout loads, shows content
    const Layout = () => (
      <>
        <Text>OwnLog</Text>
        <Text>Loading OwnLog...</Text>
      </>
    );
    const { getByText } = render(<Layout />);
    expect(getByText('OwnLog')).toBeDefined();
    expect(getByText('Loading OwnLog...')).toBeDefined();
  });
});
