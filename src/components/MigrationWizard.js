import React, { useState } from 'react';
import { makeStyles } from '@material-ui/core/styles';
import Stepper from '@material-ui/core/Stepper';
import Step from '@material-ui/core/Step';
import StepLabel from '@material-ui/core/StepLabel';
import StepContent from '@material-ui/core/StepContent';
import Button from '@material-ui/core/Button';
import Typography from '@material-ui/core/Typography';
import CircularProgress from '@material-ui/core/CircularProgress';
import List from '@material-ui/core/List';
import ListItem from '@material-ui/core/ListItem';
import ListItemText from '@material-ui/core/ListItemText';
import { connect } from 'react-redux';
import { userActions } from '../actions';
import { appService } from '../services';
import { config } from '../config';
import Paper from '@material-ui/core/Paper';

const useStyles = makeStyles((theme) => ({
    root: {
        width: '100%',
        marginTop: theme.spacing(4),
    },
    button: {
        marginTop: theme.spacing(1),
        marginRight: theme.spacing(1),
    },
    actionsContainer: {
        marginBottom: theme.spacing(2),
    },
    resetContainer: {
        padding: theme.spacing(3),
    },
    stepContent: {
        padding: theme.spacing(2, 0),
    }
}));

function getSteps() {
    return [
        'Conectar cuenta origen',
        'Obtener datos a migrar',
        'Conectar cuenta destino',
        'Iniciar migración',
        '¡Felicidades!'
    ];
}

