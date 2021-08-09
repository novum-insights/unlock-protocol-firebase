const admin = require('firebase-admin');
import {expect, should as initChaiShould, use as chaiUse} from 'chai';
import {ImportMock} from 'ts-mock-imports';
import * as sinon from "sinon";

const helpers = require('../src/server/helpers');
const common = require('../src/common');
import firebaseTest = require('firebase-functions-test');
import chaiAsPromised = require('chai-as-promised');
import sinonChai = require('sinon-chai');

initChaiShould()

chaiUse(chaiAsPromised);
chaiUse(sinonChai);

const testFirebase = firebaseTest();

describe('Unit Cloud Functions', () => {
    let authStub:sinon.SinonStub, lockContractClientStub:sinon.SinonStub,
        getLockConfigStub:sinon.SinonStub;
    let createCustomTokenSpy:sinon.SinonSpy;
    let unlockConfig:{
        [key: string]: any
    };
    let firebaseConfig:{
        [key: string]: {
            [key: string]: any;
        };
    } = {}

    const userAccount = '0x7EBD0B8484F0778909a7Ab5382Ae306559CA952C';
    const otherAccount = '0x5ACD0B8484F0778909a7Ab5382Ae306559CA947A';
    const dummyFirebaseToken = '43242';
    const data = {account:userAccount, signature: 'aaaaaa', message: 'sssssss'};

    function result(){
        firebaseConfig = {unlock:{secret:"test-secret"}}
        testFirebase.mockConfig(firebaseConfig);
        const cloudFunctions = require('../src/server');
        const getFirebaseToken = testFirebase.wrap(cloudFunctions.getLockFirebaseToken);
        return getFirebaseToken(data, {instanceIdToken:'dummyInstanceIdToken'})
    }
    beforeEach(() => {
        unlockConfig = {
            "networks": {
                "mainnet": {
                    "provider_url": "https://mainnet.infura.io/v3/678543fed855441b7b642730944ee4469",
                    "locks": {
                        "0x361Ddf540e27632D80dDE806EAa76AC42A0e15F6": ["basic_subscription"],
                        "0x461Ddf540e27632D80dDE806EAa76AC42A0e15F4":
                            ["special_subscription", "access_feature_x"],
                        "0x561Ddf540e27632D80dDE806EAa76AC42A0e15F5":
                            ["special_subscription", "access_feature_y"],
                    }
                },
                "rinkby": {}
            },
            "default_network": "mainnet",
            "default_claims": ["wallet_owner"]
        };
        createCustomTokenSpy = sinon.fake.resolves({data: dummyFirebaseToken})
        authStub = sinon.stub(admin, 'auth').get(sinon.fake.returns(sinon.fake.returns({createCustomToken: createCustomTokenSpy})));
        lockContractClientStub = sinon.stub(helpers.LockContractClient.prototype, 'accountHasValidKey')
        getLockConfigStub = sinon.stub(common, 'getUnlockConfig').returns(unlockConfig)
    });
    afterEach(() => {
        authStub.restore();
        lockContractClientStub.restore();
        getLockConfigStub.restore();
        ImportMock.restore();
        testFirebase.cleanup();
    });

    describe('Unit testFirebase getLockFirebaseToken', () => {
        describe('When recovered account does not match', () => {
            beforeEach(() => {
                ImportMock.mockFunction(helpers, 'verifyMessage', otherAccount);
            })
            it('should not return Firebase token', async () => {
                return result().should.be.rejected
            })
        })
        describe('When signature recovers the account provided', () =>{
            beforeEach(() => {
                ImportMock.mockFunction(helpers, 'verifyMessage', userAccount);
            })
            it('should return Firebase token', async () => {
                return result().should.be.fulfilled.then((value:any) => {
                    value.should.have.property('data')
                    expect(value.data).eq('43242')
                })
            })
            describe('When the user has no locks', () => {
                beforeEach(()=>{
                    lockContractClientStub.returns(false);
                })
                it('should attach only default claims to Firebase token', async () => {
                    return result().should.be.fulfilled.then((value:any) => {
                        createCustomTokenSpy.should.have.been.calledWithMatch(userAccount,
                            sinon.match({"wallet_owner": true}))
                    })
                })
            })
            describe('When the user has only one lock', () => {
                beforeEach(()=>{
                    lockContractClientStub.callsFake((account, key) => {
                            return account === userAccount && key === "0x461Ddf540e27632D80dDE806EAa76AC42A0e15F4"
                        }
                    );
                })
                it('should attach only the default locks and lock-specific claims for that lock', async () => {
                    return result().should.be.fulfilled.then((value:any) => {
                        createCustomTokenSpy.should.have.been.calledWithMatch(userAccount,
                            sinon.match({
                                "wallet_owner": true,
                                "special_subscription": true,
                                "access_feature_x": true,
                            })
                        )
                    })
                })
            })
            describe('When the user has only multiple locks', () => {
                beforeEach(()=>{
                    lockContractClientStub.callsFake((account, key) => {
                            return account === userAccount && (key === "0x461Ddf540e27632D80dDE806EAa76AC42A0e15F4" ||
                                key === "0x561Ddf540e27632D80dDE806EAa76AC42A0e15F5")

                        }
                    );

                })
                it('should attach only the default locks and lock-specific claims for all locks they own', async () => {
                    return result().should.be.fulfilled.then((value:any) => {
                        createCustomTokenSpy.should.have.been.calledWithMatch(userAccount,
                            sinon.match({
                                "wallet_owner": true,
                                "special_subscription": true,
                                "access_feature_x": true,
                                "access_feature_y": true,
                            })
                        )
                    })
                })
            })
        })
    });
})

