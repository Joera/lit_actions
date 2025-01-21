import { LitNodeClient } from '@lit-protocol/lit-node-client';
import { ethers } from 'ethers';
import { AUTH_METHOD_SCOPE, LIT_ABILITY, LIT_CHAINS, LIT_NETWORK } from '@lit-protocol/constants';
import { PKPEthersWallet } from '@lit-protocol/pkp-ethers';
import { LitService } from './lit.service';
import * as dotenv from 'dotenv';
import { litActionCode } from './action_example';
import { LitActionResource } from "@lit-protocol/auth-helpers";

// Load environment variables from .env file
dotenv.config({ path: './src/.env' });

if (!process.env.PRIVATE_KEY) {
  throw new Error('PRIVATE_KEY environment variable is not set');
}

const lit = new LitService(process.env.PRIVATE_KEY);


export const run = async () => {

  await lit.init();

  const resourceAbilitiesForSigning = [
    {
        resource: new LitActionResource("*"),
        ability: LIT_ABILITY.PKPSigning,
        scope: AUTH_METHOD_SCOPE.SignAnything,
    },
];


  const resourceAbilitiesForActions = [
    {
      resource: new LitActionResource("*"),
      ability: LIT_ABILITY.LitActionExecution,
      // scope: AUTH_METHOD_SCOPE.SignAnything
    }
  ];

  // Get session signatures
  await lit.sessionSignature(litActionCode, resourceAbilitiesForActions);
  
  // Execute the Lit Action
  const response = await lit.executeJS(litActionCode);
  console.log("Lit Action Response:", response);

  // 'There was an error getting the signing shares from the nodes. Response from the nodes: {"success":false,"error":{"errorKind":"Validation","errorCode":"NodeSIWECapabilityInvalid","status":400,"message":"Invalid Capability object in SIWE resource ReCap","correlationId":"lit_a15693461a291","details":["validation error: Resource id not found in auth_sig capabilities: validation error: Could not find valid capability.","Resource id not found in auth_sig capabilities"]}}',

  // pkp: {
  //   tokenId: '0xdc0527f7c635c5c8d6db92860cdc2187203ee8b649468e29f2430b74435dd5c1',
  //   publicKey: '0422d11a0030115deb0751894a320305ed3158dd3fca47ca7f67930e0b43e8655addd18cb95490d1c81d6a71bf9f30773f81937751904432a41a82a598ca0972db',
  //   ethAddress: '0x5f6591ef1a137592F8671E471cAFa5d355f080FA'
  // }
  
}
