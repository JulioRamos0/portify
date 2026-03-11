import { spotifyService } from '../services';

/**
 * 
 * @param {*} options 
 */
const _getAllPlaylists = async (options = {}) => {
    let { playlists, offset, limit } = options;
    playlists = playlists || { items: [] };
    await spotifyService.getPlaylists({ offset, limit }).then(async data => {
        playlists = {
            total: data.total,
            items: [...playlists.items, ...data.items]
        };
        const currentOffset = parseInt(data.offset) || 0;
        const currentLimit = parseInt(data.limit) || 50;

        if (data.next !== null && data.next !== undefined && (currentOffset + currentLimit < data.total)) {
            const aux = await _getAllPlaylists({
                playlists,
                offset: currentOffset + currentLimit,
                limit: currentLimit
            });
            playlists = {
                items: [...playlists.items, ...aux.items]
            }
        }
    }, error => {
        console.error("Error in _getAllPlaylists:", error);
        throw (error);
    });
    return playlists;
}

/**
 * 
 * @param {*} options 
 */
const _getAllPlaylistTracks = async (options = {}) => {
    let { tracks, playlist_id, offset, limit } = options;
    tracks = tracks || { items: [] };
    await spotifyService.getPlaylistTracks(playlist_id, { offset, limit }).then(async data => {
        const filterTracks = (data.items || []).filter(item => {
            return !item.is_local && item.track && item.track.id;
        });
        const playlistTracks = filterTracks.map(item => {
            const { id, name, uri } = item.track;
            return {
                id,
                name,
                uri
            };
        });

        tracks = {
            items: [...tracks.items, ...playlistTracks]
        };

        const currentOffset = parseInt(data.offset) || 0;
        const currentLimit = parseInt(data.limit) || 50;

        if (data.next !== null && data.next !== undefined && (currentOffset + currentLimit < data.total)) {
            const aux = await _getAllPlaylistTracks({
                tracks,
                playlist_id,
                offset: currentOffset + currentLimit,
                limit: currentLimit
            });

            tracks = {
                items: [...tracks.items, ...aux.items]
            };
        }
    }, error => {
        throw (error);
    });
    return tracks;
};

/**
 * 
 */
const _getAllTracks = async (options = {}) => {
    let { tracks, offset, limit } = options;
    tracks = tracks || { items: [] };
    await spotifyService.getTracks({ offset, limit }).then(async data => {
        const filterTracks = (data.items || []).filter(item => {
            return !item.is_local && item.track && item.track.id;
        });

        const userTracks = filterTracks.map(item => {
            const { id, name, uri } = item.track;
            return {
                id,
                name,
                uri
            };
        });

        tracks = {
            items: [...tracks.items, ...userTracks]
        };

        const currentOffset = parseInt(data.offset) || 0;
        const currentLimit = parseInt(data.limit) || 50;

        if (data.next !== null && data.next !== undefined && (currentOffset + currentLimit < data.total)) {
            const aux = await _getAllTracks({
                tracks,
                offset: currentOffset + currentLimit,
                limit: currentLimit
            });
            tracks = {
                items: [...tracks.items, ...aux.items]
            };
        }
    }, error => {
        throw (error);
    });
    return tracks;
};

