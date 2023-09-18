import {
    AuthProviderType,
    IAuthProvider,
    IWebConnectionOptions,
} from "@elrond-giants/erdjs-auth/dist/types";
import {
    ExtensionProviderFactory,
    LedgerProviderFactory,
    WebProviderFactory,
    WalletConnectProviderFactory,
    WebviewProviderFactory
} from "@elrond-giants/erdjs-auth";
import {IProviderBuilder, ProviderBuilderOptions} from "../types";


export default class ProviderBuilder implements IProviderBuilder {

    constructor(protected options: ProviderBuilderOptions) {}

    buildProvider(type: AuthProviderType | string): IAuthProvider {
        let providerName = type.toLowerCase()
            .split("_")
            .map(s => s.charAt(0).toUpperCase() + s.slice(1))
            .join("");

        const method = `build${providerName}Provider`;

        // @ts-ignore
        if (typeof this[method] === "function") {
            // @ts-ignore
            return this[method]();
        }

        throw new Error(`There is no auth provider called ${providerName}`);

    }

    protected buildWalletConnectProvider() {
        if (!this.options.projectId) {throw new Error("Project ID is required for Wallet Connect.");}

        return new WalletConnectProviderFactory({
            chainId: this.options.chainId,
            projectId: this.options.projectId,
        }).createProvider();
    }

    protected buildWebwalletProvider() {
        return new WebProviderFactory({
            chainId: this.options.chainId,
            networkOptions: this.options.webConnectionOptions,
            walletAddress: this.options.walletAddress,
        })
            .createProvider();
    }

    protected buildExtensionProvider() {
        return new ExtensionProviderFactory().createProvider();
    }

    protected buildLedgerProvider() {
        return new LedgerProviderFactory().createProvider();
    }

    protected buildMaiarProvider() {
        return this.buildWalletConnectProvider();
    }

    protected buildWebviewProvider() {
        return new WebviewProviderFactory().createProvider();
    }
};