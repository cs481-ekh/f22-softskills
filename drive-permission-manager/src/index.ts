import { GoogleAuth, OAuth2Client } from "google-auth-library";
import { File, GranteeType, Permission, User, Role, GetPermissionsOptions } from "./types";
import { drive_v3, google } from "googleapis";
import { Postgres } from "../../database/postgres";
import { ParameterDescriptionMessage } from "pg-protocol/dist/messages";
interface IDrivePermissionManager {
  /**
   * Returns an array of File objects. If the parameter fileIds
   * is provided, then the corresponding File objects will be returned
   * otherwise File objects without parents and their corresponding children
   * will be returned.
   * @Return Promise<File[]>
   */
  getFiles(fileIds?: string[]): Promise<File[]>;
  /**
   * Returns an [] containing the permissions of a given fileId
   * or the permissions associated with an email address.
   * @param s GetPermissionOptions || Email address
   * @returns [Permission] || []
   */
  getPermissions(s: GetPermissionsOptions): Promise<Permission[]>;
  /**
   * Deletes the permission identified by permissionId from the file
   * identified by fileId.
   * @param fileId the id of the file to remove the permission from
   * @param permissionId the id of the permission to remove
   */
  deletePermission(fileId: string, permissionId: string): Promise<void>;
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
  addPermission(fileid: string, role: Role, type: GranteeType, s?: string): Promise<Permission>;
}

class DrivePermissionManager implements IDrivePermissionManager {
  private drive: drive_v3.Drive;
  private db: Postgres;
  constructor(auth: GoogleAuth) {
    this.drive = google.drive({ version: "v3", auth });
    this.db = new Postgres();
  }
  async initDb() {
    // console.log("In initDb() ------------------->")
    // const fileList: File[] = await this.getFiles(); // Get files from Google Drive
    let fileList: File[] = [];
    try {
      await this.db.initTables(); // Init db
      var parentToChildrenMap = new Map();
      let NextPageToken = "";
      do {
        const params = {
          pageToken: NextPageToken || "",
          pageSize: 1000,
          fields:
            "nextPageToken, files(id, name, driveId, permissions, parents, kind, owners)",
          corpora: "allDrives",
          includeItemsFromAllDrives: true,
          supportsAllDrives: true,
        };
        // Make API call to Google Drive
        const res = await this.drive.files.list(params);
        // Parse each file
        res.data.files.forEach((f) => {
          // Parse permissions of the file
          const permissionsList = [];
          if (f.permissions) {
            for (const perm of f.permissions) {
              let user: User = {
                emailAddress: perm.emailAddress,
                displayName: perm.displayName,
                photoLink: perm.photoLink,
              };
              let permission: Permission = {
                id: perm.id,
                fileId: f.id,
                type: perm.type,
                role: perm.role,
                expirationDate: perm.expirationTime,
                deleted: perm.deleted,
                pendingOwner: perm.pendingOwner,
                user,
              };
              permissionsList.push(permission);
            }
          }
          // Parse owners of the file
          let owners: User[] = [];
          if (f.owners) {
            f.owners.forEach((element) => {
              owners.push({
                displayName: element.displayName,
                emailAddress: element.emailAddress,
                photoLink: element.photoLink,
              });
            });
          }
          // Create File object from parsed data
          let file: File = {
            id: f.id,
            name: f.name,
            parents: f.parents,
            owners,
            permissions: permissionsList,
            kind: f.kind,
            children: []
          };
          // File is finished so add it to the list of parsed Drive files
          fileList.push(file);
          // Establish who its parents are and if this file has parents add this fileId
          if (file.parents && file.parents.length) {
            
            for (const parentId of file.parents) {
              const children = parentToChildrenMap.get(parentId);
              if (children) {
                // If the parent already has children
                children.push(file.id);
                parentToChildrenMap.set(parentId, children);
              } else {
                // Parent doesn't get out much so no children yet
                parentToChildrenMap.set(parentId, [file.id]);
              }
            }
          }
        });
        NextPageToken = res.data.nextPageToken;
      } while (NextPageToken);

      // Assign children to parents
      let parentCount = parentToChildrenMap.size;
      for (const file of fileList) {
        if (parentCount) {
          if (parentToChildrenMap.get(file.id)) {
            file.children = parentToChildrenMap.get(file.id);
            parentToChildrenMap.delete(file.id);
            parentCount--;
          }
        } else break;
      }
      // If parent count is still > 0 then that means that the parent file wasn't present so remove
      if(parentCount){
        let parentIds = Array.from(parentToChildrenMap.keys())
        for(const file of fileList){
          if (file.parents)
            file.parents = file.parents.filter(parentId => !parentIds.includes(parentId))
        }
      }
      // console.log(JSON.stringify(fileList))
      try{
        await this.db.files.populateTable(fileList);
      }
      catch(e){
        console.log('Problem populating table', e);
      }

    } catch (e) {
      console.log(e);
    }
    // console.log("<-----------------------------")
  }
  async getFiles(fileIds?: string[]): Promise<File[]> {
    try{
      let files: File[] = [];
      if(fileIds && fileIds.length){
        files = await this.db.files.readArray(fileIds);
        if(!files || files.length != fileIds.length){
          return Promise.reject({
            fileIds,
            files,
            reason: `Files not found.`,
            missingFiles: fileIds.filter(id => !files.find(file => file.id == id))
          })
        }
      }
      else{
        files = await this.db.files.readRootAndChildren(); 
      }
      return Promise.resolve(files);
    }
    catch(e){
      return Promise.reject({
        fileIds,
        reason: `Error: Failed to read files from db...\n${e}`
      })
    }
  }
  async getPermissions(s: GetPermissionsOptions): Promise<Permission[]> {
    // By File Id
    if ("fileId" in s) {
      try {
        let file = await this.db.files.read(s.fileId);
        if (file) return Promise.resolve(file.permissions);
        else return Promise.reject({ ...s, reason: "File not found." })
      }
      catch (e) {
        return Promise.reject({ ...s, reason: `Error when querying db...\n${e}` })
      }
    }
    // By Email Address
    else if ("emailAddress" in s) {
      try {
        return Promise.resolve(await this.db.permissions.readByEmail(s.emailAddress))
      }
      catch (e) {
        return Promise.reject({ ...s, reason: `Error when querying db...\n${e}` })
      }
    }
    else {
      return Promise.reject({ reason: `Invalid parameters provided ${s}` });
    }
  }
  async deletePermission(fileId: string, permissionId: string): Promise<void> {
    try {
      let file: File = await this.db.files.read(fileId);
      // Check file
      if (!file) {
        return new Promise((resolve, reject) => {
          reject({
            fileId,
            permissionId,
            reason: `File not found.`,
          });
        });
      }
      let perm: Permission = await this.db.permissions.read(permissionId);
      // Check permission
      if (!perm) {
        return new Promise((resolve, reject) => {
          reject({
            fileId,
            permissionId,
            reason: `Permission not found.`,
          });
        });
      }
      // Attempt to make call to Drive api to delete the permission
      const params = {
        fileId,
        permissionId,
      };
      await this.drive.permissions.delete(params);
      try {
        // await this.db.permissions.delete(permissionId); // update our db to reflect change
        await this.db.files.deletePermission(file, permissionId) // update our db to reflect change
      } catch (e) {
        // something bad happened when trying to update our db... :(
        return new Promise((resolve, reject) => {
          reject({
            fileId,
            permissionId,
            reason: `Failed to update db.`,
          });
        });
      }
    } catch (e) {
      // Something went wrong with api call to drive...inform user
      return new Promise((resolve, reject) => {
        reject({
          fileId,
          permissionId,
          reason: `Something went wrong with Google Drive API call:\n${e}`,
        });
      });
    }
  }

