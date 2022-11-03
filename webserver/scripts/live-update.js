/**
 * Given the id of a file, returns and array of the file's
 * grandchildren. Used to preload grandchildren files while
 * user is browsing files and to avoid loading user's entire
 * Google Drive at once.
 * 
 * @param {string} fileId - Id of file whose grandchildren to get
 * @returns - Array of grandchildren files
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
        return Promise.resolve([]);
    const res = await axios.get('/getFiles', {
        params: {
            fileIds: grandchildren
        }
    });
    if (res)
        return Promise.resolve(res.data);
    return Promise.resolve([]);
}

// async function removePermission