function getFiles() {
    axios.get('/getFiles', {
        params: {
            fileIds: [
                files[0].id,
                files[1].id
            ]
        }
    }).then(res => {
        console.log(res);
    }).catch(err => {
        console.error(err);
    });
}

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

async function testFiles() {
    const params = {
        fileIds: [
            "1NVaiPgW70cvOOHu7dQWlpYC9y_upuKqqfa3LHi1YVN4",
            "1GRX6cTr0LeWCPh9RRCVIZjoWtAhOL8lwQqeXWqm_EZg"
        ],
        role: "reader",
        granteeType: "user",
        emails: [
            "pb4000231@gmail.com"
        ]
    };
    const res = await axios.post('/addPermissions', params);
    console.log("res", res);
    console.log("res.data", res.data);
    if (res)
        return Promise.resolve(res.data);
    return Promise.resolve(res);
}

async function testFolder() {
    const params = {
        fileIds: [
            "1MqXS-fkiU1rFkkQhOSlHqWiL5KIlBqOA"
        ],
        role: "reader",
        granteeType: "user",
        emails: [
            "pb4000231@gmail.com"
        ]
    };
    const res = await axios.post('/addPermissions', params);
    console.log("res", res);
    console.log("res.data", res.data);
    if (res)
        return Promise.resolve(res.data);
    return Promise.resolve(res);
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
 * @returns - Array of all updated file objects, including children
 */
async function requestRemovePermissions(fileIds) {
    const res = await axios.post('/deletePermissions', { fileIds });
    if (res && res.data)
        return Promise.resolve(res.data);
    return Promise.reject(res);
}