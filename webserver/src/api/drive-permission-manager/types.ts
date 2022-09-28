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

export type Role = "owner" | "organizer" | "fileOrganizer" | "writer" | "commenter" | "reader";
export type GranteeType = "user" | "group" | "domain" | "anyone"


