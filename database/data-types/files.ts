import { Pool } from 'pg';
import { File, Permission } from '../../drive-permission-manager/src/types';

export class Files {
    private pool: Pool;

    constructor(pool: Pool) {
        this.pool = pool;
    }

    /**
     * Initializes the files table if it does not exist
     * See:
     * https://developers.google.com/drive/api/v3/reference/files
     * 
     * Columns:
     * - ID = String ID of file - is also primary key
     * - KIND = String telling what kind of resource this is
     * - NAME = Name of file
     * - PARENTS = Array of IDs of parent directories
     * - CHILDREN = Array of IDs of child directories and files
     * - OWNERS = Array of IDs of owners of file
     * - PERMISSIONS = Array of IDs of permissions relating to file
     */
    async initTable() {
        await this.pool.query("CREATE TABLE IF NOT EXISTS Files (ID TEXT PRIMARY KEY NOT NULL, "
            + "KIND TEXT NOT NULL, NAME TEXT, PARENTS TEXT[], CHILDREN TEXT[], OWNERS TEXT[], "
            + "PERMISSIONS TEXT[]);").then(res => {
                if (!res)
                    console.error("Error in files.initTable");
            });
    }

    /**
     * Creates the provided File entry in the database. Returns the
     * File object created in the database, or undefined if query
     * was unsuccessful.
     * 
     * @param file - File object to create in database
     * @param callback - Callback function to run
     * @returns - File object created in database
     */
    async create(file: File, callback?: Function): Promise<File | undefined> {
        let fileOut: File | undefined;
        await this.pool.query("INSERT INTO Files (ID, KIND, NAME, PARENTS, CHILDREN, OWNERS, "
            + "PERMISSIONS) VALUES ('" + file.id + "', '" + file.kind + "', '" + file.name
            + "', '" + this.arrayToString(file.parents) + "', '" + this.arrayToString(file.children)
            + "', '" + this.arrayToString(file.owners) + "', '" + this.permArrayToString(file.permissions)
            + "');").then(res => {
                if (!res)
                    console.error("Error in files.create");
                else
                    fileOut = file;
                if (callback)
                    callback(fileOut);
            });
        return Promise.resolve(fileOut);
    }

    /**
     * Reads the specified file object from the database. Returns undefined if
     * query is unsuccessful.
     * 
     * @param id - ID of file to read
     * @param callback - Callback function to run
     * @returns - File object read from database
     */
    async read(id: String, callback?: Function): Promise<File | undefined> {
        let file: File | undefined;
        await this.pool.query("SELECT * FROM Files WHERE ID LIKE '" + id + "';").then(res => {
            if (!res)
                console.error("Error in files.read");
            else
                file = {
                    id: res.rows[0].id,
                    kind: res.rows[0].kind,
                    name: res.rows[0].name,
                    parents: res.rows[0].parents,
                    children: res.rows[0].children,
                    owners: res.rows[0].owners,
                    // TODO: query database for relevant permission entries and return here
                    permissions: res.rows[0].permissions
                };
            if (callback)
                callback(file);
        });
        return Promise.resolve(file);
    }

    /**
     * Updates the given file object in the database. Returns the updated object, or
     * undefined if query is unsuccessful.
     * 
     * @param file - File object to update in database
     * @param callback - Callback function to run
     * @returns - File object updated in database
     */
    async update(file: File, callback?: Function): Promise<File | undefined> {
        let fileOut: File | undefined;
        await this.pool.query("UPDATE Files SET ID = '" + file.id + "', KIND = '" + file.kind
            + "', NAME = '" + file.name + "', PARENTS = '" + this.arrayToString(file.parents)
            + "', CHILDREN = '" + this.arrayToString(file.children) + "', OWNERS = '"
            + this.arrayToString(file.owners) + "', PERMISSIONS = '"
            + this.permArrayToString(file.permissions) + "' WHERE ID = '" + file.id + "';").then(res => {
                if (!res)
                    console.error("Error in files.update");
                else
                    fileOut = file;
                if (callback)
                    callback(fileOut);
            });
        return Promise.resolve(fileOut);
    }

    /**
     * Deletes the specified file. Returns the deleted file object, or undefined
     * if the query was unsuccessful.
     * 
     * @param id - ID of file to delete
     * @param callback - Callback function to run
     * @returns - Deleted file object
     */
    async delete(id: string, callback?: Function): Promise<File | undefined> {
        let file: File | undefined;
        await this.pool.query("DELETE FROM Files WHERE ID LIKE '" + id + "' RETURNING *;").then(res => {
            if (!res)
                console.error("Error in files.delete");
            else
                file = {
                    id: res.rows[0].id,
                    kind: res.rows[0].kind,
                    name: res.rows[0].name,
                    parents: res.rows[0].parents,
                    children: res.rows[0].children,
                    owners: res.rows[0].owners,
                    // TODO: query database for relevant permission entries and return here
                    permissions: res.rows[0].permissions
                };
            if (callback)
                callback(file);
        });
        return Promise.resolve(file);
    }

    /**
     * Converts a given string array to one string to pass to PostgreSQL
     * 
     * @param arr - Array of strings to convert
     * @returns - Consolidated String
     */
    private arrayToString(arr: string[] | undefined): string {
        if (!arr)
            return "";
        let strOut = "{";
        arr.forEach(str => strOut += '"' + str + '", ');
        strOut = strOut.slice(0, strOut.length - 2);
        return strOut + "}";
    }

    /**
     * Converts a given Permission array to one string to pass to PostgreSQL
     * 
     * @param arr - Array of Permissions to convert
     * @returns - Consolidated String
     */
    private permArrayToString(arr: Permission[]): string {
        let strOut = "{";
        arr.forEach(perm => strOut += '"' + perm.id + '", ');
        if (strOut.length > 1)
            strOut = strOut.slice(0, strOut.length - 2);
        return strOut + "}";
    }
}