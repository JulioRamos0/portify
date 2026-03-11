import { userConstants } from '../constants';
import { spotifyService, appService } from '../services';
import { alertActions } from './alert.actions';
import { config } from '../config';

const getMe = () => {
    return dispatch => {
        dispatch(request());
        spotifyService.getMe().then(data => {
            dispatch(success(data));
        }, error => {
            dispatch(failure(error.toString()));
            dispatch(alertActions.error(error.toString()));
        });
    };

    function request() { return { type: userConstants.GET_PROFILE_REQUEST } }
    function success(data) { return { type: userConstants.GET_PROFILE_SUCCESS, data } }
    function failure(error) { return { type: userConstants.GET_PROFILE_FAILURE, error } }
}

const exportData = () => {
    return dispatch => {
        dispatch(request());
        appService.exportData().then(data => {
            dispatch(success(data));
            appService.downloadJson(`${data.user_id}_v${data.version}.json`, JSON.stringify(data, null, 4));
        }, error => {
            console.error('Error during exportData (download):', error);
            dispatch(failure(error));
        });
    };

    function request() { return { type: userConstants.EXPORT_REQUEST } }
    function success(data) { return { type: userConstants.EXPORT_SUCCESS, data } }
    function failure(error) { return { type: userConstants.EXPORT_FAILURE, error } }
};

const previewData = () => {
    return dispatch => {
        dispatch({ type: userConstants.PREVIEW_REQUEST });
        appService.exportData().then(data => {
            dispatch({ type: userConstants.PREVIEW_SUCCESS, data });
        }, error => {
            console.error('Error in previewData fetch:', error);
            dispatch({ type: userConstants.PREVIEW_FAILURE, error });
            dispatch(alertActions.error("Error obteniendo los datos"));
        });
    }
}

const login = () => {
    return async dispatch => {
        const width = 500, height = 780;
        const left = (window.innerWidth / 2) - (width / 2);
        const top = (window.innerHeight / 2) - (height / 2);

        const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let codeVerifier = '';
        for (let i = 0; i < 128; i++) {
            codeVerifier += possible.charAt(Math.floor(Math.random() * possible.length));
        }

        const data = new TextEncoder().encode(codeVerifier);
        const digest = await window.crypto.subtle.digest('SHA-256', data);
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

        // Listener for the auth code sent by the popup
        const messageListener = (event) => {
            if (event.data && event.data.type === 'spotify_auth_code') {
                const code = event.data.code;
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
                            code: code,
                            redirect_uri: config.spotifyApi.redirect_uri,
                            code_verifier: code_verifier,
                        })
                    }).then(response => response.json())
                        .then(data => {
                            if (data.access_token) {
                                localStorage.setItem(config.loggedItem, JSON.stringify(data));
                                if (authWindow) authWindow.close();
                                window.removeEventListener("message", messageListener);
                                window.location.reload();
                            }
                        }).catch(error => console.error('Error fetching token:', error));
                }
            }
        };

        window.addEventListener("message", messageListener);

        // To monitor successful local storage updates as a fallback
        const checkLogin = setInterval(() => {
            if (localStorage.getItem(config.loggedItem)) {
                clearInterval(checkLogin);
                if (authWindow) authWindow.close();
                window.location.reload();
            }
        }, 1000);
    }
}


export const userActions = {
    getMe,
    exportData,
    previewData,
    login
};