import { userConstants } from '../constants';

const defaultState = {
    display_name: "User Name",
    migrationData: null,
    loadingPreview: false,
    isFromBackup: false
};

export const user = (state = defaultState, action) => {
    switch (action.type) {
        case userConstants.GET_PROFILE_SUCCESS:
            return {
                ...state,
                ...action.data
            };
        case userConstants.PREVIEW_REQUEST:
            return {
                ...state,
                loadingPreview: true
            };
        case userConstants.PREVIEW_SUCCESS:
            return {
                ...state,
                loadingPreview: false,
                migrationData: action.data
            };
        case userConstants.PREVIEW_FAILURE:
            return {
                ...state,
                loadingPreview: false
            };
        case userConstants.LOAD_BACKUP_SUCCESS:
            return {
                ...state,
                migrationData: action.data,
                isFromBackup: true
            };
        default: return state;
    }
}