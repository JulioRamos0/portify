const isDevelopment = !process.env.NODE_ENV || process.env.NODE_ENV === 'development';

export const config = {
    isDevelopment,
    loggedItem: "user",
    baseName: isDevelopment ? "/" : "/portify",
    spotifyApi: {
        url: "https://api.spotify.com/v1",
        scope: "user-read-private user-read-email playlist-read-private playlist-modify-public playlist-modify-private user-library-read user-library-modify playlist-read-collaborative",
        redirect_uri: isDevelopment ? "http://127.0.0.1:3000/callback" : "https://julioramos0.github.io/portify",
        client_id: "ffdc104217fa4b09b0f15a65152dfd1d"
    }
};
