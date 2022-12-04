import { Pool } from 'pg';
import { Permission, User } from '../../drive-permission-manager/src/types';
import { Users } from './users';

export class Permissions {
    private pool: Pool;
    private users: Users;

    constructor(pool: Pool, users: Users) {
        this.pool = pool;
        this.users = users;
    }

    /**
     * Initializes the permissions table and its types if it does not exist
     * See:
     * https://developers.google.com/drive/api/v3/reference/permissions
     * 
     * Columns:
     * - ID = String ID of permission - is also primary key of entry
     * - TYPE = Type of grantee
     * - ROLE = Role granted in permission
     * - EXPIRATION_DATE = Date the access will expire
     * - DELETED = Boolean as to whether the file has been deleted
     * - PENDING_OWNER = Boolean as to whether the account is a pending owner
     * - GRANTEE_USER = ID of user who has access
     */
    async initTable() {
        await this.pool.query("CREATE TABLE IF NOT EXISTS Permissions "
            + "(ID TEXT PRIMARY KEY NOT NULL, FILEID TEXT NOT NULL, TYPE TEXT NOT NULL, "
            + "ROLE TEXT, EXPIRATION_DATE TEXT, DELETED BOOLEAN NOT NULL, "
            + "PENDING_OWNER BOOLEAN, GRANTEE_USER TEXT NOT NULL);").then(res => {
                if (!res)
                    console.error("Error in permissions.initTable");
            });
    }

    /**
     * NOTE: DO NOT USE - use Files.createPermission instead
     * Creates the provided permission entry in the database. Returns the created
     * permission object, or undefined if query was unsuccessful.
     * 
     * @param permission - Permission object to create in database
     * @param callback - Callback function to run
     * @returns - Permission object created in database
     */
    async create(permission: Permission, callback?: Function): Promise<Permission | undefined> {
        let permOut: Permission | undefined;
        await this.pool.query("INSERT INTO Permissions (ID, FILEID, TYPE, ROLE, EXPIRATION_DATE, "
            + "DELETED, PENDING_OWNER, GRANTEE_USER) VALUES ('" + permission.id + "', '" + permission.fileId
            + "', '" + permission.type + "', '" + permission.role + "', '" + permission.expirationDate + "', '"
            + permission.deleted + "', '" + (permission.pendingOwner ? true : false) + "', '" + permission.user.emailAddress
            + "') ON CONFLICT (ID) DO NOTHING;").then(async res => {
                if (!res)
                    console.error("Error in permissions.create");
                else
                    await this.users.create(permission.user).then(res => {
                        if (!res)
                            console.error("Error in permissions.create user section");
                        permOut = permission;
                    });
            });
        if (callback)
            callback(permOut);
        return Promise.resolve(permOut);
    }

    /**
     * Reads the specified permission object from the database. Returns undefined
     * if query is unsuccessful.
     * 
     * @param id - ID of permission to read
     * @param callback - Callback function to run
     * @returns - Permission object read from database
     */
    async read(id: String, callback?: Function): Promise<Permission | undefined> {
        let permOut: Permission | undefined;
        await this.pool.query("SELECT * FROM Permissions WHERE ID LIKE '"
            + id + "';").then(async res => {
                if (!res || !res.rows || res.rows.length == 0) {
                    // console.error("Error in permissions.read");
                } else {
                    let user = await this.users.read(res.rows[0].grantee_user);
                    if (user)
                        permOut = {
                            id: res.rows[0].id,
                            fileId: res.rows[0].fileid,
                            type: res.rows[0].type,
                            role: res.rows[0].role,
                            expirationDate: res.rows[0].expiration_date,
                            deleted: res.rows[0].deleted,
                            pendingOwner: res.rows[0].pending_owner,
                            user: user
                        };
                    else
                        console.error("Error in permissions.read");
                }
                if (callback)
                    callback(permOut);
            });
        return Promise.resolve(permOut);
    }

    /**
     * NOTE: If updating fileId, please delete permission object and create a new one
     * Updates the given permission object in the database. Returns the updated object,
     * or undefined if query is unsuccessful.
     * 
     * @param permission - Permission object to update in the database
     * @param callback - Callback function to run
     * @returns - Permission object updated in database
     */
    async update(permission: Permission, callback?: Function): Promise<Permission | undefined> {
        let permOut: Permission | undefined;
        await this.pool.query("UPDATE Permissions SET ID = '" + permission.id
            + "', FILEID = '" + permission.fileId + "', TYPE = '"
            + permission.type + "', ROLE = '" + permission.role + "', EXPIRATION_DATE = '"
            + permission.expirationDate + "', DELETED = '" + permission.deleted + "', PENDING_OWNER = '"
            + permission.pendingOwner + "', GRANTEE_USER = '" + permission.user.emailAddress
            + "' WHERE ID = '" + permission.id + "';").then(async res => {
                if (!res)
                    console.error("Error in permissions.update");
                else
                    await this.users.update(permission.user).then(res => {
                        if (!res)
                            console.error("Error in permissions.update updating user");
                        permOut = permission;
                    });
                if (callback)
                    callback(permOut);
            });
        return Promise.resolve(permOut);
    }

