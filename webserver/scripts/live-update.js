/**
 * Given the id of a file, requests an array of all grandchildren of the given file
 * from the server
 * 
 * @param {string} fileId - Id of file to get the grandchildren of
 * @returns - Array of grandchildren
 */
async function getGrandchildren(fileId) {
    const file = files.find(f => f.id == fileId);
    if (!file || !file.children || file.children.length == 0)
        return Promise.resolve([]);
    let grandchildren = [];
    file.children.forEach(childId => {
        let child = files.find(f => f.id == childId);
        if (child.children)
            grandchildren = grandchildren.concat(child.children);
    });
    for (let i = 0; i < grandchildren.length; i++)
        if (files.some(f => f.id == grandchildren[i]))
            grandchildren.splice(i--, 1);
    if (!grandchildren || grandchildren.length == 0)
        return [];
    const res = await axios.get('/getFiles', {
        params: {
            fileIds: grandchildren
        }
    });
    if (res)
        return Promise.resolve(res.data);
    return Promise.resolve([]);
}

/**
 * Sends a request to the server to add new permissions
 * for the given files and users
 * 
 * @param {string[]} fileIds - Array of file ids to add permissions to
 * @param {string} role - Role of the permissions to add
 * @param {string} granteeType - Type of recipient of permissions
 * @param {string[]} emails - Array of emails to add permissions to
 * @returns - Array of files with updated permissions
 */
async function requestAddPermissions(fileIds, role, granteeType, emails) {
    const params = { fileIds, role, granteeType, emails };
    const res = await axios.post('/addPermissions', params);
    if (res && res.data)
        return Promise.resolve(res.data);
    return Promise.reject(res);
}

/**
 * Given an array of file ids to update, sends a request to the server to 
 * strip all permissions from the given files
 * 
 * @param {string[]} fileIds - Array of file ids to remove permissions from
 * @param {string[]} permissionIds - Array of permission ids to remove from selected files
 * @returns - Array of all updated file objects, including children
 */
async function requestRemovePermissions(fileIds, permissionIds) {
    const res = await axios.post('/deletePermissions', { fileIds, permissionIds });
    if (res && res.data)
        return Promise.resolve(res.data);
    return Promise.reject(res);
}

/**
 * Given an array of file ids, sends a request to the server to
 * get the permissions for the given files and all of their children
 * 
 * @param {string[]} fileIds - Array of file ids to request permissions for
 * @returns - Array of all permission objects, including all children
 */
 async function getPermissions(fileIds) {
    console.log("FILEIDS", fileIds);
    const res = await axios.get('/getPermissions', {params: {fileIds}});
    if (res && res.data)
        return Promise.resolve(res.data);
    return Promise.reject(res);
}