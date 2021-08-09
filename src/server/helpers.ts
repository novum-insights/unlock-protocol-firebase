import {Contract, ethers, Signer} from "ethers";
import { Provider } from "@ethersproject/abstract-provider";


type LockClaimMap = Record<string, Array<string>>;

export function createToken(account:string, secret:string) {
    const message = ethers.utils.hashMessage(`${account}::${secret}`);
    console.log(`createToken(${account}, ${secret}) -> ${message}`)
    return message
}

export function verifyMessage(message: string, signature: string) {
    try {
        return ethers.utils.verifyMessage(message, signature)
    } catch (e) {
        console.error(e)
    }
}

export class AccountClaimReader {
    lockContractClient:LockContractClient
    lockClaimMap:LockClaimMap
    defaultClaims:string[]
    constructor(lockContractClient:LockContractClient, lockClaimMap: LockClaimMap, defaultClaims?:string[]) {
        this.lockContractClient = lockContractClient;
        this.lockClaimMap = lockClaimMap;
        this.defaultClaims = defaultClaims || []
    }
    async getAccountClaims(account:String):Promise<Record<string, boolean>> {
        const locks = Object.keys(this.lockClaimMap)
        const accountLocks = await this.getAccountHasValidKeys(account, locks)
        const lockClaims = accountLocks.flatMap((lock) => this.lockClaimMap[lock])
        const claims = [...this.defaultClaims, ...lockClaims];
        return Object.fromEntries(claims.map((claim) => [claim, true]))
    }

    private getAccountHasValidKeys(account: String, locks:string[]) {
        return this.lockContractClient.accountHasValidKeys(account, locks);
    }

    private async accountHasValidKey(account: String, lock:string):Promise<boolean> {
        return await this.lockContractClient.accountHasValidKey(account, lock);
    }
}

export class LockContractClient{
    provider?: Signer | Provider;
    constructor(providerNetwork?:string, providerOptions?:any) {
        this.provider = ethers.getDefaultProvider(providerNetwork, providerOptions);
    }
    async accountHasValidKey(account:String, lockAddress:string) {
        const lockContract = this.getLockContract(lockAddress)
        return await lockContract.getHasValidKey(account)
    }
    async accountHasValidKeys(account:String, lockAddresses:string[]) {
        const promises = lockAddresses.map((lock) => this.accountHasValidKey(account, lock))
        const results = await Promise.all(promises)
        return lockAddresses.filter((_, index) => results[index])
    }
    private getLockContract(lockAddress: string) {
        return new Contract(
            lockAddress,
            ['function getHasValidKey(address _owner) constant view returns (bool)'],
            this.provider
        )
    }
}