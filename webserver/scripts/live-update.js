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
        return res.data;
    return [];
}