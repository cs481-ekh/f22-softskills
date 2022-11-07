import { file } from 'googleapis/build/src/apis/file';
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
        await this.pool.query("INSERT INTO Files (ID, KIND, NAME, " + ((file.parents) ? "PARENTS, " : "") + "CHILDREN, OWNERS, "
            + "PERMISSIONS) VALUES ('" + file.id + "', '" + file.kind + "', '" + file.name + "', '" +
            ((file.parents) ? this.arrayToString(file.parents) + "', '" : "") +
            this.fileArrayToString(file.children) + "', '" + this.ownersArrayToString(file.owners)
            + "', '" + this.permArrayToString(file.permissions)
            + "') ON CONFLICT(ID) DO NOTHING;").then(async res => {
                if (!res)
                    console.error("Error in files.create");
                else {
                    if (file.parents && file.parents[0]) {
                        const parent: File | undefined = await this.read(file.parents[0]);
                        if (parent) {
                            parent.children[parent.children.length] = file.id;
                            await this.update(parent);
                        }
                    }
                    if (file.children && file.children[0]) {
                        file.children.forEach(async child => {
                            if (typeof child != "string")
                                await this.create(child)
                        });
                    }
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
            if (res && res.rows && res.rows.length > 0) {
                let perms: Permission[] = await this.permissions.readArray(res.rows[0].permissions);
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
            + "', NAME = '" + file.name + ((file.parents) ? "', PARENTS = '" + this.arrayToString(file.parents)
                : "") + "', CHILDREN = '" + this.fileArrayToString(file.children) + "', OWNERS = '"
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
     * SHOULDN'T BE USED - use Permissions.create and Files.update instead
     * 
     * @param file - File object to update
     * @param permission - Permission object to create
     * @param callback - Callback function to execute
     * @returns - Updated file object
     */
    async createPermission(file: File, permission: Permission, callback?: Function): Promise<File | undefined> {
        if (file.id != permission.fileId) {
            console.error("File.createPermission - file.id != permission.fileId");
            return Promise.resolve(undefined);
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
     * Given the id of a file, deletes all permissions associated with specified
     * file, or any file nested underneath it
     * 
     * @param fileId - Id of root file
     * @param callback - Callback function to execute
     * @returns - True if permissions were stripped, false otherwise
     */
    async stripAllPermissions(fileId: string, callback?: Function): Promise<File[]> {
        const filesToStrip: File[] = await this.getFileAndSubtree(fileId);
        // if file is invalid
        if (filesToStrip.length == 0) {
            if (callback)
                callback([]);
            return Promise.resolve([]);
        }
        // if no files have any permissions
        if (!filesToStrip.some(file => file.permissions && file.permissions.length > 0)) {
            if (callback)
                callback(filesToStrip);
            return Promise.resolve(filesToStrip);
        }
        // remove permissions from all files
        let query = "UPDATE Files SET PERMISSIONS = '{}' WHERE ID IN ('";
        filesToStrip.forEach(file => query += file.id + "', '");
        query = query.slice(0, query.length - 3) + ");";
        await this.pool.query(query);
        filesToStrip.forEach(file => file.permissions = []);
        if (callback)
            callback(filesToStrip);
        return Promise.resolve(filesToStrip);
    }

    /**
     * Given the id of a file, returns the file object and all files nested under it
     * 
     * @param fileId - Id of top file
     * @param callback - Callback function to execute
     * @returns - Array of original file and all files underneath it
     */
    async getFileAndSubtree(fileId: string, callback?: Function): Promise<File[]> {
        const idStack: string[] = [fileId];
        let filesOut: File[] = [];
        while (idStack.length > 0) {
            let res = await this.read(idStack.pop());
            if (res) {
                filesOut.push(res);
                res.children.forEach(child => {
                    if (typeof child == "string")
                        idStack.push(child);
                });
            }
        }
        if (callback)
            callback(filesOut);
        return Promise.resolve(filesOut);
    }

    /**
     * Deletes the specified file and its children. Returns
     * the deleted file object, or undefined if the query was unsuccessful.
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
                res.rows[0].children.forEach(async (child: string) => {
                    await this.delete(child);
                });
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
        let query = "INSERT INTO Files (ID, KIND, NAME, PARENTS, CHILDREN, OWNERS, PERMISSIONS) VALUES ";
        let permissions: Permission[] = [];
        let owners: User[] = [];
        files.forEach(file => {
            query += "('" + file.id + "', '" + file.kind + "', '" + file.name.replaceAll("'", "''")
                + "', '" + this.arrayToString(file.parents ? file.parents : undefined) + "', '" + this.fileArrayToString(file.children)
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
        await this.pool.query(query);
        await this.permissions.populateTable(permissions);
        await this.users.populateTable(owners);
        if (callback)
            callback(files);
        return Promise.resolve(files);
    }

    /**
     * Gets an array of all file entries in the table
     * 
     * @param callback - Callback function to run
     * @param treeStructure - Whether to return files in tree structure or not
     * @returns - Array of all file entries in the files table
     */
    async readAll(treeStructure?: boolean, callback?: Function): Promise<File[] | undefined> {
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
                if (files && files.length > 0 && treeStructure)
                    files = this.restructureFiles(files);
            }
            if (callback)
                callback(files);
        });
        return Promise.resolve(files);
    }

    /**
     * Given an array of file ids, returns an array of the corresponding File objects
     * 
     * @param fileIds - Array of file ids to reach
     * @param callback - Callback function to execute
     * @returns - Array of Files
     */
    async readArray(fileIds: string[], callback?: Function): Promise<File[]> {
        let filesOut: File[] = [];
        for (let i = 0; i < fileIds.length; i++) {
            let file = await this.read(fileIds[i]);
            if (file)
                filesOut.push(file);
        }
        if (callback)
            callback(filesOut);
        return filesOut;
    }

    /**
     * Returns array of root files and their immediate children to be run
     * when the user initially loads the landing page
     * 
     * @param callback - Callback function to execute
     * @returns - Array of root files and their immediate children
     */
    async readRootAndChildren(callback?: Function): Promise<File[]> {
        let filesOut: File[] = [];
        const res = await this.pool.query("SELECT * FROM Files WHERE PARENTS = '{}'");
        // TODO: think about removing this
        if (!res || !res.rows || res.rows.length == 0) {
            console.error("Error in Files.readRoot or no files stored in root directory");
        } else {
            for (let r = 0; r < res.rows.length; r++) {
                let file: File = res.rows[r];
                file.permissions = await this.permissions.readArray(res.rows[r].permissions);
                let children: File[] = [];
                for (let i = 0; i < file.children.length; i++) {
                    let child = file.children[i];
                    let childFile;
                    if (typeof child == "string")
                        childFile = await this.read(child);
                    else
                        childFile = await this.read(child.id);
                    if (childFile)
                        children.push(childFile);
                }
                filesOut = filesOut.concat(children);
                if (file.owners && file.owners.length > 0) {
                    let owners: User[] = [];
                    for (let i = 0; i < file.owners.length; i++) {
                        let owner = await this.users.read(res.rows[r].owners[i]);
                        if (owner)
                            owners.push(owner);
                    }
                    file.owners = owners;
                }
                if (file.permissions && file.permissions.length > 0) {
                    let permissions: Permission[] = [];
                    for (let i = 0; i < file.permissions.length; i++) {
                        let permission = await this.permissions.read(res.rows[r].permissions[i]);
                        if (permission)
                            permissions.push(permission);
                    }
                    file.permissions = permissions;
                }
                filesOut.push(file);
            }
        }
        if (callback)
            callback(filesOut);
        return filesOut;
    }

    // ]======MISC TOOLS======[

    /**
     * Given a 1-dimensional array of File objects, returns an 'n'-dimensional
     * array, representative of the tree as the files are stored in Google Drive
     * 
     * @param filesIn - Array of File objects to restructure
     * @returns - Array of restructured File objects
     */
    private restructureFiles(filesIn: File[]): File[] {
        let filesOut: File[] = [];
        if (!filesIn || filesIn.length == 0)
            return filesOut;
        // sort files by parent
        const mapByParent: Map<string, File[]> = new Map();
        filesIn.forEach(file => {
            let parent = !file.parents || file.parents.length == 0 ? "" : file.parents[0];
            if (mapByParent.has(parent))
                mapByParent.get(parent)?.push(file);
            else
                mapByParent.set(parent, [file]);
        });
        filesOut = this.sort(mapByParent, "");
        return filesOut;
    }

    /**
     * Recursive function called by restructureFiles to sort File objects by
     * their parent File, and return a sub-array of restructured Files
     * 
     * @param map - Map containing pairings of parent id to child File object
     * @param parent - Id of the parent file for the current iteration
     * @returns - Sub-array of restructured File objects
     */
    private sort(map: Map<string, File[]>, parent: string): File[] {
        let children: File[] | undefined = map.get(parent);
        if (!children)
            return [];
        children.forEach(child => {
            child.children = this.sort(map, child.id);
        });
        return children;
    }

    /**
     * Converts a given string array to one string to pass to PostgreSQL
     * 
     * @param arr - Array of strings to convert
     * @returns - Consolidated String
     */
    private arrayToString(arr: string[] | undefined): string {
        if (!arr || arr.length == 0)
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
     * Converts a given File array to one string to pass to PostgreSQL
     * 
     * @param arr - Array of Files to convert
     * @returns - Consolidated String
     */
    private fileArrayToString(arr: File[] | string[]): string {
        let strOut = "{";
        arr.forEach(file => {
            if (typeof file == "string")
                strOut += '"' + file + '", ';
            else
                strOut += '"' + file.id + '", ';
        });
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
        if (!arr || arr.length == 0)
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
