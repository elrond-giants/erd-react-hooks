import {
    AuthProviderType,
    IAuthProvider,
    IWebConnectionOptions,
    NetworkEnv
} from "@elrond-giants/erdjs-auth/dist/types";
import {
    ExtensionProviderFactory,
    LedgerProviderFactory,
    WebProviderFactory,
    WalletConnectProviderFactory,
    WebviewProviderFactory
} from "@elrond-giants/erdjs-auth";
import {IProviderBuilder} from "../types";


export default class ProviderBuilder implements IProviderBuilder {
    private env: NetworkEnv;
    private readonly projectId: string | null
    private webConnectionOptions: IWebConnectionOptions;

    constructor(
        env: NetworkEnv,
        projectId: string | null = null,
        webConnectionOptions: IWebConnectionOptions = {}
    ) {
        this.env = env;
        this.projectId = projectId;
        this.webConnectionOptions = webConnectionOptions;
    }

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
        if (!this.projectId) {throw new Error("Project ID is required for Wallet Connect.");}

        return new WalletConnectProviderFactory(this.env, this.projectId).createProvider();
    }

    protected buildWebwalletProvider() {
        return new WebProviderFactory(this.env)
            .setConnectionOptions(this.webConnectionOptions)
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