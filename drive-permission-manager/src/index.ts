import { GoogleAuth, OAuth2Client } from 'google-auth-library';
import {File, GranteeType, Permission, User, Role} from './types';
import {drive_v3, google} from 'googleapis';
import{Postgres} from '../../database/postgres'
interface IDrivePermissionManager{
    /**
     * Returns an array of File objects.
     * @Return [File]
     */
    getFiles(): Promise<File[]>
    /**
     * Returns an [] containing the permissions of a given fileId
     * or the permissions associated with an email address.
     * @param s File id || Email address
     * @returns [Permission] || []
     */
    getPermissions(s: string): Promise<Permission[]>
    /**
     * Deletes the permission identified by permissionId from the file
     * identified by fileId.
     * @param fileId the id of the file to remove the permission from
     * @param permissionId the id of the permission to remove
     */
    deletePermission(fileId: string, permissionId: string): Promise<void>
    /**
     * Adds a permission to the given File. If the GranteeType is user or group, then
     * an email address will need to be passed. If the GranteeType is domain, then a
     * domain must be provided.
     * @param file the file to add the permission to
     * @param role the role that should be granted by this permission
     * @param type the GranteeType
     * @param s the domain or email address for the domain, user, or group that the permission is for.
     * @returns the Permission created
     */
    addPermission(fileid: string, role: Role, type: GranteeType, s?: string): Promise<Permission>
}

class DrivePermissionManager implements IDrivePermissionManager {
    private drive: drive_v3.Drive
    private db: Postgres
    constructor(auth: GoogleAuth){
        this.drive = google.drive({version:"v3", auth});
        this.db = new Postgres();
    }
    async initDb(){
        await this.db.initTables(); // Init db
        const fileList: File[] = await this.getFiles(); // Get files from Google Drive
        for(const file of fileList){
          await this.db.files.create(file); // Create a file entry in DB
          for(const permission of file.permissions){
            await this.db.permissions.create(permission); // Create permission entry in DB
            await this.db.users.create(permission.user); // Create user entry in DB
          }
        }
    }
    async getFiles(): Promise<File[]> {
        try{
        const fileList: File[] = [];
        var parentToChildrenMap = new Map();
        let NextPageToken = "";
        do {
          const params = {
            pageToken: NextPageToken || "",
            pageSize: 1000,
            fields: "nextPageToken, files(id, name, driveId, permissions, parents, kind, owners)",
            corpora: "allDrives",
            includeItemsFromAllDrives: true,
            supportsAllDrives: true,
          };
          const res = await this.drive.files.list(params);
          res.data.files.forEach((f) => {
            const permissionsList = [];
            for(const perm of f.permissions){
              let user: User = {emailAddress: perm.emailAddress, displayName: perm.displayName, photoLink: perm.photoLink};
              let permission: Permission = {
                id: perm.id,
                type: perm.type,
                role: perm.role,
                expirationDate: perm.expirationTime,
                deleted: perm.deleted,
                pendingOwner: perm.pendingOwner,
                user
              }
              permissionsList.push(permission);
            }
            let file: File = {id: f.id, name: f.name, parents:f.parents, owners: f.owners, permissions: permissionsList, kind: f.kind}
            fileList.push(file);
            if(file.parents && file.parents.length){
              for(const parentId of f.parents){
                const children = parentToChildrenMap.get(parentId);
                if(children){ // If the parent already has children
                  children.push(file.id);
                  parentToChildrenMap.set(parentId, children);
                }
                else{ // Parent doesn't get out much so no children yet
                  parentToChildrenMap.set(parentId, [file.id]);
                }
              }
            }
          });
          NextPageToken = res.data.nextPageToken;
        } while (NextPageToken);
        let parentCount = parentToChildrenMap.size;
        for(const file of fileList){
          if(parentCount){
            if(parentToChildrenMap.get(file.id)){
              file.children = parentToChildrenMap.get(file.id);
              parentCount--;
            }
          }
          else break;
        }
        return fileList;
    }
    catch(e){
        console.log(e);
    }
    };
    async getPermissions(s: string): Promise<Permission[]> {
      let retVal: Permission[];
      let files = await this.getFiles();
      for(const file of files){
        if(file.id == s){
          retVal = file.permissions;
          break;
        }
      }
      return new Promise((resolve, reject) =>{
        if(retVal && retVal.length){
          resolve(retVal);
        }
        else{
          reject(`No file with the id '${s}' was found.`);
        }
      })

    }

