import { AUTH_METHOD_SCOPE, AUTH_METHOD_TYPE, LIT_NETWORK, LIT_RPC } from "@lit-protocol/constants";
import { LitNodeClient } from "@lit-protocol/lit-node-client";
import { LocalStorage } from "node-localstorage";
import { LIT_ABILITY } from "@lit-protocol/constants";
import {
  LitAccessControlConditionResource,
  LitActionResource,
  createSiweMessage,
  generateAuthSig,
} from "@lit-protocol/auth-helpers";
import { ethers } from "ethers";
import { LitContracts } from "@lit-protocol/contracts-sdk";
import * as siwe from "siwe";

export class LitService {

    client: any
    signer: any
    contract!: any
    authSig!: any
    sessionSigs!: any[]

    constructor(private_key: string) {

        this.signer = new ethers.Wallet(
        private_key,
        new ethers.providers.JsonRpcProvider(LIT_RPC.CHRONICLE_YELLOWSTONE)
        );

        this.client = new LitNodeClient({
        litNetwork: LIT_NETWORK.DatilDev,  // Use the mainnet network
        debug: false,
        storageProvider: {
            provider: new LocalStorage("./lit_storage.db"),
        }
        });

        this.contract = new LitContracts({
        signer: this.signer,
        network: LIT_NETWORK.Datil,
        });
    }

    async init() { 

        await this.client.connect();
        await this.contract.connect();

    }

    async _authSig() {

        // succesfully used with pkp generation

        const address = ethers.utils.getAddress(await this.signer.getAddress());
        const nonce = Math.floor(Date.now() / 1000).toString();

        const domain = 'localhost';
        const origin = 'http://localhost/';
        const statement = 'Sign this message to generate an auth signature for Lit Protocol';

        const expirationTime = new Date(
            Date.now() + 1000 * 60 * 60 * 24 // 1 day
        ).toISOString();

        const issuedAt = new Date().toISOString();

        const siweMessage = new siwe.SiweMessage({
            domain,
            address,
            statement,
            uri: origin,
            version: '1',
            chainId: 1,
            nonce,
            issuedAt,
            expirationTime,
        });

        const messageToSign = siweMessage.prepareMessage();
        const signature = await this.signer.signMessage(messageToSign);
            
        return {
            sig: signature,
            derivedVia: 'web3.eth.personal.sign',
            signedMessage: messageToSign,
            address: address.toLowerCase(),
        };
    }

    async __authSig(resourceAbilityRequests: any[]) {

        const origin = 'http://localhost/';
        const expirationTime = new Date(
            Date.now() + 1000 * 60 * 60 * 24 // 1 day
        ).toISOString();

        const toSign = await createSiweMessage({
            uri: origin,
            expiration: expirationTime,
            resources: resourceAbilityRequests,
            walletAddress: await this.signer.getAddress(),
            nonce: await this.client.getLatestBlockhash(),
            litNodeClient: this.client,
            domain: "localhost",
            version: "1",
            statement: "Sign this message to access Lit Protocol"
        });
      
        return await generateAuthSig({
            signer: this.signer,
            toSign
        });
    }

    async sessionSignature(litActionCode: string, resourceAbilityRequests: any[]) { 
        
        // First, get the IPFS CID for the action code
        const ipfsCid = await this.client.getIpfsCid(litActionCode);
        
        // Update the resource with the IPFS CID
        const updatedRequests = resourceAbilityRequests.map(req => ({
            ...req,
            resource: new LitActionResource(ipfsCid)
        }));

        const authNeededCallback = async (params: any) => {
            return this.__authSig(updatedRequests);
        };

        this.sessionSigs = await this.client.getSessionSigs({
            chain: "ethereum",
            expiration: new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString(), // 24 hours
            resourceAbilityRequests: updatedRequests,
            authNeededCallback,
        });

        return this.sessionSigs;
    }

    async executeJS(litActionCode: string) { 
        // Get IPFS CID for the action code
        const ipfsCid = await this.client.getIpfsCid(litActionCode);

        const response = await this.client.executeJs({
            sessionSigs: this.sessionSigs,
            code: litActionCode,
            ipfsId: ipfsCid,
            authSig: await this.__authSig([{
                resource: new LitActionResource(ipfsCid),
                ability: LIT_ABILITY.LitActionExecution,
                scope: AUTH_METHOD_SCOPE.SignAnything
            }]),
            jsParams: {
                magicNumber: 43,
            }
        });

        return response;
    }

    async mintPKP(authSig: any) {

        const mintInfo = await this.contract.mintWithAuth({
            authMethod: {
                authMethodType: AUTH_METHOD_TYPE.EthWallet,
                accessToken: JSON.stringify(authSig),
            },
            scopes: [AUTH_METHOD_SCOPE.SignAnything],
        });

        console.log(mintInfo.pkp);
        return mintInfo;
    }
    
}
