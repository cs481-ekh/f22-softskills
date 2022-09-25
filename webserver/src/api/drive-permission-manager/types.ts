export type File = {
    id: string;
    kind: string;
    name: string;
    parents: [string];
    owners: [string];
    permissions: [Permission];
}
export type Permission = {
    id: string
    emailAddress: string
    type: string
    expirationDate: number
    deleted: boolean
}