const exportData = async () => {
    return new Promise(async (resolve, reject) => {
        let exportObject = {
            version: 1,
            user_id: "",
            display_name: "",
            follow_playlists: [],
            playlists: [],
            tracks: [],
        };

        await _getAllTracks().then(tracks => {
            exportObject.tracks = tracks.items;
        }).catch(error => {
            console.error("exportData -> _getAllTracks error:", error);
            reject(error);
        });

        await spotifyService.getMe().then(data => {
            exportObject.user_id = data.id;
            exportObject.display_name = data.display_name;
        }).catch(error => {
            console.error("exportData -> getMe error:", error);
            reject(error);
        });

        await _getAllPlaylists().then(async playlists => {
            const follow_playlists = (playlists.items || []).filter(playlist => {
                return playlist.owner && playlist.owner.id !== exportObject.user_id && playlist.id;
            }).map(playlist => {
                const { id, name, uri } = playlist;
                return { id, name, uri };
            });

            // Delay helper to avoid rate limits
            const delay = ms => new Promise(res => setTimeout(res, ms));

            const userPlaylistsRaw = (playlists.items || []).filter(playlist => {
                return playlist.owner && playlist.owner.id === exportObject.user_id && playlist.id;
            });

            let userPlaylists = [];
            for (const playlist of userPlaylistsRaw) {
                const { collaborative, id, name, uri } = playlist;
                let tracks = [];
                try {
                    const playlistTracks = await _getAllPlaylistTracks({ playlist_id: id });
                    tracks = playlistTracks.items;
                } catch (error) {
                    console.warn(`Skipping playlist ${name} (${id}) because Spotify threw an error:`, error);
                    // Do not reject here so the migration doesn't fail globally due to one forbidden playlist
                }

                userPlaylists.push({
                    collaborative,
                    id,
                    name,
                    public: playlist.public,
                    tracks,
                    uri
                });

                // Wait 250ms between fetching each playlist's tracks to avoid rate limiting
                await delay(250);
            }

            exportObject.follow_playlists = follow_playlists;
            exportObject.playlists = userPlaylists;
            resolve(exportObject);
        }).catch(error => {
            console.error("exportData -> _getAllPlaylists error:", error);
            reject(error);
        });
    });
};

const importData = async (migrationData, progressCallback) => {
    return new Promise(async (resolve, reject) => {
        try {
            const me = await spotifyService.getMe();

            // 1. Follow public playlists
            if (migrationData.follow_playlists && migrationData.follow_playlists.length > 0) {
                for (const fp of migrationData.follow_playlists) {
                    try {
                        await spotifyService.followPlaylist(fp.id);
                        if (progressCallback) progressCallback(`Seguiste la lista: ${fp.name}`);
                    } catch (err) {
                        console.error("Error following playlist", fp.name, err);
                    }
                }
            }

            // 2. Save Tracks in batches of 50
            if (migrationData.tracks && migrationData.tracks.length > 0) {
                const trackIds = migrationData.tracks.map(t => t.id);
                for (let i = 0; i < trackIds.length; i += 50) {
                    const batch = trackIds.slice(i, i + 50);
                    try {
                        await spotifyService.saveTracks(batch);
                        if (progressCallback) progressCallback(`Guardando canciones... (${Math.min(i + 50, trackIds.length)}/${trackIds.length})`);
                    } catch (err) {
                        console.error("Error saving tracks", err);
                    }
                }
            }

            // 3. Create own playlists and add tracks
            if (migrationData.playlists && migrationData.playlists.length > 0) {
                let playlistCount = 0;
                for (const pl of migrationData.playlists) {
                    try {
                        const newPlaylist = await spotifyService.createPlaylist(
                            me.id,
                            pl.name,
                            "Migrado desde Portify",
                            pl.public,
                            pl.collaborative
                        );

                        if (pl.tracks && pl.tracks.length > 0) {
                            const pTrackUris = pl.tracks.map(pt => pt.uri);
                            for (let j = 0; j < pTrackUris.length; j += 100) {
                                const batchUris = pTrackUris.slice(j, j + 100);
                                await spotifyService.addTracksToPlaylist(newPlaylist.id, batchUris);
                            }
                        }
                        playlistCount++;
                        if (progressCallback) progressCallback(`Creando listas... (${playlistCount}/${migrationData.playlists.length})`);
                    } catch (err) {
                        console.error("Error creating playlist", pl.name, err);
                    }
                }
            }

            resolve(true);
        } catch (error) {
            reject(error);
        }
    });
};


const downloadJson = (fileName, jsonText) => {
    const a = document.createElement('a');
    a.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(jsonText));
    a.setAttribute('download', fileName);
    if (document.createEvent) {
        const e = document.createEvent('MouseEvents');
        e.initEvent('click', true, true);
        a.dispatchEvent(e);
    } else {
        a.click();
    }
};

export const appService = {
    downloadJson,
    exportData,
    importData
}