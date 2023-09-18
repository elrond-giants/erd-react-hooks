import {AuthProviderType, NetworkEnv} from "@elrond-giants/erdjs-auth/dist/types";
import {network} from "./network";
import {network as walletUrls} from "@elrond-giants/erdjs-auth/dist/network";
import {Transaction} from "@multiversx/sdk-core/out";
import {Signature} from "@multiversx/sdk-core/out/signature";
import {NetworkOptions, RequiredNetworkOptions} from "./types";

export const chainIdToEnv = (chainId: string): NetworkEnv => {
    if (chainId === "1") {return "mainnet";}
    if (chainId === "T") {return "testnet";}

    return "devnet";
}

export const envToChainId = (env: NetworkEnv): string => {
    if (env === "mainnet") {return "1";}
    if (env === "testnet") {return "T";}

    return "D";
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

export const guardTransactions = async (
    transactions: Transaction[],
    code: string,
    toolsUrl: string,
): Promise<Transaction[]> => {
    const url = `${toolsUrl}/guardian/sign-multiple-transactions`;
    const body = {
        code,
        transactions: transactions.map(tx => tx.toSendable())
    };
    const response = await fetch(url, {
        method: "POST",
        body: JSON.stringify(body),
    });
    const result = await response.json();
    const signatures = result.data.transactions.map(
        (t: { guardianSignature: string }) => t.guardianSignature
    );

    return transactions.map((tx, i) => {
        tx.applyGuardianSignature(new Signature(signatures[i]));

        return tx;
    });

}

export const requiresGuardianSignature = (tx: Transaction) => {
    return tx.getOptions().isWithGuardian()
        && tx.getGuardian().bech32().length > 0
        && tx.getGuardianSignature().length === 0;
};

export const shouldApplyGuardianSignature = (providerType: AuthProviderType) => {
    // Some providers will sign the transaction with the guardian signature
    // automatically, so we don't need to do it.
    // For the ones listed below, we need to apply the guardian signature.

    return [
        AuthProviderType.LEDGER,
        AuthProviderType.PEM,
        AuthProviderType.WALLET_CONNECT,
    ].includes(providerType);
};

export const getNetworkEnv = (config: NetworkEnv | NetworkOptions): NetworkEnv => {
    if (typeof config === "string") {
        return config;
    }

    return chainIdToEnv(config.chainId);
}

export const computeNetworkConfig = (config: NetworkEnv | NetworkOptions): RequiredNetworkOptions => {
    if (typeof config === "string") {
        const networkUrls = network[config];

        return {
            chainId: envToChainId(config),
            apiUrl: networkUrls.api,
            gatewayUrl: networkUrls.gateway,
            toolsUrl: networkUrls.tools,
            walletUrl: walletUrls[config].walletAddress
        }
    }

    const env = chainIdToEnv(config.chainId);
    const defaultNetworkUrls = network[env];

    return {
        apiUrl: defaultNetworkUrls.api,
        gatewayUrl: defaultNetworkUrls.gateway,
        toolsUrl: defaultNetworkUrls.tools,
        walletUrl: walletUrls[env].walletAddress,
        ...config
    }

}
