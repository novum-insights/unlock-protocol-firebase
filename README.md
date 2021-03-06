# README

## Installation

Functions needed for cloud functions and in the browser are available via `npm` , browser capability can also be enabled via CDN for those not using a bundler.

### Node.js
```
$ npm install @novuminsights/unlock-protocol-firebase
```

### CDN
```markup
<script type="text/javascript"
    src="https://unpkg.com/@novuminsights/unlock-protocol-firebase/lib/browser.js"></script>
```

## Authentication

This package allows wallet holders to log in to Firebase Authentication by verifying wallet ownership via signed message. No additional information is required. If you are using other authentication providers, I'd recommend merging user created in this way and using `AccountClaimReader` in `@novum/unlock-firebase-integration/server/helpers`  to maintain user claims in a custom manner. 

### Enabling Cloud Function authentication with for Wallet Users 

That's all you need for the backend:

```javascript
// functions/src/index.js
//initialize you app as you normally would
import * as admin from "firebase-admin";
admin.initializeApp();

//expose getLockFirebaseToken and createMessageToken as you would any other function
export {getLockFirebaseToken, createMessageToken} from "@novuminsights/unlock-protocol-firebase/lib/server";
```

Additionally, you need to set a secret:

```bash
$ firebase functions:config:set unlock.secret="Any String you can keep secret!"
```

On the front-end, just call `signInWithWeb3`. For example, using a button:

#### Bundler
```javascript
import "firebase/auth"
import "firebase/functions"
import {signInWithWeb3} from '@novum/unlock-firebase-integration/lib/browser'

const app = firebase.initializeApp(firebaseConfig);
const signInButton = document.querySelector('#MyButton')
signInButton.onclick = () => signInWithWeb3(app);
```

#### CDN
```markup
<script src="https://www.gstatic.com/firebasejs/8.8.1/firebase-app.js"></script>
<script src="https://www.gstatic.com/firebasejs/8.8.1/firebase-functions.js"></script>
<script src="https://www.gstatic.com/firebasejs/8.8.1/firebase-auth.js"></script>
<script type="text/javascript"
    src="https://unpkg.com/@novuminsights/unlock-protocol-firebase/lib/browser.js"></script>
....
<script>
    const app = firebase.initializeApp(firebaseConfig);
    const signInButton = document.querySelector('#MyButton')
    signInButton.onclick = async () => {
        await unlockProtocolFirebaseBrowser.signInWithWeb3(app)
    };
</script>
```

## Controlling Access Through Locks

This integration uses the Unlock Protocol locks held in a wallet to assign access roles to Firebase users via Firebase's custom claims \(assessed on login\). 

### Mapping locks to roles

Custom claims are assigned to the user upon authentication based on the locks the wallet currently has. The mapping from lock addresses to claims is  defined in `unlock-integration-config.json`, like so:

```javascript
// functions/unlock-integration.config.json
{
    "networks": {
        "mainnet": {
            "provider_url": "https://mainnet.infura.io/v3/678543fed855441b7b642730944ee4469",
            "locks": {
                "0x361Ddf540e27632D80dDE806EAa76AC42A0e15F6": ["basic_subscription"]
            }
        },
        "rinkby": {}
    },
  "default_network": "mainnet",
  "default_claims": ["wallet_owner"]
}
```

You can define multiple networks, but currently only one network is used at a time. You can set which network will be used for a particular project via firebase functions config like so:

```javascript
$ firebase functions:config:set unlock.network=rinkby
```

Otherwise, `default_network` as defined in `unlock-integration-config.json` is used. This is useful for testing with Rinkby. Support for multiple active networks can be added in the future.

### Using claims for role-based access

You can access these claims directly from the user's token --- for example, in your Firestore rules:

```javascript
// firestore.rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
      match /{document=**} {
      allow read, write: if false;
    }
    function hasSubscription() {
      return request.auth != null && request.auth.token.basic_subcriptionic_sub;
    }
    match /app_data/top_pairs {
          allow read: if hasSubscription();
    }
}

```

 As well as, your Firebase functions:

```javascript
async function hasBasicSubscription(context) {
    const auth = context.auth;
    ...
    return auth.token.basic_subscription === true;
}
```

or in the browser:

```javascript
export async function canViewDashboard(user) {
    const result = await user.getIdTokenResult(true);
    return (result.claims.basic_subscription === true);
}
```

## Example Project

An example project can be found it `example/` . You will need to add your own project credentials as it uses Firebase Auth.

