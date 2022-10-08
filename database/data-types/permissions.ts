import { Pool } from 'pg';
import { Permission } from '../../drive-permission-manager/src/types';
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
     * - EMAIL = Email of user or group who has access
     * - TYPE = Type of grantee
     * - ROLE = Role granted in permission
     * - EXPIRATION_DATE = Date the access will expire
     * - DELETED = Boolean as to whether the file has been deleted
     * - PENDING_OWNER = Boolean as to whether the account is a pending owner
     * - GRANTEE_USER = ID of user who has access
     */
    async initTable() {
        await this.pool.query("CREATE TABLE IF NOT EXISTS Permissions "
            + "(ID TEXT PRIMARY KEY NOT NULL, EMAIL TEXT, TYPE TEXT NOT NULL, "
            + "ROLE TEXT, EXPIRATION_DATE TEXT, DELETED BOOLEAN NOT NULL, "
            + "PENDING_OWNER BOOLEAN, GRANTEE_USER TEXT NOT NULL);").then(res => {
                if (!res)
                    console.error("Error in permissions.initTable");
            });
    }

    /**
     * Creates the provided permission entry in the database. Returns the created
     * permission object, or undefined if query was unsuccessful.
     * 
     * @param permission - Permission object to create in database
     * @param callback - Callback function to run
     * @returns - Permission object created in database
     */
    async create(permission: Permission, callback?: Function): Promise<Permission | undefined> {
        let permOut: Permission | undefined;
        await this.pool.query("INSERT INTO Permissions (ID, EMAIL, TYPE, ROLE, EXPIRATION_DATE, "
            + "DELETED, PENDING_OWNER, GRANTEE_USER) VALUES ('" + permission.id + "', '"
            + permission.emailAddress + "', '" + permission.type + "', '" + permission.role
            + "', '" + permission.expirationDate + "', '" + permission.deleted + "', '"
            + permission.pendingOwner + "', '" + permission.user.emailAddress + "');").then(res => {
                if (!res)
                    console.error("Error in permissions.create");
                else
                    permOut = permission;
                if (callback)
                    callback(permOut);
            });
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
                if (!res)
                    console.error("Error in permissions.read");
                else {
                    let user = await this.users.read(res.rows[0].grantee_user);
                    if (user)
                        permOut = {
                            id: res.rows[0].id,
                            emailAddress: res.rows[0].email,
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
     * Updates the given permission object in the database. Returns the updated object,
     * or undefined if query is unsuccessful.
     * 
     * @param permission - Permission object to update in the database
     * @param callback - Callback function to run
     * @returns - Permission object updated in database
     */
    async update(permission: Permission, callback?: Function): Promise<Permission | undefined> {
        let permOut: Permission | undefined;
        await this.pool.query("UPDATE Permissions SET ID = '" + permission.id + "', EMAIL = '"
            + permission.emailAddress + "', TYPE = '" + permission.type + "', ROLE = '"
            + permission.role + "', EXPIRATION_DATE = '" + permission.expirationDate + "', DELETED = '"
            + permission.deleted + "', PENDING_OWNER = '" + permission.pendingOwner + "', GRANTEE_USER = '"
            + permission.user.emailAddress + "' WHERE ID = '" + permission.id + "';").then(res => {
                if (!res)
                    console.error("Error in permissions.update");
                else
                    permOut = permission;
                if (callback)
                    callback(permOut);
            });
        return Promise.resolve(permOut);
    }

    /**
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
            if (!res)
                console.error("Error in permissions.delete");
            else {
                let user = await this.users.read(res.rows[0].grantee_user);
                if (user)
                    permOut = {
                        id: res.rows[0].id,
                        emailAddress: res.rows[0].email,
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
}