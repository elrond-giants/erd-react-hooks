type NetworkConfig = {
    mainnet: { api: string; };
    devnet: { api: string; };
    testnet: { api: string; };
};

export const network: NetworkConfig = {
    mainnet: {api: "https://api.multiversx.com"},
    devnet: {api: "https://devnet-api.multiversx.com"},
    testnet: {api: "https://testnet-api.multiversx.com"}
}