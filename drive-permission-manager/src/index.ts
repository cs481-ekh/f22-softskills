import { GoogleAuth, OAuth2Client } from "google-auth-library";
import { File, GranteeType, Permission, User, Role, GetPermissionsOptions, DeletePermissionsOptions } from "./types";
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
   * Given an array of file ids, strips all permissions from the files
   * and their children
   * @param fileIds - Array of file ids to strip permissions from
   */
  deletePermissions(fileIds: string[], options?: DeletePermissionsOptions): Promise<File[]>;
  /**
   * Deletes the permission identified by permissionId from the file
   * identified by fileId.
   * @param fileId the id of the file to remove the permission from
   * @param permissionId the id of the permission to remove
   */
  deletePermission(fileId: string, permissionId: string): Promise<void>;

  /**
   * Given an array of file ids and emails, creates new permissions for all emails provided
   * to access all files provided. Should provide files which are not nested, but it will
   * un-nest them if the need arises.
   * @param fileIds - Array of parent file ids to add the permissions too
   * @param role - Role of permissions to add
   * @param type - Type of permissions to add
   * @param emails - Array of emails to give permissions too
   */
  addPermissions(fileIds: string[], role: Role, type: GranteeType, emails: string[]): Promise<File[]>;
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
    console.log("Clearing any pre-existing data from db...")
    await this.db.dropTables();
    let fileList: File[] = [];
    try {
      await this.db.initTables(); // Init db
      var parentToChildrenMap = new Map();
      let NextPageToken = "";
      console.log(`Pulling Drive data using ${process.env.GDRIVE_EMAIL} ....`);
      do {
        const params = {
          pageToken: NextPageToken || "",
          pageSize: 1000,
          fields:
            "nextPageToken, files(id, name, driveId, permissions, parents, kind, owners, mimeType)",
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
            children: [],
            mimeType: f.mimeType
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
      if (parentCount) {
        let parentIds = Array.from(parentToChildrenMap.keys())
        for (const file of fileList) {
          if (file.parents)
            file.parents = file.parents.filter(parentId => !parentIds.includes(parentId))
        }
      }
      try {
        await this.db.files.populateTable(fileList);
        console.log(`Database initialization complete.`)
      }
      catch (e) {
        console.log('Problem populating table', e);
      }

    } catch (e) {
      console.log(e);
    }
  }
  async getFiles(fileIds?: string[]): Promise<File[]> {
    try {
      let files: File[] = [];
      if (fileIds && fileIds.length) {
        files = await this.db.files.readArray(fileIds);
        if (!files || files.length != fileIds.length) {
          return Promise.reject({
            fileIds,
            files,
            reason: `Files not found.`,
            missingFiles: fileIds.filter(id => !files.find(file => file.id == id))
          })
        }
      }
      else {
        files = await this.db.files.readRootAndChildren();
      }
      return Promise.resolve(files);
    }
    catch (e) {
      return Promise.reject({
        fileIds,
        reason: `Error: Failed to read files from db...\n${e}`
      })
    }
  }
  async getPermissions(s: GetPermissionsOptions): Promise<Permission[]> {
    // By File Id
    if ("fileId" in s) {
      console.log(`In getPermissions... fileId ${s.fileId}`);
      try {
        let fileList = await this.db.files.getFileAndSubtree(s.fileId);
        if (fileList) {
          //console.log(fileList);
          let permissionsSet: Set<Permission> = new Set();
          for (const file of fileList) {
            for (const perm of file.permissions) {
              permissionsSet.add(perm);
            }
          }
          console.log(permissionsSet);
          let retVal = Array.from(permissionsSet);
          console.log(retVal);
          return Promise.resolve(retVal);
        }
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

  async deletePermissions(fileIds: string[], options?: DeletePermissionsOptions): Promise<File[]> {
    // check for valid files
    if (!fileIds || fileIds.length == 0)
      return Promise.reject({
        fileIds,
        reason: 'No files provided'
      });
    const files: File[] = await this.db.files.readArray(fileIds);
    if (!files || files.length == 0)
      return Promise.reject({
        fileIds,
        reason: 'Files not found in database'
      });
    let allFiles: Set<File> = new Set();
    for (let i = 0; i < fileIds.length; i++) {
      (await this.db.files.getFileAndSubtree(fileIds[i])).forEach(f => allFiles.add(f));
    }
    // if no change needs to be made, leave it
    let fileArray: File[] = Array.from(allFiles);
    if (!fileArray.some(file => file.permissions && file.permissions.length > 0))
      return Promise.resolve(fileArray);
    // make the changes
    console.log(`options: ${options}`);
    try {
      for (let i = 0; i < fileArray.length; i++) {
        if (fileArray[i].permissions && fileArray[i].permissions.length > 0) {
          let ownerPermission: Permission;
          let updatedFilePerms = fileArray[i].permissions;
          console.log(`\nstarting permissions for ${fileArray[i].id}:`, updatedFilePerms);
          for (let j = 0; j < fileArray[i].permissions.length; j++) {
            // if (options) { // for granularity
            //   if (options.emails && !options.emails.includes(fileArray[i].permissions[j].user.emailAddress)) continue;
            //   // if (options.permissionIds && !options.permissionIds.includes(fileArray[i].permissions[j].id)) continue;
            // }
            if (options && options.emails && options.emails.indexOf(fileArray[i].permissions[j].user.emailAddress) > -1) {
              console.log(`Ran for email ${fileArray[i].permissions[j].user.emailAddress}`);
              // If not the file owner's permission
              if (fileArray[i].owners[0].emailAddress !== fileArray[i].permissions[j].user.emailAddress) {
                let params = {
                  fileId: fileArray[i].id,
                  permissionId: fileArray[i].permissions[j].id
                }
                try { // make api call to the Drive API to remove the permission
                  await this.drive.permissions.delete(params);
                  // now remove that permission from the updatedFilePerms array
                  for (let k = 0; k < updatedFilePerms.length; k++)
                    if (updatedFilePerms[k].id == params.permissionId) {
                      updatedFilePerms.splice(k, 1);
                      break;
                    }
                }
                catch (e) {
                  if (e.message.indexOf("Permission not found") == -1)
                    return Promise.reject({
                      fileArray,
                      reason: `Something went wrong talking to the Drive API:\n${e}`
                    });
                }
              }
              else {
                ownerPermission = fileArray[i].permissions[j];
              }
            } else {
              console.log(`Did not run for email ${fileArray[i].permissions[j].user.emailAddress}`);
            }
          }
          console.log(`\nending permissions for ${fileArray[i].id}:`, updatedFilePerms)
          fileArray[i].permissions = updatedFilePerms;
          console.log(await this.db.files.update(fileArray[i]));
        }
      }
    } catch (e) {
      return Promise.reject({
        fileArray,
        reason: `Something went wrong talking to the Drive API:\n${e}`
      });
    }
    return Promise.resolve(fileArray);
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

  async addPermissions(fileIds: string[], role: Role, type: GranteeType, emails: string[]): Promise<File[]> {
    // ensure emails are valid
    if (emails.some(email => email.indexOf("@") < 0))
      return Promise.reject({
        fileIds,
        role,
        type,
        emails,
        reason: "Invalid email format"
      });
    // ensure role is valid
    if (![
      "owner",
      "organizer",
      "fileOrganizer",
      "writer",
      "commenter",
      "reader",
    ].includes(role))
      return Promise.reject({
        fileIds,
        role,
        type,
        emails,
        reason: "Invalid role"
      });
    // ensure type is valid
    if (!["user", "group", "domain", "anyone"].includes(type))
      return Promise.reject({
        fileIds,
        role,
        type,
        emails,
        reason: "Invalid grantee type"
      });
    // ensure files exist
    const requestedFiles: File[] = await this.db.files.readArray(fileIds);
    if (!requestedFiles || requestedFiles.length !== fileIds.length)
      return Promise.reject({
        fileIds,
        role,
        type,
        emails,
        reason: "File not found in database"
      });
    // get all files to modify to use with db
    let filesToUpdate: File[] = [];
    for (let i = 0; i < requestedFiles.length; i++)
      if (!filesToUpdate.some(f => f.id == requestedFiles[i].id))
        filesToUpdate = filesToUpdate.concat(await this.db.files.getFileAndSubtree(requestedFiles[i].id));
    // get array of parent files to use with drive api
    let parentFiles: File[] = [];
    filesToUpdate.forEach(file => {
      if (!file.parents || file.parents.length == 0)
        parentFiles.push(file);
      else if (!filesToUpdate.some(f => f.id == file.parents[0]))
        parentFiles.push(file);
    });
    let allFiles: Set<File> = new Set();
    for (let i = 0; i < fileIds.length; i++)
      (await this.db.files.getFileAndSubtree(fileIds[i])).forEach(f => allFiles.add(f));
    let fileArray: File[] = Array.from(allFiles);
    try {
      // create new permissions in drive api
      for (let i = 0; i < fileArray.length; i++) {
        let createdPermissions: Permission[] = [];
        for (let j = 0; j < emails.length; j++) {
          const res = await this.drive.permissions.create({
            fileId: fileArray[i].id,
            fields: "*",
            requestBody: {
              role,
              type,
              emailAddress: emails[j]
            }
          });
          if (!res)
            return Promise.reject({
              fileIds,
              role,
              type,
              emails,
              reason: "There was a problem creating the permissions with Google Drive."
            });
          createdPermissions.push({
            id: res.data.id,
            fileId: fileArray[i].id,
            type: res.data.type,
            role: res.data.role,
            deleted: res.data.deleted,
            pendingOwner: res.data.pendingOwner,
            user: {
              displayName: res.data.displayName,
              emailAddress: res.data.emailAddress,
              photoLink: res.data.photoLink,
            },
          });
          // creating the permission in the db is a good idea too lol
          await this.db.permissions.create(createdPermissions[createdPermissions.length - 1]);
        }
        // update db
        for (let j = 0; j < createdPermissions.length; j++)
          if (!fileArray[i].permissions.some(p => p.id == createdPermissions[j].id))
            fileArray[i].permissions.push(createdPermissions[j]);
        const file: File = await this.db.files.update(fileArray[i]);
        if (!file)
          return Promise.reject({
            fileIds,
            role,
            type,
            emails,
            reason: "There was a problem saving the changes in the database."
          });
      }
    } catch (e) {
      return Promise.reject({
        fileIds,
        role,
        type,
        emails,
        reason: "Drive API request failed or was rejected:\n" + e
      });
    }
    return Promise.resolve(fileArray);
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
}

export default DrivePermissionManager;
export { IDrivePermissionManager };
export * from "./types";
