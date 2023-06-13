type NetworkConfig = {
    mainnet: {
        api: string;
        gateway: string;
    };
    devnet: {
        api: string;
        gateway: string;
    };
    testnet: {
        api: string;
        gateway: string;
    };
};

export const network: NetworkConfig = {
    mainnet: {
        api: "https://api.multiversx.com",
        gateway: "https://gateway.multiversx.com"
    },
    devnet: {
        api: "https://devnet-api.multiversx.com",
        gateway: "https://devnet-gateway.multiversx.com"
    },
    testnet: {
        api: "https://testnet-api.multiversx.com",
        gateway: "https://testnet-gateway.multiversx.com"
    }
}