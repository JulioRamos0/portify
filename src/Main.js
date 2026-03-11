import CssBaseline from '@material-ui/core/CssBaseline';
import Typography from '@material-ui/core/Typography';
import { withStyles } from '@material-ui/core/styles';
import { Container } from '@material-ui/core';
import Button from '@material-ui/core/Button';
import Grid from '@material-ui/core/Grid';
import AppBar from './components/AppBar';
import React, { Component } from 'react';
import queryString from 'query-string';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import { config } from './config';
import { alertActions, userActions } from './actions'
import MigrationWizard from './components/MigrationWizard';

const styles = theme => ({
    appBarSpacer: {
        marginTop: theme.spacing(2),
    },
    options: {
        marginTop: theme.spacing(5),
    },
    leftIcon: {
        marginRight: theme.spacing(1),
    },
    rightIcon: {
        marginLeft: theme.spacing(1),
    },
});

class Main extends Component {

    constructor(props) {
        super(props);

        this.state = {
            userLoged: localStorage.getItem(config.loggedItem) ? true : false
        };
    }

    componentDidMount() {
        const hashValues = queryString.parse(this.props.location.hash);
        const searchValues = queryString.parse(this.props.location.search);

        if (searchValues.code) {
            const target = window.self !== window.top ? window.parent : window.opener;
            if (target && target !== window.self) {
                target.postMessage({ type: 'spotify_auth_code', code: searchValues.code }, "*");
                setTimeout(() => window.close(), 100);
            } else {
                const code_verifier = localStorage.getItem('code_verifier');
                if (code_verifier) {
                    fetch('https://accounts.spotify.com/api/token', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/x-www-form-urlencoded',
                        },
                        body: new URLSearchParams({
                            client_id: config.spotifyApi.client_id,
                            grant_type: 'authorization_code',
                            code: searchValues.code,
                            redirect_uri: config.spotifyApi.redirect_uri,
                            code_verifier: code_verifier,
                        })
                    }).then(response => response.json())
                        .then(data => {
                            if (data.access_token) {
                                localStorage.setItem(config.loggedItem, JSON.stringify(data));
                                this.setState({ userLoged: true });
                                window.history.replaceState({}, document.title, window.location.pathname);
                            }
                        }).catch(error => console.error('Error fetching token:', error));
                }
            }
        } else if (hashValues.access_token) {
            const target = window.self !== window.top ? window.parent : window.opener;
            if (target && target !== window.self) {
                target.postMessage({ type: 'spotify_auth_token', token: hashValues.access_token }, "*");
                setTimeout(() => window.close(), 100);
            } else {
                localStorage.setItem(config.loggedItem, JSON.stringify({
                    ...hashValues
                }));
                this.setState({ userLoged: true });
                window.history.replaceState({}, document.title, window.location.pathname);
            }
        } else if (searchValues.error) {
            const target = window.self !== window.top ? window.parent : window.opener;
            if (target && target !== window.self) {
                target.postMessage({ type: 'spotify_auth_error', error: searchValues.error }, "*");
                setTimeout(() => window.close(), 100);
            } else {
                console.warn("Spotify authentication denied/error:", searchValues.error);
                window.history.replaceState({}, document.title, window.location.pathname);
            }
        }
    }

    onExport = () => {
        this.props.dispatch(alertActions.info("Exporting data..."));
        this.props.dispatch(userActions.exportData());
    }

    onImport = () => {
        this.props.dispatch(alertActions.info("import!"));
    }

    onLogin = () => {
        this.props.dispatch(userActions.login());
    }

    render() {
        const { classes } = this.props;
        return (
            <React.Fragment>
                <CssBaseline />
                <div>
                    <AppBar />
                    <main className={classes.content}>
                        <div className={classes.appBarSpacer} />
                        <Container>
                            <Typography variant={"h3"} align={"center"} gutterBottom style={{ fontWeight: 'bold' }}>Bienvenido a Portify</Typography>
                            <Typography variant={"h6"} component={"p"} align={"center"} color={"textSecondary"} paragraph>
                                La forma más sencilla de transferir y respaldar tus listas de reproducción, canciones guardadas y artistas seguidos de Spotify.
                            </Typography>

                            {!this.state.userLoged && (
                                <Grid container justify="center" style={{ marginTop: 24 }}>
                                    <Button
                                        onClick={this.onLogin}
                                        variant="contained"
                                        color="primary"
                                        size="large"
                                    >
                                        Comenzar
                                    </Button>
                                </Grid>
                            )}
                            {this.state.userLoged &&
                                <Grid className={classes.options} container direction={"column"} alignItems={"center"}>
                                    <Grid item style={{ width: '100%' }}>
                                        <MigrationWizard />
                                    </Grid>
                                </Grid>
                            }
                        </Container>
                    </main>
                </div>
            </React.Fragment>
        )
    }
}

const mapStateToProps = (state) => {
    const { users } = state;
    return { users };
}

Main.propTypes = {
    classes: PropTypes.object.isRequired
};

export default withStyles(styles)(connect(mapStateToProps)(Main));
