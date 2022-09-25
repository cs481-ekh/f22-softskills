import { GoogleAuth, OAuth2Client } from 'google-auth-library';
import { google, GoogleApis } from 'googleapis';
interface IDrivePermissionManager{
    client: OAuth2Client // Imports needed to read type.
}

