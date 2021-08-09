import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import {AccountClaimReader, createToken, LockContractClient, verifyMessage} from "./helpers";
import {createMessage, getUnlockConfig} from "../common";

const config = functions.config()
const secret = config.unlock.secret
const unlockConfig = getUnlockConfig()
const network = (config.unlock ? config.unlock.network : false) || unlockConfig.default_network;
console.info('Using network:', network, 'for unlock')
const networkUnlockConfig = unlockConfig.networks[network]
const defaultClaims = unlockConfig.default_claims

const lockContractClient = new LockContractClient(networkUnlockConfig.provider_url)

const lockClaimMap = networkUnlockConfig.locks;
const accountClaimReader = new AccountClaimReader(lockContractClient, lockClaimMap, defaultClaims)

export function verifyWalletOwnership(address:string, messageToken:string, signature:string){
    const message = createMessage(messageToken, address)
    console.log('message:', message)
    const recoveredAddress = verifyMessage(message, signature);
    console.log('recoveredAddress:', recoveredAddress, 'address:', address, address === recoveredAddress)
    return address.toLowerCase() === recoveredAddress?.toLowerCase();
}

export const getLockFirebaseToken = functions.https.onCall( async({account, signature}, _) => {
    const token = createToken(account, secret)
    if (!verifyWalletOwnership(account, token, signature)) {
        throw new functions.https.HttpsError('internal',
            'Encountered as issue with verification of the Metamask account')
    }
    const claims = await accountClaimReader.getAccountClaims(account);
    return await admin.auth().createCustomToken(account, claims);
});

export const createMessageToken = functions.https.onCall( async({account}, _) => {
    return createToken(account, secret);
});