function MigrationWizard(props) {
    const classes = useStyles();
    const [activeStep, setActiveStep] = useState(0);
    const [isMigrating, setIsMigrating] = useState(false);
    const [migrationProgress, setMigrationProgress] = useState("");
    const steps = getSteps();

    const executeMigration = async () => {
        setIsMigrating(true);
        try {
            await appService.importData(props.user.migrationData, (progressMsg) => {
                setMigrationProgress(progressMsg);
            });
            setIsMigrating(false);
            setActiveStep(4); // force move to step 5 (index 4)
        } catch (error) {
            console.error("Migration failed", error);
            setMigrationProgress("Hubo un error en la migración.");
            setIsMigrating(false);
        }
    };

    const handleNext = () => {
        if (activeStep === 2) {
            // we are moving to step 4 (index 3) which is "Iniciar migración"
            setActiveStep((prevActiveStep) => prevActiveStep + 1);
        } else {
            setActiveStep((prevActiveStep) => prevActiveStep + 1);
        }
    };

    const handlePreviewData = () => {
        props.dispatch(userActions.previewData());
    };

    const handleBack = () => {
        setActiveStep((prevActiveStep) => prevActiveStep - 1);
    };

    const handleReset = () => {
        setActiveStep(0);
    };

    const handleConnectDestination = () => {
        // Save current source token safely before fetching new one
        const currentToken = localStorage.getItem(config.loggedItem);
        if (currentToken) {
            localStorage.setItem('source_user', currentToken);
        }
        localStorage.removeItem(config.loggedItem);
        // Open authorization popup
        const width = 500, height = 780;
        const left = (window.innerWidth / 2) - (width / 2);
        const top = (window.innerHeight / 2) - (height / 2);

        const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let codeVerifier = '';
        for (let i = 0; i < 128; i++) {
            codeVerifier += possible.charAt(Math.floor(Math.random() * possible.length));
        }

        const data = new TextEncoder().encode(codeVerifier);
        window.crypto.subtle.digest('SHA-256', data).then(digest => {
            const codeChallenge = btoa(String.fromCharCode.apply(null, [...new Uint8Array(digest)]))
                .replace(/\+/g, '-')
                .replace(/\//g, '_')
                .replace(/=+$/, '');

            localStorage.setItem('code_verifier', codeVerifier);
            const set = {
                client_id: config.spotifyApi.client_id,
                redirect_uri: config.spotifyApi.redirect_uri,
                scope: config.spotifyApi.scope,
                response_type: 'code',
                show_dialog: 'true',
                code_challenge_method: 'S256',
                code_challenge: codeChallenge
            };

            const authWindow = window.open(
                "https://accounts.spotify.com/authorize?" + new URLSearchParams(set).toString(),
                "Spotify",
                'menubar=no,location=no,resizable=no,scrollbars=no,status=no, width=' + width + ', height=' + height + ', top=' + top + ', left=' + left
            );

            const messageListener = (event) => {
                if (event.data && event.data.type === 'spotify_auth_code') {
                    const code = event.data.code;
                    fetch('https://accounts.spotify.com/api/token', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/x-www-form-urlencoded',
                        },
                        body: new URLSearchParams({
                            client_id: config.spotifyApi.client_id,
                            grant_type: 'authorization_code',
                            code: code,
                            redirect_uri: config.spotifyApi.redirect_uri,
                            code_verifier: codeVerifier,
                        })
                    }).then(response => response.json())
                        .then(data => {
                            if (data.access_token) {
                                localStorage.setItem(config.loggedItem, JSON.stringify(data));
                                window.removeEventListener("message", messageListener);
                                if (authWindow && !authWindow.closed) authWindow.close();
                                setActiveStep(3);
                            }
                        }).catch(error => console.error('Error fetching token:', error));
                } else if (event.data && event.data.type === 'spotify_auth_error') {
                    window.removeEventListener("message", messageListener);
                    if (authWindow && !authWindow.closed) authWindow.close();
                    // Put back the original source token so it's not lost
                    const sourceUser = localStorage.getItem('source_user');
                    if (sourceUser) {
                        localStorage.setItem(config.loggedItem, sourceUser);
                        localStorage.removeItem('source_user');
                    }
                }
            };
            window.addEventListener("message", messageListener);

            // Listen for popup closure via storage change or messages
            const checkLogin = setInterval(() => {
                if (localStorage.getItem(config.loggedItem)) {
                    clearInterval(checkLogin);
                    window.removeEventListener("message", messageListener);
                    // Force re-render or state update
                    setActiveStep(3);
                } else if (authWindow && authWindow.closed) {
                    clearInterval(checkLogin);
                    window.removeEventListener("message", messageListener);
                    // Put back the original source token if abandoned
                    if (!localStorage.getItem(config.loggedItem)) {
                        const sourceUser = localStorage.getItem('source_user');
                        if (sourceUser) {
                            localStorage.setItem(config.loggedItem, sourceUser);
                            localStorage.removeItem('source_user');
                        }
                    }
                }
            }, 1000);
        });
    };

    const renderStepContent = (step) => {
        switch (step) {
            case 0:
                return (
                    <div className={classes.stepContent}>
                        <Typography variant="body1">
                            Actualmente estás conectado como: <b>{props.user?.display_name || 'Desconocido'}</b>
                        </Typography>
                        <Typography variant="body2" color="textSecondary">
                            Esta cuenta se utilizará como origen para extraer tus listas de reproducción.
                        </Typography>
                    </div>
                );
            case 1:
                return (
                    <div className={classes.stepContent}>
                        <Typography variant="body1">
                            Presiona "Obtener" para extraer los datos de Spotify. Se mostrará un resumen de lo que se migrará.
                        </Typography>

                        {(props.user.loadingPreview && !props.user.migrationData) && (
                            <div style={{ marginTop: 16 }}>
                                <CircularProgress color="secondary" size={24} />
                                <Typography variant="body2" style={{ marginLeft: 8, display: 'inline-block' }}>Obteniendo datos de Spotify...</Typography>
                            </div>
                        )}

                        {(!props.user.loadingPreview && !props.user.migrationData) && (
                            <Button
                                variant="contained"
                                color="secondary"
                                className={classes.button}
                                onClick={handlePreviewData}
                            >
                                Obtener Datos
                            </Button>
                        )}

                        {props.user.migrationData && (
                            <div style={{ marginTop: 16 }}>
                                <Typography variant="h6">Resumen de contenido a migrar:</Typography>
                                <List dense>
                                    <ListItem>
                                        <ListItemText primary="Listas propias" secondary={`${props.user.migrationData.playlists.length} listas`} />
                                    </ListItem>
                                    <ListItem>
                                        <ListItemText primary="Listas seguidas" secondary={`${props.user.migrationData.follow_playlists.length} listas`} />
                                    </ListItem>
                                    <ListItem>
                                        <ListItemText primary="Canciones guardadas (Tracks)" secondary={`${props.user.migrationData.tracks.length} canciones`} />
                                    </ListItem>
                                </List>
                            </div>
                        )}
                    </div>
                );
            case 2:
                // Check if we already have the destination connected 
                const isDestinationConnected = localStorage.getItem('source_user') !== null && localStorage.getItem(config.loggedItem) !== null;
                return (
                    <div className={classes.stepContent}>
                        <Typography variant="body1">
                            Conecta la cuenta de Spotify a la que deseas transferir tus listas.
                        </Typography>
                        {isDestinationConnected ? (
                            <div>
                                <Typography variant="body2" style={{ color: 'green', marginTop: 8 }}>
                                    ✓ Cuenta destino conectada exitosamente.
                                </Typography>
                                <Button
                                    variant="outlined"
                                    color="default"
                                    size="small"
                                    style={{ marginTop: 8 }}
                                    onClick={() => {
                                        localStorage.removeItem(config.loggedItem);
                                        handleConnectDestination();
                                    }}
                                >
                                    Cambiar cuenta
                                </Button>
                            </div>
                        ) : (
                            <Button
                                variant="outlined"
                                color="primary"
                                className={classes.button}
                                onClick={handleConnectDestination}
                            >
                                Conectar nueva cuenta
                            </Button>
                        )}
                    </div>
                );
            case 3:
                return (
                    <div className={classes.stepContent}>
                        <Typography variant="body1">
                            Todo está listo para iniciar la migración de tus listas de reproducción.
                            Esto puede tardar varios minutos dependiendo de la cantidad de música que tengas.
                        </Typography>

                        {isMigrating && (
                            <div style={{ marginTop: 16 }}>
                                <CircularProgress color="primary" size={24} />
                                <Typography variant="body2" style={{ marginLeft: 8, display: 'inline-block' }}>
                                    {migrationProgress || "Procesando..."}
                                </Typography>
                            </div>
                        )}

                        {!isMigrating && activeStep === 3 && (
                            <Button
                                variant="contained"
                                color="secondary"
                                className={classes.button}
                                onClick={executeMigration}
                            >
                                Comenzar a migrar
                            </Button>
                        )}
                    </div>
                );
            case 4:
                return (
                    <div className={classes.stepContent}>
                        <Typography variant="h6" gutterBottom style={{ color: 'green' }}>
                            ¡Migración completada con éxito!
                        </Typography>
                        <Typography variant="body1" paragraph>
                            Tus listas de reproducción han sido transferidas a la cuenta de destino exitosamente.
                        </Typography>
                        <Button variant="outlined" className={classes.button} href="https://twitter.com/intent/tweet?text=¡Acabo de migrar mis listas de Spotify usando Portify!" target="_blank">
                            Compartir en Twitter
                        </Button>
                        <Button variant="outlined" className={classes.button} href="https://www.facebook.com/sharer/sharer.php?u=https://julioramos0.github.io/portify" target="_blank">
                            Compartir en Facebook
                        </Button>
                    </div>
                );
            default:
                return 'Paso desconocido';
        }
    };

    return (
        <div className={classes.root}>
            <Stepper activeStep={activeStep} orientation="vertical">
                {steps.map((label, index) => (
                    <Step key={label}>
                        <StepLabel>{label}</StepLabel>
                        <StepContent>
                            {renderStepContent(index)}

                            {index < steps.length - 1 && (
                                <div className={classes.actionsContainer}>
                                    <div>
                                        <Button
                                            disabled={activeStep === 0}
                                            onClick={handleBack}
                                            className={classes.button}
                                        >
                                            Atrás
                                        </Button>
                                        {activeStep !== 3 && activeStep !== 4 && (
                                            <Button
                                                variant="contained"
                                                color="primary"
                                                onClick={handleNext}
                                                className={classes.button}
                                                disabled={
                                                    (index === 1 && !props.user.migrationData) ||
                                                    (index === 2 && (!localStorage.getItem('source_user') || !localStorage.getItem(config.loggedItem))) ||
                                                    isMigrating
                                                }
                                            >
                                                Siguiente
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            )}
                        </StepContent>
                    </Step>
                ))}
            </Stepper>
            {activeStep === steps.length && (
                <Paper square elevation={0} className={classes.resetContainer}>
                    <Typography>Todos los pasos completados - has finalizado.</Typography>
                    <Button onClick={handleReset} className={classes.button}>
                        Reiniciar Migración
                    </Button>
                </Paper>
            )}
        </div>
    );
}

const mapStateToProps = (state) => {
    return {
        user: state.user
    };
};

export default connect(mapStateToProps)(MigrationWizard);
