import Typography from '@material-ui/core/Typography';
import { withStyles } from '@material-ui/core/styles';
import Container from '@material-ui/core/Container';
import MuiAppBar from '@material-ui/core/AppBar';
import Toolbar from '@material-ui/core/Toolbar';
import Button from '@material-ui/core/Button';
import { userActions } from '../actions';
import { connect } from 'react-redux';
import { config } from '../config';
import PropTypes from 'prop-types';
import React from 'react';
import IconButton from '@material-ui/core/IconButton';
import Brightness4Icon from '@material-ui/icons/Brightness4';
import { ThemeContext } from '../ThemeContext';

const styles = theme => ({
  root: {
    flexGrow: 1,
  },
  menuButton: {
    marginRight: theme.spacing(2),
  },
  title: {
    flexGrow: 1,
  },
  toolbarTitle: {
    //flex: 1,
    marginRight: 10
  },
});

class AppBar extends React.Component {
  state = {
    userLoged: localStorage.getItem(config.loggedItem) ? true : false
  }

  componentDidMount() {
    if (this.state.userLoged) {
      this.props.dispatch(userActions.getMe());
    }
  }

  render() {
    const { classes } = this.props;
    return (
      <div className={classes.root}>
        <MuiAppBar position={"static"}>
          <Container>
            <Toolbar>
              <Typography variant={"h6"} className={classes.title}>
                Portify
              </Typography>
              {this.state.userLoged &&
                <Typography component={"p"}
                  color={"inherit"}
                  align={"center"}
                  noWrap
                  className={classes.toolbarTitle}
                >
                  {this.props.user.display_name}
                </Typography>
              }
              {this.state.userLoged ?
                <Button color={"inherit"} onClick={() => { localStorage.removeItem(config.loggedItem); window.location.reload(); }} size={"small"}>Logout</Button> :
                <Button color={"inherit"} onClick={() => this.props.dispatch(userActions.login())} size={"small"}>Login</Button>
              }
              <ThemeContext.Consumer>
                {({ themeMode, setThemeMode }) => (
                  <IconButton
                    color="inherit"
                    onClick={() => setThemeMode(themeMode === 'light' ? 'dark' : 'light')}
                    style={{ marginLeft: 16 }}
                  >
                    <Brightness4Icon />
                  </IconButton>
                )}
              </ThemeContext.Consumer>
            </Toolbar>
          </Container>
        </MuiAppBar>
      </div>
    );
  }
}

const mapStateToProps = (state) => {
  const { user } = state;
  return {
    user
  };
}


AppBar.propTypes = {
  classes: PropTypes.object.isRequired,
};

export default withStyles(styles)(connect(mapStateToProps)(AppBar));
