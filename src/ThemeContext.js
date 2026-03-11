import React from 'react';

export const ThemeContext = React.createContext({
    themeMode: 'system',
    setThemeMode: () => { }
});
