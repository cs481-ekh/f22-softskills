import { Pool } from 'pg';
import { User } from '../../drive-permission-manager/src/types';

export class Users {
    private pool: Pool;

    constructor(pool: Pool) {
        this.pool = pool;
    }

    /**
     * Initializes the user table if it does not exist
     * 
     * Columns:
     * - EMAIL = String email of user - is also primary key
     * - DISPLAY_NAME = Name of user (not null)
     * - PHOTOLINK = Link to user's profile photo
     */
    async initTable() {
        await this.pool.query("CREATE TABLE IF NOT EXISTS Users (EMAIL TEXT PRIMARY KEY NOT NULL, "
            + "DISPLAY_NAME TEXT NOT NULL, PHOTOLINK TEXT);").then(res => {
                if (!res)
                    console.error("Error in users.initTable");
            });
    }

    /**
     * Creates the provided user entry in the database. Returns the
     * user object created in the database. If undefined, then query
     * was unsuccessful.
     * 
     * @param user - User object to create in database
     * @param callback - Callback function to run
     * @returns - User object created in database
     */
    async create(user: User, callback?: Function): Promise<User | undefined> {
        let userOut: User | undefined;
        await this.pool.query("INSERT INTO Users (EMAIL, DISPLAY_NAME, PHOTOLINK) "
            + "VALUES ('" + user.emailAddress + "', '" + user.displayName + "', '" + user.photoLink + "') ON CONFLICT(EMAIL) DO NOTHING;").then(res => {
                if (!res)
                    console.error("Error in users.create");
                else
                    userOut = user;
                if (callback)
                    callback(userOut);
            });
        return Promise.resolve(userOut);
    }

    /**
     * Reads the user entry with the desired email
     * 
     * @param email - Email of user to find
     * @param callback - Callback function to run
     * @returns - Desired user object, or undefined if not found
     */
    async read(email: String, callback?: Function): Promise<User | undefined> {
        let user: User | undefined;
        await this.pool.query("SELECT * FROM Users WHERE EMAIL LIKE '" + email + "';").then(res => {
            if (!res || !res.rows || res.rows.length == 0)
                console.error("Error in users.read");
            else
                user = {
                    emailAddress: res.rows[0].email,
                    displayName: res.rows[0].display_name,
                    photoLink: res.rows[0].photolink
                };
            if (callback)
                callback(user);
        });
        return Promise.resolve(user);
    }

    /**
     * Stores the provided updated user object in the database. Returns
     * the updated object, or undefined if unsuccessful.
     * 
     * @param user - Updated user object to store in the database
     * @param callback - Optional callback function
     * @returns - Updated user object
     */
    async update(user: User, callback?: Function): Promise<User | undefined> {
        let userOut: User | undefined;
        await this.pool.query("UPDATE Users SET EMAIL = '" + user.emailAddress
            + "', DISPLAY_NAME = '" + user.displayName + "', PHOTOLINK = '"
            + user.photoLink + "' WHERE EMAIL ='"
            + user.emailAddress + "';").then(res => {
                if (!res)
                    console.error("Error in users.update");
                else
                    userOut = user;
                if (callback)
                    callback(userOut);
            });
        return Promise.resolve(userOut);
    }

    /**
     * Deletes the desired user from the database and returns the corresponding User object.
     * 
     * It is not a good idea to delete user objects, as they are referenced frequently by
     * Permission and File objects.
     * 
     * @param email - Email of user to be deleted
     * @param callback - Callback function to execute after
     * @returns - Deleted User object or undefined if unsuccessful
     */
    async delete(email: String, callback?: Function): Promise<User | undefined> {
        let user: User | undefined;
        await this.pool.query("DELETE FROM Users WHERE EMAIL LIKE '" + email + "' RETURNING *;").then(res => {
            if (!res || !res.rows || res.rows.length == 0)
                console.error("Error in users.delete");
            else
                user = {
                    emailAddress: res.rows[0].email,
                    displayName: res.rows[0].display_name,
                    photoLink: res.rows[0].photolink
                };
            if (callback)
                callback(user);
        });
        return Promise.resolve(user);
    }

    // ]======ENUMERATED OPERATIONS======[

    /**
     * Stores the given array of User objects in the database.
     * 
     * @param users - Array of users to store
     * @param callback - Callback function to execute
     * @returns - Array of users stored if successful, or undefined otherwise
     */
    async populateTable(users: User[], callback?: Function): Promise<User[] | undefined> {
        if (users && users.length == 0) {
            if (callback)
                callback(undefined);
            return Promise.resolve(undefined);
        }
        let usersOut: User[] | undefined;
        let query = "INSERT INTO Users (EMAIL, DISPLAY_NAME, PHOTOLINK) VALUES ";
        users.forEach(user => {
            query += "('" + user.emailAddress + "', '" + user.displayName + "', '" + user.photoLink + "'), ";
        });
        query = query.slice(0, query.length - 2) + " ON CONFLICT (EMAIL) DO NOTHING;";
        await this.pool.query(query).then(res => {
            if (!res)
                console.error("Error in Users.populateTable");
            else
                usersOut = users;
            if (callback)
                callback(usersOut);
        });
        return usersOut;
    }

    /**
     * Queries the database for an array of all users
     * 
     * @param callback - Callback function to be executed
     * @returns - Array of all users
     */
    async readAll(callback?: Function): Promise<User[] | undefined> {
        let users: User[] | undefined = [];
        await this.pool.query("SELECT * FROM Users;").then(async res => {
            if (!res || !res.rows)
                console.error("Error in users.readAll");
            else {
                res.rows.forEach(row => {
                    users?.push({
                        emailAddress: row.email,
                        displayName: row.display_name,
                        photoLink: row.photolink
                    });
                });
            }
            if (callback)
                callback(users);
        });
        return Promise.resolve(users);
    }
}