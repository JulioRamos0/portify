import MuiThemeProvider from '@material-ui/core/styles/MuiThemeProvider';
import MessageSnackbar from './components/MessageSnackbar';
import { Router, Route, Switch } from 'react-router-dom';
import { createMuiTheme } from '@material-ui/core';
import Snackbar from '@material-ui/core/Snackbar';
import { alertActions } from './actions';
import { connect } from 'react-redux';
import { history } from './helpers';
import React from 'react';
import Main from './Main';
import useMediaQuery from '@material-ui/core/useMediaQuery';
import { ThemeContext } from './ThemeContext';

function ThemeWrapper({ children }) {
  const [themeMode, setThemeMode] = React.useState(localStorage.getItem('themeMode') || 'system');
  const prefersDarkMode = useMediaQuery('(prefers-color-scheme: dark)');

  React.useEffect(() => {
    localStorage.setItem('themeMode', themeMode);
  }, [themeMode]);

  const theme = React.useMemo(
    () => {
      const isDark = themeMode === 'system' ? prefersDarkMode : themeMode === 'dark';
      return createMuiTheme({
        palette: {
          type: isDark ? 'dark' : 'light',
          primary: {
            main: "#000",
            contrastText: "#fff"
          },
          secondary: {
            main: "#2ebd59",
            contrastText: "#fff"
          }
        },
        typography: {
          useNextVariants: true,
        },
        root: {
          display: 'flex',
        },
      });
    },
    [themeMode, prefersDarkMode]
  );

  return (
    <ThemeContext.Provider value={{ themeMode, setThemeMode }}>
      <MuiThemeProvider theme={theme}>
        {children}
      </MuiThemeProvider>
    </ThemeContext.Provider>
  );
}

class App extends React.Component {

  handleClose = (reason) => {
    if (reason === 'clickaway') {
      return;
    }
    this.props.dispatch(alertActions.clear());
  };

  render() {
    const { alert } = this.props;
    return (
      <Router history={history}>
        <ThemeWrapper>
          {alert.message &&
            <Snackbar
              anchorOrigin={{
                vertical: 'bottom',
                horizontal: 'left',
              }}
              open
              onClose={alert.onClose || this.handleClose}
              autoHideDuration={2000}
            >
              <MessageSnackbar
                onClose={alert.onClose || this.handleClose}
                variant={alert.type}
                message={alert.message}
                onUndo={alert.onUndo}
              />
            </Snackbar>
          }
          <Route path={"/"}>
            <Switch>
              <Route path={"/"} component={Main} />
            </Switch>
          </Route>
        </ThemeWrapper>
      </Router>
    );
  }
};

function mapStateToProps(state) {
  const { alert } = state;
  return {
    alert
  };
}

const connectedApp = connect(mapStateToProps)(App);

export { connectedApp as App };
