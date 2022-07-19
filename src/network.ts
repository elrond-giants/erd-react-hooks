type NetworkConfig = {
    mainnet: { api: string; };
    devnet: { api: string; };
    testnet: { api: string; };
};

export const network: NetworkConfig = {
    mainnet: {api: "https://api.elrond.com"},
    devnet: {api: "https://devnet-api.elrond.com"},
    testnet: {api: "https://testnet-api.elrond.com"}
}