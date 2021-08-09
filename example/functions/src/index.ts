import * as admin from "firebase-admin";
const serviceAccount = require("../august-monolith-301510-firebase-adminsdk-a2dgv-3f9188fe23.json");

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});
export {getLockFirebaseToken, createMessageToken} from "@novuminsights/unlock-protocol-firebase/lib/server";


