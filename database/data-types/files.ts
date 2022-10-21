import { Pool } from 'pg';
import { File, Permission, User } from '../../drive-permission-manager/src/types';
import { Permissions } from './permissions';
import { Users } from './users';

export class Files {
    private pool: Pool;
    private permissions: Permissions;
    private users: Users;

    constructor(pool: Pool, permissions: Permissions, users: Users) {
        this.pool = pool;
        this.permissions = permissions;
        this.users = users;
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

    // ]======BASIC CRUD======[

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
            + "', '" + this.ownersArrayToString(file.owners) + "', '" + this.permArrayToString(file.permissions)
            + "') ON CONFLICT(ID) DO NOTHING;").then(res => {
                if (!res)
                    console.error("Error in files.create");
                else {
                    file.permissions.forEach(async permission => {
                        await this.permissions.create(permission).then(res => {
                            if (!res)
                                console.error("Error in files.create creating permission");
                        });
                    });
                    fileOut = file;
                }
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
        await this.pool.query("SELECT * FROM Files WHERE ID LIKE '" + id + "';").then(async res => {
            if (!res || !res.rows || res.rows.length == 0)
                console.error("Error in files.read");
            else {
                let perms: Permission[] = [];
                for (let i = 0; i < res.rows[0].permissions.length; i++) {
                    let temp = await this.permissions.read(res.rows[0].permissions[i]);
                    if (temp)
                        perms.push(temp);
                }
                let owners: User[] = [];
                for (let i = 0; i < res.rows[0].owners.length; i++) {
                    let temp = await this.users.read(res.rows[0].owners[i]);
                    if (temp)
                        owners.push(temp);
                }
                file = {
                    id: res.rows[0].id,
                    kind: res.rows[0].kind,
                    name: res.rows[0].name,
                    parents: res.rows[0].parents,
                    children: res.rows[0].children,
                    owners: owners,
                    permissions: perms
                };
            }
            if (callback)
                callback(file);
        });
        return Promise.resolve(file);
    }

    /**
     * Updates the given file object in the database and all contained objects. Returns
     * the updated object, or undefined if query is unsuccessful.
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
            + this.ownersArrayToString(file.owners) + "', PERMISSIONS = '"
            + this.permArrayToString(file.permissions) + "' WHERE ID = '" + file.id + "';").then(res => {
                if (!res)
                    console.error("Error in files.update");
                else {
                    file.permissions.forEach(async permission => {
                        await this.permissions.update(permission).then(res => {
                            if (!res)
                                console.error("Error in files.update updating permissions")
                        });
                    });
                    fileOut = file;
                }
                if (callback)
                    callback(fileOut);
            });
        return Promise.resolve(fileOut);
    }

    /**
     * Creates the given permission which references the given file. Returns the
     * updated file object, or undefined if unsuccessful.
     * 
     * @param file - File object to update
     * @param permission - Permission object to create
     * @param callback - Callback function to execute
     * @returns - Updated file object
     */
    async createPermission(file: File, permission: Permission, callback?: Function): Promise<File | undefined> {
        if (file.id != permission.fileId) {
            console.error("File.createPermission - file.id != permission.fileId");
            return undefined;
        }
        const p = await this.permissions.create(permission);
        if (!p) {
            console.error("Files.createPermission - Error creating permission");
            if (callback)
                callback(undefined);
            return Promise.resolve(undefined);
        }
        file.permissions.push(p);
        await this.update(file);
        return Promise.resolve(file);
    }

    /**
     * Deletes the specified permission entry
     * 
     * @param file - File object referenced by the permission
     * @param pid - ID of permission to be deleted
     * @param callback - Callback function to execute
     * @returns - Updated file object
     */
    async deletePermission(file: File, pid: string, callback?: Function): Promise<File | undefined> {
        await this.permissions.delete(pid);
        for (let i = 0; i < file.permissions.length; i++)
            if (file.permissions[i].id == pid) {
                file.permissions.splice(i, 1);
                break;
            }
        await this.update(file);
        if (callback)
            callback(file);
        return Promise.resolve(file);
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
        await this.pool.query("DELETE FROM Files WHERE ID LIKE '" + id + "' RETURNING *;").then(async res => {
            if (!res || !res.rows || res.rows.length == 0)
                console.error("Error in files.delete");
            else {
                let perms: Permission[] = [];
                for (let i = 0; i < res.rows.length; i++) {
                    let temp = await this.permissions.read(res.rows[0].permissions[i]);
                    if (temp)
                        perms.push(temp);
                }
                let owners: User[] = [];
                for (let i = 0; i < res.rows[0].owners.length; i++) {
                    let temp = await this.users.read(res.rows[0].owners[i]);
                    if (temp)
                        owners.push(temp);
                }
                file = {
                    id: res.rows[0].id,
                    kind: res.rows[0].kind,
                    name: res.rows[0].name,
                    parents: res.rows[0].parents,
                    children: res.rows[0].children,
                    owners: owners,
                    permissions: perms
                };
            }
            if (callback)
                callback(file);
        });
        return Promise.resolve(file);
    }

    // ]======ENUMERATED OPERATIONS======[

    /**
     * Stores the given array of File objects in the database, as well as the nested
     * Permission and User objects.
     * 
     * @param files - Array of files to store
     * @param callback - Callback function to execute
     * @returns - Array of files stored if successful, or undefined otherwise
     */
    async populateTable(files: File[], callback?: Function): Promise<File[] | undefined> {
        if (files && files.length == 0) {
            if (callback)
                callback(undefined);
            return Promise.resolve(undefined);
        }
        let filesOut = files;
        let query = "INSERT INTO Files (ID, KIND, NAME, PARENTS, CHILDREN, OWNERS, PERMISSIONS) VALUES ";
        let permissions: Permission[] = [];
        let owners: User[] = [];
        files.forEach(file => {
            query += "('" + file.id + "', '" + file.kind + "', '" + file.name
                + "', '" + this.arrayToString(file.parents) + "', '" + this.arrayToString(file.children)
                + "', '" + this.ownersArrayToString(file.owners) + "', '" + this.permArrayToString(file.permissions)
                + "'), ";
            file.permissions.forEach(permission => {
                if (!permissions.some(p => p.id == permission.id))
                    permissions.push(permission);
            });
            file.owners.forEach(owner => {
                if (permissions.some(p => p.id == owner.emailAddress) || owners.some(own => own.emailAddress == owner.emailAddress))
                    owners.push(owner);
            });
        });
        query = query.slice(0, query.length - 2) + " ON CONFLICT (ID) DO NOTHING;";
        await this.pool.query(query).then(async res => {
            if (!res)
                console.error("Error in Files.populateTable");
            else {
                await this.permissions.populateTable(permissions).then(async res => {
                    if (!res)
                        console.error("Error in Files.populateTable");
                    else {
                        const uRes = await this.users.populateTable(owners);
                        if (!uRes && owners && owners.length > 0)
                            console.error("Error in Files.populatetable");
                        else
                            filesOut = files;
                    }
                });
            }
            if (callback)
                callback(files);
        });
        return Promise.resolve(filesOut);
    }

    /**
     * Gets an array of all file entries in the table
     * 
     * @param callback - Callback function to run
     * @returns - Array of all file entries in the files table
     */
    async readAll(callback?: Function): Promise<File[] | undefined> {
        let files: File[] | undefined = [];
        await this.pool.query("SELECT * FROM Files;").then(async res => {
            if (!res || !res.rows)
                console.error("Error in files.readAll");
            else {
                const permissions = await this.permissions.readAll();
                const users = await this.users.readAll();
                res.rows.forEach(file => {
                    let permArr: Permission[] = [];
                    file.permissions.forEach((perm: string) => {
                        let pe = permissions?.find(p => p.id == perm);
                        if (pe)
                            permArr.push(pe);
                    });
                    let owners: User[] = [];
                    file.owners.forEach((owner: string) => {
                        let own = users?.find((o: { emailAddress: string; }) => o.emailAddress == owner);
                        if (own)
                            owners.push(own);
                    });
                    files?.push({
                        id: file.id,
                        kind: file.kind,
                        name: file.name,
                        parents: file.parents,
                        children: file.children,
                        owners: owners,
                        permissions: permArr
                    });
                });
            }
            if (callback)
                callback(files);
        });
        return Promise.resolve(files);
    }

    // ]======MISC TOOLS======[

    /**
     * Converts a given string array to one string to pass to PostgreSQL
     * 
     * @param arr - Array of strings to convert
     * @returns - Consolidated String
     */
    private arrayToString(arr: string[] | undefined): string {
        if (!arr)
            return "{}";
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

    /**
     * Converts a given owner array to one string to pass to PostgreSQL
     * 
     * @param arr - Array of owners to convert
     * @returns - Consolidated string
     */
    ownersArrayToString(arr: any[] | undefined): string {
        if (!arr)
            return "{}";
        let strOut = "{";
        arr.forEach(obj => {
            if (typeof obj == 'string')
                strOut += '"' + obj + '", ';
            else
                strOut += '"' + obj.emailAddress + '", ';
        });
        strOut = strOut.slice(0, strOut.length - 2);
        return strOut + "}";
    }
}