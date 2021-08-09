import type firebase from "firebase/app";
import {createMessage} from "./common";
let _web3:any;

function getCloudFunction(app:firebase.app.App, name:string) {
    return app.functions().httpsCallable(name);
}

async function getFirebaseToken(app:firebase.app.App, userAccount:string) {
    const createMessageToken = getCloudFunction(app, 'createMessageToken');
    const messageTokenPromise = createMessageToken({account: userAccount})
    const getLockFirebaseToken = getCloudFunction(app, 'getLockFirebaseToken');
    const messageToken = (await messageTokenPromise).data
    const signature = await sign(app, userAccount, messageToken);
    return getLockFirebaseToken({account: userAccount, signature});
}

async function sign(app:firebase.app.App, userAccount:string, messageToken:string) {
    const message = createMessage(messageToken, userAccount);
    return _web3.request({ method: 'personal_sign', params: [userAccount, message]});
}

async function getSelectedAddress(){
    if (!_web3.selectedAddress) await _web3.enable();
    return _web3.selectedAddress
}

export async function signInWithWeb3(app:firebase.app.App) {
    _web3 = (window as any).ethereum
    if(!_web3) throw "No provider found. " +
        "Please install a provider (e.g. Metamask) or user an Ethereum capable browser.";
    const userAccount = await getSelectedAddress();
    if(!userAccount) throw "No selected Address"
    const firebaseToken = await getFirebaseToken(app, userAccount);
    return app.auth().signInWithCustomToken(firebaseToken.data);
}