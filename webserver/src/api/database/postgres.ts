import { Pool } from 'pg';

const pool = new Pool({
    host: process.env.POSTGRES_HOST,
    port: process.env.POSTGRES_PORT,
    user: process.env.POSTGRES_USER,
    password: process.env.POSTGRES_PASSWORD,
    database: process.env.POSTGRES_DATABASE
});

// Initialize database tables and types
async function init() {
    /**
     * User table
     * 
     * Columns:
     * - EMAIL = String email of user - is also primary key
     * - DISPLAY_NAME = Name of user (not null)
     */
    await pool.query("CREATE TABLE IF NOT EXISTS Users (EMAIL TEXT PRIMARY KEY NOT NULL, "
        + "DISPLAY_NAME TEXT NOT NULL);", (err, res) => {
            if (err) {
                console.error(err);
            } else {
                console.log(res);
            }
        });

    /**
     * File table
     * See: https://developers.google.com/drive/api/v3/reference/files
     * 
     * Columns:
     * - ID = String ID of file - is also primary key of entry
     * - KIND = Type of file
     * - NAME = Name of file
     * - PARENTS = String array of parent directory(s) by ID
     * - CHILDREN = String array of children files by their ID (can be null)
     * - OWNERS = String array of file owner(s) by their ID (can be null in shared Drive)
     * - PERMISSIONS = String array of permissions assigned to file by their ID
     */
    await pool.query("CREATE TABLE IF NOT EXISTS Files (ID TEXT PRIMARY KEY NOT NULL, "
        + "KIND TEXT NOT NULL, NAME TEXT, PARENTS TEXT[] NOT NULL, CHILDREN TEXT[], "
        + "OWNERS TEXT[], PERMISSIONS TEXT[]);", (err, res) => {
            if (err) {
                console.error(err);
            } else {
                console.log(res);
            }
        });
    /**
     * Permission table
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
    await pool.query("DO $$ BEGIN CREATE TYPE PERMISSION_ROLE AS ENUM "
        + "('owner', 'organizer', 'fileOrganizer', 'writer', "
        + "'commenter', 'reader'); EXCEPTION WHEN DUPLICATE_OBJECT THEN NULL; END $$",
        async (err, res) => {
            if (err) {
                console.log(err);
            } else {
                console.log(res);
                await pool.query("DO $$ BEGIN CREATE TYPE GRANTEE_TYPE AS ENUM "
                    + "('user', 'group', 'domain', 'anyone'); EXCEPTION WHEN "
                    + "DUPLICATE_OBJECT THEN NULL; END $$", async (err, res) => {
                        if (err) {
                            console.error(err);
                        } else {
                            console.log(res);
                            await pool.query("CREATE TABLE IF NOT EXISTS Permissions "
                                + "(ID TEXT PRIMARY KEY NOT NULL, EMAIL TEXT, TYPE GRANTEE_TYPE NOT NULL, "
                                + "ROLE PERMISSION_ROLE, EXPIRATION_DATE TEXT, DELETED BOOLEAN NOT NULL, "
                                + "PENDING_OWNER BOOLEAN, GRANTEE_USER TEXT NOT NULL);", (err, res) => {
                                    if (err) {
                                        console.error(err);
                                    } else {
                                        console.log(res);
                                    }
                                    pool.end();
                                });
                        }
                    })
            }
        });
}

init();

// exmaples/notes

// pool.query('CREATE TABLE Data(ID INT PRIMARY KEY NOT NULL, NAME TEXT NOT NULL);', (err, res) => {
//     console.log(err, res);
//     pool.end();
// })

// pool.query("INSERT INTO Data (ID, NAME) VALUES (3, 'Test again')", (err, res) => {
//     console.log(err, res);
//     pool.query("SELECT * FROM Data", (err, res) => {
//         console.log(err, res);
//     });
//     pool.end();
// });