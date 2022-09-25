import { GoogleAuth, OAuth2Client } from 'google-auth-library';
import {File} from './types';
interface IDrivePermissionManager{
    client: OAuth2Client // Imports needed to read type.
    /**
     * Returns an array of File objects.
     * @Return [File]
     */
    getFiles: () => [File]
}

