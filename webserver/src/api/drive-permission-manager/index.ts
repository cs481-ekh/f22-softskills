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
    /**
     * Deletes the permission identified by permissionId from the file
     * identified by fileId.
     * @param fileId the id of the file to remove the permission from
     * @param permissionId the id of the permission to remove
     */
    deletePermission: (fileId: string, permissionId: string) => void
}

