/**
 * TODO: Take advantage of TS and static typing
 */

// ==========
//    MISC
// ==========

// Stores the idenfying information of an access entry
export class Access {
    /**
     * Constructor to store necessary information
     * 
     * @param {String} aid - ID of access entry
     * @param {String} uid - ID of user in pairing
     * @param {String} fid - ID of file in pairing
     * @param {Date} dateGranted - Date the access was granted
     * @param {Date} accessExpiration - Date the access will expire
     */
    constructor (aid, uid, fid, dateGranted = undefined, accessExpiration = undefined) {
        this.aid = aid;
        this.uid = uid;
        this.fid = fid;
        this.dateGranted = dateGranted;
        this.accessExpiration = accessExpiration;
    }

    /**
     * Creates a new Access object based on the aid
     * 
     * @param {String} aidIn - ID of access entry
     * @returns - Access object containing aid with an
     * undefined uid and fid
     */
    static createAIDAccess(aidIn) {
        return new Access(aidIn, undefined, undefined);
    }

    /**
     * Creates a new Access object based on the uid/fid pairing
     * 
     * @param {String} uidIn - ID of user in pairing
     * @param {String} fidIn - ID of file in pairing
     * @return - Access object containing the uid and fid with
     * an undefined aid
     */
    static createUFAccess(uidIn, fidIn) {
        return new Access(undefined, uidIn, fidIn);
    }
}

// Models a user entry in the database
export class User {
    /**
     * Constructor to store necessary information
     * 
     * @param {String} uid - ID of user
     * @param {String} name - Name of user
     * @param {String} email - Email of user
     */
    constructor (uid, name, email) {
        this.uid = uid;
        this.name = name;
        this.email = email;
    }
}

// Models a file entry in the database
export class File {
    /**
     * Constructor to store necessary information
     * 
     * @param {String} fid - ID of file
     * @param {String} fileName - Name of file
     * @param {String} path - Path to file
     * @param {Date} lastModified - Date the file was last modified
     * @param {boolean} isDirectory - Whether file is a directory or not (default is false)
     * @param {String[]} children - Array of children files/directories (default is empty array)
     */
    constructor(fid, fileName, path, lastModified, isDirectory = false, children = []) {
        this.fid = fid;
        this.fileName = fileName;
        this.isDirectory = isDirectory;
        this.path = path;
        this.lastModified = lastModified;
        this.children = children;
    }
}

// ==========
//   CREATE
// ==========

// >---USER---<

/**
 * Creates a new user entry in the User table
 * 
 * @param {User} user - User object containing information to be entered
 * @returns - True if successful, false otherwise
 */
export function createUser(user) {
    return true;
}

// >---FILE---<

/**
 * Creates a new file entry in the File table
 * 
 * @param {File} file - File object containing information to be entered
 * @returns - True if successful, false otherwise
 */
export function createFile(file) {
    return true;
}

// >---ACCESS---<

/**
 * Creates a new entry in the Access table
 * 
 * @param {Access} access - Access object containing information to be entered
 * @returns - True if successful, false otherwise
 */
export function createAccess(access) {
    return true;
}

// ==========
//    READ
// ==========

// >---USER---<

/**
 * Returns information on the specified user
 * or null if nonexistent
 * 
 * @param {String} uid - ID of user to read
 * @returns - User object with relevant information or null if unsuccessful
 */
export function readUser(uid) {
    return new User();
}

/**
 * Returns an array of user entries
 *  
 * @param {String[]} uids - Array of uids to query in database
 * @returns - An array of the desired user objects or null if unsuccessful
 */
export function readUsers(uids) {
    return [new User(), new User()];
}

// >---FILE---<

/**
 * Returns metadata on the specified file
 * or null if nonexistent
 * 
 * @param {String} fid - ID of file to read
 * @param {boolean} getChildrenRecursively - nest children
 * recursively inside returned object unless file is not a
 * directory (default is false)
 * @returns - File object with relevant information or null if unsuccessful
 */
export function readFile(fid, getChildrenRecursively = false) {
    return new File();
}

// >---ACCESS---<

/**
 * Returns information on the specified access or null if nonexistent
 * 
 * @param {Access} Access - Access object storing aid or uid and fid
 * @param {boolean} getUserAndFile - Return references user and file
 * in pairing (default is false)
 * @returns - Access object with relevant information or null if unsuccessful
 */
export function readAccess(Access, getUserAndFile = false) {
    return new Access();
}

/**
 * Returns a list of all files accessible by a given user
 * or an empty list if none. List will include referenced file
 * entries if getFiles is true.
 * 
 * @param {String} uid - ID of user to query
 * @param {boolean} getFiles - Specifies whether to return
 * referenced files nested in the object (default is false)
 * @returns - Array of all access entries involving the specified
 * user or null if unsuccessful
 */
 export function readAccessByUser(uid, getFiles = false) {
    return [new Access(), new Access()];
}

/**
 * Returns a list of all users who have access to the specified
 * file or an empty list if none. List will include referenced
 * user entries if getUsers is true.
 * 
 * @param {String} fid - ID of file to query
 * @param {boolean} getUsers - Specifies whether to return
 * referenced users nested in the object (default is false)
 * @returns - Array of all access entries involving the specified
 * file or null if unsuccessful
 */
export function readAccessByFile(fid, getUsers = false) {
    return [new Access(), new Access()];
}

// ==========
//   UPDATE
// ==========

// >---USER---<

/**
 * Updates the specified user entry with the provided information
 * 
 * @param {User} user - Object with updated user information
 * @returns - User object with the updated information or null if unsuccessful
 */
export function updateUser(user) {
    return new User();
}

// >---FILE---<

/**
 * Moves the specified file to the specified path
 * TODO: update late modified date here?
 * 
 * @param {String} fid - ID of file to move
 * @param {String} path - Destination path of file
 * @returns - File object with the updated path or null if unsuccessful
 */
export function moveFile(fid, path) {
    return new File();
}

/**
 * Renames the specified file
 * TODO: update last modified date here?
 * 
 * @param {String} fid - ID of file to be renamed
 * @param {String} fileName - New name of file
 * @returns - File object with the updated name or null if unsuccessful
 */
export function renameFile(fid, fileName) {
    return new File();
}

/**
 * Updates the specified file entry with the given file information
 * 
 * @param {File} file - File object containing updated information
 * @returns File object containing updated information or null if unsuccessful
 */
export function updateFile(file) {
    return new File();
}

// >---ACCESS---<

/**
 * Updates the specified access entry
 * 
 * @param {Access} access - Access object with updated information
 * @returns - Access object with updated information or null if unsuccessful
 */
export function updateAccess(access) {
    return new Access();
}

// ==========
//  DESTROY
// ==========

// >---USER---<

/**
 * Destroys the specified user from the database
 * 
 * @param {String} uid - ID of user to be destroyed
 * @returns - User object containing destroyed user or null if unsuccessful
 */
export function destroyUser(uid) {
    return new User();
}

// >---FILE---<

/**
 * Destroys the specified file from the database
 * 
 * @param {String} fid - ID of file to be destroyed
 * @returns - File object containing destroyed file
 */
export function destroyFile(fid) {
    return new File();
}

// >---ACCESS---<

/**
 * Destroys the specified access from the database
 * 
 * @param {String} aid - ID of access to be destroyed
 * @returns - Access object containing destroyed access
 */
export function destroyAccess(aid) {
    return new Access();
}