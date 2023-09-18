type NetworkOptions = {
    api: string;
    gateway: string;
    tools: string;
};
type NetworkConfig = {
    mainnet: NetworkOptions;
    devnet: NetworkOptions;
    testnet: NetworkOptions;
};

export const network: NetworkConfig = {
    mainnet: {
        api: "https://api.multiversx.com",
        gateway: "https://gateway.multiversx.com",
        tools: "https://mainnet-tools.multiversx.com"
    },
    devnet: {
        api: "https://devnet2-api.multiversx.com",
        gateway: "https://devnet2-gateway.multiversx.com",
        tools: "https://devnet-tools.multiversx.com"
    },
    testnet: {
        api: "https://testnet-api.multiversx.com",
        gateway: "https://testnet-gateway.multiversx.com",
        tools: "https://testnet-tools.multiversx.com"
    }
};

export const GUARDIAN_SERVICE_INVISIBLE = "INVISIBLE_GUARDIAN";