    /**
     * NOTE: DO NOT USE - use Files.deletePermission instead
     * Deletes the specified permission. Returns the deleted permission object,
     * or undefined if the query was unsuccessful.
     * 
     * @param id - ID of permission to delete
     * @param callback - Callback function to run
     * @returns - Deleted permission object
     */
    async delete(id: string, callback?: Function): Promise<Permission | undefined> {
        let permOut: Permission | undefined;
        await this.pool.query("DELETE FROM Permissions WHERE ID LIKE '" + id + "' RETURNING *;").then(async res => {
            if (!res || !res.rows || res.rows.length == 0)
                console.error("Error in permissions.delete");
            else {
                let user = await this.users.read(res.rows[0].grantee_user);
                if (!user)
                    user = {
                        displayName: "",
                        emailAddress: res.rows[0].grantee_user,
                        photoLink: ""
                    };
                permOut = {
                    id: res.rows[0].id,
                    fileId: res.rows[0].fileid,
                    type: res.rows[0].type,
                    role: res.rows[0].role,
                    expirationDate: res.rows[0].expiration_date,
                    deleted: res.rows[0].deleted,
                    pendingOwner: res.rows[0].pending_owner,
                    user: user
                };
            }
            if (callback)
                callback(permOut);
        });
        return Promise.resolve(permOut);
    }

    // ]======ENUMERATED OPERATIONS======[

    /**
     * Stores the given array of Permission objects in the database, as well as
     * the nested User objects.
     * 
     * @param permissions - Array of permissions to store
     * @param callback - Callback function to execute
     * @returns - Array of permissions stored if successful, or undefined otherwise
     */
    async populateTable(permissions: Permission[], callback?: Function): Promise<Permission[] | undefined> {
        if (permissions && permissions.length == 0) {
            if (callback)
                callback(undefined);
            return Promise.resolve(undefined);
        }
        let permissionsOut: Permission[] | undefined;
        let query = "INSERT INTO Permissions (ID, FILEID, TYPE, ROLE, EXPIRATION_DATE, "
            + "DELETED, PENDING_OWNER, GRANTEE_USER) VALUES ";
        let users: User[] = [];
        permissions.forEach(permission => {
            query += "('" + permission.id + "', '" + permission.fileId
                + "', '" + permission.type + "', '" + permission.role
                + "', '" + permission.expirationDate
                + "', '" + (permission.deleted ? permission.deleted : false)
                + "', '" + (permission.pendingOwner ? permission.pendingOwner
                    : false) + "', '" + permission.user.emailAddress + "'), ";
            if (!users.some(u => u.emailAddress == permission.user.emailAddress))
                users.push(permission.user);
        });
        query = query.slice(0, query.length - 2) + " ON CONFLICT(ID) DO NOTHING;";
        await this.pool.query(query);
        await this.users.populateTable(users);
        if (callback)
            callback(permissionsOut);
        return Promise.resolve(permissionsOut);
    }

    /**
     * Gets an array of all permission entries in the table
     * 
     * @param callback - Callback function to run
     * @returns - Array of all permission entries in the permissions table
     */
    async readAll(callback?: Function): Promise<Permission[] | undefined> {
        let permissions: Permission[] | undefined = [];
        await this.pool.query("SELECT * FROM Permissions;").then(async res => {
            if (!res || !res.rows)
                console.error("Error in permissions.readAll");
            else {
                res.rows;
                const users = await this.users.readAll();
                res.rows.forEach(perm => {
                    let us = users?.find(u => u.emailAddress == perm.grantee_user);
                    if (us)
                        permissions?.push({
                            id: perm.id,
                            fileId: perm.fileid,
                            type: perm.type,
                            role: perm.role,
                            expirationDate: perm.expiration_date,
                            deleted: perm.deleted,
                            pendingOwner: perm.pending_owner,
                            user: us
                        });
                });
            }
            if (callback)
                callback(permissions);
        });
        return Promise.resolve(permissions);
    }

    /**
     * Reads an array of Permission objects given an array of IDs
     * 
     * @param ids Array of ids to read
     * @param callback Callback function to execute
     * @returns - Array of requested Permission objects
     */
    async readArray(ids: string[], callback?: Function): Promise<Permission[]> {
        let permissionsOut: Permission[] = [];
        for (let i = 0; i < ids.length; i++)
            await this.read(ids[i]).then((permission: Permission) => {
                if (permission)
                    permissionsOut.push(permission);
            });
        if (callback)
            callback(permissionsOut);
        return Promise.resolve(permissionsOut);
    }

    /**
     * Get all permissions which contain the specified email address
     * 
     * @param email - Email to search for
     * @param callback - Callback function to executr
     * @returns - Array of permissions containing the requested email
     */
    async readByEmail(email: string, callback?: Function): Promise<Permission[] | undefined> {
        let permissions: Permission[] | undefined;
        await this.pool.query("SELECT * FROM Permissions WHERE GRANTEE_USER LIKE '"
            + email + "';").then(async res => {
                if (!res)
                    console.error("Error in permission.readByEmail");
                else {
                    permissions = [];
                    const user = await this.users.read(email);
                    if (user)
                        res.rows.forEach(perm => {
                            permissions?.push({
                                id: perm.id,
                                fileId: perm.fileid,
                                type: perm.type,
                                role: perm.role,
                                expirationDate: perm.expiration_date,
                                deleted: perm.deleted,
                                pendingOwner: perm.pending_owner,
                                user: user
                            });
                        });
                }
                if (callback)
                    callback(permissions);
            });
        return Promise.resolve(permissions);
    }
}