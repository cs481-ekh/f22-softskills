export type File =  {
    id: string;
    kind: string;
    name: string;
    parents: string[];
    children?: string[];
    owners: any[];
    permissions: Permission[];
}
export type Permission = {
    id: string
    emailAddress: string
    type: GranteeType | string
    role: Role | string
    expirationDate?: string | number
    deleted: boolean
    pendingOwner?: boolean
    user: User
}
export type User = {
    displayName: string
    emailAddress: string
    photoLink: string
}
export type Role = "owner" | "organizer" | "fileOrganizer" | "writer" | "commenter" | "reader";
export type GranteeType = "user" | "group" | "domain" | "anyone"


