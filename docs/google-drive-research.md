# Google Drive Research / Quick reference
## What we need:
* The ability to have the user securely login to our site application with their Google account.
* Access to the user’s Google Drive contents
* The ability to enumerate permissions of the user’s Google Drive account
* The ability to modify file/folder access permissions of a user’s Google Drive on the user’s behalf.


## What is available

* [Basic Sign-in flow w/ OAuth](https://developers.google.com/identity/gsi/web/guides/overview)
* [How to enumerate files via Drive API](https://developers.google.com/drive/api/v3/reference/files/list)
* [How to enumerate file permissions via Drive API](https://developers.google.com/drive/api/v3/reference/permissions/list)

* [Creating file permissions](https://developers.google.com/drive/api/v3/reference/permissions/create)
* [Getting/Reading file permissions](https://developers.google.com/drive/api/v3/reference/permissions/get)
* [Updating file permissions](https://developers.google.com/drive/api/v3/reference/permissions/update)
* [Deleting file permissions](https://developers.google.com/drive/api/v3/reference/permissions/delete)

## Limitations
* Each user’s My Drive has a limit of 500,000 items.
* It is recommended to avoid nesting more than 20 levels of folders as this can have an impact on update time when updating permissions.
*The default quota for Drive API calls is **10,000 calls per 100 seconds** (both per user and per project). I don't see rate limits being an issue for what we are trying to accomplish.

## Scopes Required
* Being that the primary purpose of this project is to simplify the management of permissions in Google Drive, it would seem that the most logical scope to request is the ../auth/drive scope. This scope is required to use the permissions create, delete, and update endpoints
* If the permissions manager was to simply be used in a read only mode, we could probably get away with using the drive.metadata.readonly scope for the get and list endpoints.

## Other Notes:
The permissions endpoint takes a fileId as a parameter. That means that in order to enumerate the permissions for each file, we would need to call the endpoint for each file in the Drive. This would be the polling approach.

Another approach we could take would be to setup a webhook listener that listens for changes in the Drive. When a change to the file file permissions takes place, we can reflect the change in our DB or Cache.


