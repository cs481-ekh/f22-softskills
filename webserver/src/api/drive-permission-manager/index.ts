import { GoogleAuth, OAuth2Client } from 'google-auth-library';
import {File, GranteeType, Permission, Role} from './types';
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
    /**
     * Adds a permission to the given File. If the GranteeType is user or group, then
     * an email address will need to be passed. If the GranteeType is domain, then a
     * domain must be provided.
     * @param file the file to add the permission to
     * @param role the role that should be granted by this permission
     * @param type the GranteeType
     * @param s the domain or email address for the domain, user, or group that the permission is for.
     */
    addPermission: (file: File, role: Role, type: GranteeType, s?: string) => void
}

