import { file } from 'googleapis/build/src/apis/file';
import { Pool } from 'pg';
import { Permission } from '../drive-permission-manager/types';

export class Permissions {
    private pool: Pool;

    constructor(pool: Pool) {
        this.pool = pool;
        this.initDB();
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
    private async initDB() {
        await this.pool.query("CREATE TABLE IF NOT EXISTS Permissions "
            + "(ID TEXT PRIMARY KEY NOT NULL, EMAIL TEXT, TYPE TEXT NOT NULL, "
            + "ROLE TEXT, EXPIRATION_DATE TEXT, DELETED BOOLEAN NOT NULL, "
            + "PENDING_OWNER BOOLEAN, GRANTEE_USER TEXT NOT NULL);", err => {
                if (err)
                    console.error(err);
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
            + permission.pendingOwner + "', '" + permission.user.emailAddress + "');", err => {
                if (err)
                    console.error(err);
                else
                    permOut = permission;
                if (callback)
                    callback(permOut);
            })
        return permOut;
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
            + id + "';", (err, res) => {
                if (err)
                    console.error(err);
                else
                    permOut = {
                        id: res.rows[0].id,
                        emailAddress: res.rows[0].email,
                        type: res.rows[0].type,
                        role: res.rows[0].role,
                        expirationDate: res.rows[0].expiration_date,
                        deleted: res.rows[0].deleted,
                        pendingOwner: res.rows[0].pending_owner,
                        // TODO: replace id with user object
                        user: res.rows[0].grantee_user
                    };
                if (callback)
                    callback(permOut);
            });
        return permOut;
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
            + permission.user.emailAddress + "' WHERE ID = '" + permission.id + "';", err => {
                if (err)
                    console.error(err);
                else
                    permOut = permission;
                if (callback)
                    callback(permOut);
            })
        return permOut;
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
        await this.pool.query("DELETE FROM Permissions WHERE ID LIKE '" + id + "' RETURNING *;",
            (err, res) => {
                if (err)
                    console.error(err);
                else
                    permOut = {
                        id: res.rows[0].id,
                        emailAddress: res.rows[0].email,
                        type: res.rows[0].type,
                        role: res.rows[0].role,
                        expirationDate: res.rows[0].expiration_date,
                        deleted: res.rows[0].deleted,
                        pendingOwner: res.rows[0].pending_owner,
                        // TODO: replace id with user object
                        user: res.rows[0].grantee_user
                    };
                if (callback)
                    callback(permOut);
            });
        return permOut;
    }
}