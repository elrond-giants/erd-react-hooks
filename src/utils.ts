import {NetworkEnv} from "@elrond-giants/erdjs-auth/dist/types";
import {network} from "./network";

export const chainIdToEnv = (chainId: string): NetworkEnv => {
    if (chainId === "1") {return "mainnet";}
    if (chainId === "T") {return "testnet";}

    return "devnet";
}

export const fetchGuardianData = async (address: string, chainId: string) => {
    const env = chainIdToEnv(chainId);
    const gatewayUrl = network[env].gateway;
    try {
        const response = await fetch(`${gatewayUrl}/address/${address}/guardian-data`);

        return await response.json();
    } catch (e) {
        return null;
    }
}

