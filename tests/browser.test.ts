import {should as initChaiShould, use as chaiUse} from 'chai';
import * as sinon from "sinon";
import chaiAsPromised = require('chai-as-promised');
import sinonChai = require('sinon-chai');
initChaiShould()
import { signInWithWeb3 } from '../src/browser'
chaiUse(chaiAsPromised);
chaiUse(sinonChai);

describe('Test Signing in with Web3', () => {
    let windowDummy:any, appDummy:any;
    let signInWithCustomTokenSpy:sinon.SinonSpy;
    let fakeCloudFunction:any
    beforeEach(() => {
        windowDummy = {
            ethereum: {
                enable:sinon.fake.resolves(null),
                request: sinon.stub().returns('dummySignature'),
                selectedAddress: 'dummyAddress'
            }
        }
        global.window = windowDummy
        signInWithCustomTokenSpy = sinon.spy()
        fakeCloudFunction = sinon.fake.resolves({data:'dummyAuthToken'});
        appDummy = {
            installations: sinon.fake.returns({getToken: sinon.fake.resolves('dummyinstallationtoken')}),
            functions: sinon.fake.returns({httpsCallable:
                    sinon.fake.returns(fakeCloudFunction)}),
            auth: sinon.fake.returns({signInWithCustomToken: signInWithCustomTokenSpy}),
        };
    })

    describe('Unit testFirebase getLockFirebaseToken', () => {
        describe('When the browser is not ethereum enabled', () => {
            it('should throw error', async () => {
                delete windowDummy.ethereum
                const result = signInWithWeb3(appDummy)
                return result.should.be.rejected
            })
        })
        describe('When the browser is ethereum enabled', () => {
            describe('When account is already selected', () => {
                it('should signIn to selected account', async () => {
                    const result = signInWithWeb3(appDummy)
                    return result.should.be.fulfilled.then((value:any) => {
                        fakeCloudFunction.should.have.been.calledWith({
                                account: 'dummyAddress',
                                signature: 'dummySignature'})
                        signInWithCustomTokenSpy.should.have.been.calledWith('dummyAuthToken')
                    })
                })
            })
            describe('When no account selected', () => {
                beforeEach(() =>{
                    delete windowDummy.ethereum.selectedAddress
                })
                describe('When enable fails', () => {
                    it('should throw an error', async () => {
                        const result = signInWithWeb3(appDummy)
                        return result.should.be.rejected.then((value:any) => {
                            windowDummy.ethereum.enable.should.have.been.called
                        })
                    })
                })
                describe('When enable succeeds', () => {
                    it('should signIn should proceed', async () => {
                        windowDummy.ethereum.enable = sinon.fake(() => {
                            windowDummy.ethereum.selectedAddress = 'dummyAddress'
                        })
                        const result = signInWithWeb3(appDummy)
                        return result.should.be.fulfilled.then((value:any) => {
                            windowDummy.ethereum.enable.should.have.been.called
                            signInWithCustomTokenSpy.should.have.been.called
                        })
                    })
                })
            })
        })

    });
})