    async deletePermission(fileId: string, permissionId: string): Promise<void> {
      try{
        let file: File = await this.db.files.read(fileId);
        // Check file
        if(!file){
          return new Promise((resolve, reject) => {
            reject({
              fileId,
              permissionId,
              reason: `File not found.` 
            })
          })
        }
        let perm: Permission = await this.db.permissions.read(permissionId);
        // Check permission
        if(!perm){
          return new Promise((resolve, reject) => {
            reject({
              fileId,
              permissionId,
              reason: `Permission not found.` 
            })
          })
        }
        // Attempt to make call to Drive api to delete the permission
        const params = {
          fileId,
          permissionId
        }
        await this.drive.permissions.delete(params);
      }
      catch(e){ // Something went wrong with api call to drive...inform user
        return new Promise((resolve, reject) => {
          reject({
            fileId,
            permissionId,
            reason: `Something went wrong with Google Drive API call:\n${e}` 
          })
        })
      }
    }
  
    async addPermission(fileId: string, role: Role, type: GranteeType, s?: string): Promise<Permission>  {
      // Check email/domain (s)
      if(s.indexOf('@') < 0) {
        return new Promise((resolve, reject) => {
          reject({
            fileId,
            role,
            granteeType: s,
            email: s,
            reason: "Invalid email format."
          })
        })
      }
      // Check Role
      else if(!["owner", "organizer", "fileOrganizer", "writer", "commenter", "reader"].includes(role)){
        return new Promise((resolve, reject) =>{
          reject({
            fileId,
            role,
            granteeType: s,
            email: s,
            reason: "Invalid role was provided."
          })
        })
      }
      // Check GranteeType
      else if(!["user", "group", "domain", "anyone"].includes(type)){
        return new Promise((resolve, reject) =>{
          reject({
            fileId,
            role,
            granteeType: s,
            email: s,
            reason: "Invalid role was provided."
          })
        })
      }
      // Check fileId
      let file: File = await this.db.files.read(fileId);
      if(!file){
        return new Promise((resolve, reject) =>{
          reject({
            fileId,
            role,
            granteeType: s,
            email: s,
            reason: "File not found in database."
          })
        })
      }
      // Parameters passed. Lets try and make the Permission....
      const params = { // create params for google drive api req
        fileId,
        fields: "*",
        requestBody: {
          role,
          type,
          emailAddress: s
        }
      }
      try{
        const res = await this.drive.permissions.create(params); // make request to drive api
        let permission: Permission = { // create new Permission object if request was successful
          id: res.data.id,
          type: res.data.type,
          role: res.data.role,
          deleted: res.data.deleted,
          pendingOwner: res.data.pendingOwner,
          user: {displayName: res.data.displayName, emailAddress: res.data.emailAddress, photoLink: res.data.photoLink}
        }
        try{ // try to add the newly created permission to our db
          await this.db.permissions.create(permission);
          return new Promise((resolve, reject) => {
            // permission was created without any problem and both db and drive were updated without throwing errors
            resolve(permission)
          })
        }
        catch(e){ // failed to update our db but Drive may have been updated
          return new Promise((resolve, reject) => {
            reject({
              fileId,
              role,
              granteeType: s,
              email: s,
              reason: "There was a problem updating our db. Its possible that permission was still created in Drive."
            })
          })
        }
      }
      catch(e){ // API call to Drive went wrong
        return new Promise((resolve, reject) => {
          reject({
            fileId,
            role,
            granteeType: s,
            email: s,
            reason: `Drive API request failed or was rejected:\n${e}` 
          })
        })
      }
    }
}

export default DrivePermissionManager;
export {IDrivePermissionManager};
export * from "./types";