  async addPermission(fileId: string, role: Role, type: GranteeType, s?: string): Promise<Permission> {
    // Check email/domain (s)
    if (s.indexOf("@") < 0) {
      return new Promise((resolve, reject) => {
        reject({
          fileId,
          role,
          granteeType: s,
          email: s,
          reason: "Invalid email format.",
        });
      });
    }
    // Check Role
    else if (
      ![
        "owner",
        "organizer",
        "fileOrganizer",
        "writer",
        "commenter",
        "reader",
      ].includes(role)
    ) {
      return new Promise((resolve, reject) => {
        reject({
          fileId,
          role,
          granteeType: s,
          email: s,
          reason: "Invalid role was provided.",
        });
      });
    }
    // Check GranteeType
    else if (!["user", "group", "domain", "anyone"].includes(type)) {
      return new Promise((resolve, reject) => {
        reject({
          fileId,
          role,
          granteeType: type,
          email: s,
          reason: "Invalid granteeType was provided.",
        });
      });
    }
    // Check fileId
    let file: File = await this.db.files.read(fileId);
    if (!file) {
      return new Promise((resolve, reject) => {
        reject({
          fileId,
          role,
          granteeType: type,
          email: s,
          reason: "File not found in database.",
        });
      });
    }
    // Parameters passed. Lets try and make the Permission....
    const params = {// create params for google drive api req
      fileId,
      fields: "*",
      requestBody: {
        role,
        type,
        emailAddress: s,
      },
    }
    try {
      const res = await this.drive.permissions.create(params); // make request to drive api
      let permission: Permission = {
        // create new Permission object if request was successful
        id: res.data.id,
        fileId,
        type: res.data.type,
        role: res.data.role,
        deleted: res.data.deleted,
        pendingOwner: res.data.pendingOwner,
        user: {
          displayName: res.data.displayName,
          emailAddress: res.data.emailAddress,
          photoLink: res.data.photoLink,
        },
      };
      try {
        // try to add the newly created permission to our db
        // await this.db.permissions.create(permission);
        await this.db.files.createPermission(file, permission);
        return new Promise((resolve, reject) => {
          // permission was created without any problem and both db and drive were updated without throwing errors
          resolve(permission);
        });
      } catch (e) {
        // failed to update our db but Drive may have been updated
        return new Promise((resolve, reject) => {
          reject({
            fileId,
            role,
            granteeType: s,
            email: s,
            reason: "There was a problem updating our db. Its possible that permission was still created in Drive.",
          });
        });
      }
    } catch (e) {
      // API call to Drive went wrong
      return new Promise((resolve, reject) => {
        reject({
          fileId,
          role,
          granteeType: s,
          email: s,
          reason: `Drive API request failed or was rejected:\n${e}`,
        });
      });
    }
  }
//   async getDrives(): Promise<any[]> {
//     try{
//       let retVal: any[] = [];
//       const res = await this.drive.drives.list();
//       for(const drive of res.data.drives){
//         console.log('ID OF DRIVE: ' + drive.id);
//         retVal.push(drive.id);
//       }
//       console.log("LIST OF DRIVES: " + retVal)
//       return Promise.resolve(retVal);
//     }
//     catch(e){
//       return Promise.reject(e)
//     }
//   }
}

export default DrivePermissionManager;
export { IDrivePermissionManager };
export * from "./types";
