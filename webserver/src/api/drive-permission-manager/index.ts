import { GoogleAuth, OAuth2Client } from 'google-auth-library';
import {File, Permission} from './types';
interface IDrivePermissionManager{
    client: OAuth2Client // Imports needed to read type.
    /**
     * Returns an array of File objects.
     * @Return [File]
     */
    getFiles: () => [File]
    /**
     * Returns an [] containing the permissions of a given fileId
     * or the permissions associated with an email address.
     * @param s File id || Email address
     * @returns [Permission] || []
     */
    getPermissions: (s: string) => [Permission]
}

